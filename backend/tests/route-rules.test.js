import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { login } from "./helpers/client.js";
import { createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the integrity rules of routes (I-18, RB01, RB02, RB03, RB13, RB15, RB16, RB17).
 * Every case sends plain requests, without the app, to prove the server holds the rule alone. A
 * refusal is checked by status and, when the app translates it, by `code` (src/services/serverErrors.ts).
 */

const PATH = "/api/collections/routes/records";

/* State shared by the file: one disposable instance, a supervisor session and factories. */
let pb;
let admin;
let make;
let asSupervisor;
let supervisor;

/** Starts the instance and signs in a supervisor. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    make = createFactories(admin);

    supervisor = await make.user({ role: "supervisor" });
    asSupervisor = await signIn(supervisor);
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

/** Signs in a user created by the factory. */
const signIn = (user) => login(pb.url, "users", user.email, user.password);

/** A driver, their session and a vehicle, ready to start a route. */
async function driverWithVehicle() {
    const user = await make.user();
    return { user, session: await signIn(user), vehicle: await make.vehicle({ odometer: 1000 }) };
}

/** The body the app sends to start a route (the author is set by the server). */
const departure = (vehicle, overrides = {}) => ({ vehicle: vehicle.id, itinerary: "Downtown", km_departure: 1000, status: "aberta", ...overrides });

/** Starts a route as the driver and returns the record, failing if the server refuses. */
async function start(session, vehicle, overrides) {
    const response = await session.post(PATH, departure(vehicle, overrides));
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body;
}

/** Reads a route as superuser. */
const readRoute = async (route) => (await admin.get(`${PATH}/${route.id}`)).body;

/** Reads a vehicle as superuser. */
const readVehicle = async (vehicle) => (await admin.get(`/api/collections/vehicles/records/${vehicle.id}`)).body;

/** Sends the finalization the app sends. */
const finalize = (session, route, fields = {}) => session.patch(`${PATH}/${route.id}`, { status: "finalizada", km_return: 1100, ...fields });

describe("a route is created open (RF08)", () => {
    test("the driver starts a route on an available vehicle (RB01, RB02)", async () => {
        const { user, session, vehicle } = await driverWithVehicle();
        const response = await session.post(PATH, departure(vehicle));

        assert.equal(response.status, 200);
        assert.equal(response.body.status, "aberta");
        assert.equal(response.body.user, user.id);
        assert.equal(response.body.km_departure, 1000);
    });

    test("a vehicle with an open route refuses another one, from another driver (RB01)", async () => {
        const first = await driverWithVehicle();
        const second = await driverWithVehicle();
        await start(first.session, first.vehicle);

        const response = await second.session.post(PATH, departure(first.vehicle));

        assert.equal(response.status, 400);
        assert.equal(response.body.data.vehicle.code, "vehicle_in_open_route");
    });

    test("a driver with an open route cannot start another one, on another vehicle (RB02)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const other = await make.vehicle();
        await start(session, vehicle);

        const response = await session.post(PATH, departure(other));

        assert.equal(response.status, 400);
        assert.equal(response.body.data.user.code, "user_in_open_route");
    });

    test("the driver counted is the signed-in one, not the `user` in the body (RB02)", async () => {
        const busy = await driverWithVehicle();
        const free = await driverWithVehicle();
        await start(busy.session, busy.vehicle);

        const response = await free.session.post(PATH, departure(free.vehicle, { user: busy.user.id }));

        assert.equal(response.status, 200);
        assert.equal(response.body.user, free.user.id);
    });

    test("a finalized or closed route does not block a new one (RB01, RB02, RB15)", async () => {
        for (const status of ["finalizada", "encerrada"]) {
            const { user, session, vehicle } = await driverWithVehicle();
            await make.route({ user, vehicle, status, km_departure: 1000, km_return: status === "finalizada" ? 1100 : 0 });

            const response = await session.post(PATH, departure(vehicle));
            assert.equal(response.status, 200, status);
        }
    });

    test("the database holds the rule too: one unique index per vehicle and per driver, for open routes only (RB01, RB02)", async () => {
        const { indexes } = (await admin.get("/api/collections/routes")).body;

        for (const field of ["vehicle", "user"]) {
            const index = indexes.find((sql) => sql.includes(`idx_routes_open_${field}`));
            assert.ok(index, `index of ${field}`);
            assert.match(index, /UNIQUE/);
            assert.match(index, /WHERE `status` = 'aberta'/);
        }
    });

    test("two requests racing for the same vehicle or driver leave only one open route (RB01, RB02)", async () => {
        const [a, b] = [await driverWithVehicle(), await driverWithVehicle()];
        const byVehicle = await Promise.all([a.session.post(PATH, departure(a.vehicle)), b.session.post(PATH, departure(a.vehicle))]);
        assert.deepEqual(byVehicle.map((r) => r.status).sort(), [200, 400]);

        const [c, d] = [await driverWithVehicle(), await make.vehicle()];
        const byDriver = await Promise.all([c.session.post(PATH, departure(c.vehicle)), c.session.post(PATH, departure(d))]);
        assert.deepEqual(byDriver.map((r) => r.status).sort(), [200, 400]);
    });

    test("an inactive vehicle cannot start a route (RB12)", async () => {
        const { session } = await driverWithVehicle();
        const inactive = await make.vehicle({ active: false });

        const response = await session.post(PATH, departure(inactive));

        assert.equal(response.status, 400);
        assert.equal(response.body.data.vehicle.code, "vehicle_inactive");
    });

    test("a route is only created open, and without return data (RB17)", async () => {
        const { session, vehicle } = await driverWithVehicle();

        for (const extra of [{ status: "finalizada" }, { status: "encerrada" }, { km_return: 1100 }, { obs_return: "done" }, { date_return: "2026-01-01 10:00:00.000Z" }]) {
            const response = await session.post(PATH, departure(vehicle, extra));
            assert.equal(response.status, 400, JSON.stringify(extra));
        }
        assert.equal((await session.post(PATH, { vehicle: vehicle.id, itinerary: "Downtown", km_departure: 1000 })).status, 400);
    });

    test("the departure km is required, may be 0, and keeps two decimals (RB03, RB16)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const { km_departure, ...withoutKm } = departure(vehicle);

        const missing = await session.post(PATH, withoutKm);
        assert.equal(missing.status, 400);
        assert.equal(missing.body.data.km_departure.code, "validation_required");

        const text = await session.post(PATH, departure(vehicle, { km_departure: "abc" }));
        assert.equal(text.status, 400);
        assert.ok(text.body.data.km_departure);

        const decimals = await session.post(PATH, departure(vehicle, { km_departure: 10.555 }));
        assert.equal(decimals.status, 400);
        assert.equal(decimals.body.data.km_departure.code, "validation_too_many_decimals");

        const negative = await session.post(PATH, departure(vehicle, { km_departure: -1 }));
        assert.equal(negative.status, 400);

        const zero = await session.post(PATH, departure(vehicle, { km_departure: 0 }));
        assert.equal(zero.status, 200);
        assert.equal(zero.body.km_departure, 0);
    });
});

describe("the author finalizes the route once (RF09, RB03, RB13, RB17)", () => {
    test("finalizing sets the status, the return km and, by the server, the return date", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);

        const before = Date.now();
        const response = await finalize(session, route, { obs_return: "All good" });

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal(response.body.status, "finalizada");
        assert.equal(response.body.km_return, 1100);
        assert.equal(response.body.obs_return, "All good");
        assert.ok(Math.abs(new Date(response.body.date_return).getTime() - before) < 60000, response.body.date_return);
    });

    test("the current km of the vehicle becomes the return km, written by the server (RB03, RB09)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);
        assert.equal((await readVehicle(vehicle)).odometer, 1000);

        await finalize(session, route, { km_return: 1234.5 });

        assert.equal((await readVehicle(vehicle)).odometer, 1234.5);
    });

    test("a return km that is not greater than the departure km is refused, and nothing changes (RB13)", async () => {
        for (const kmReturn of [1000, 999.99, 0]) {
            const { session, vehicle } = await driverWithVehicle();
            const route = await start(session, vehicle);

            const response = await finalize(session, route, { km_return: kmReturn });

            assert.equal(response.status, 400, String(kmReturn));
            assert.equal(response.body.data.km_return.code, "km_return_not_greater");
            assert.equal((await readRoute(route)).status, "aberta");
            assert.equal((await readVehicle(vehicle)).odometer, 1000);
        }
    });

    test("finalizing without a return km is refused (RB13)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);

        const response = await session.patch(`${PATH}/${route.id}`, { status: "finalizada" });

        assert.equal(response.status, 400);
        assert.equal(response.body.data.km_return.code, "km_return_not_greater");
        assert.equal((await readRoute(route)).status, "aberta");
    });

    test("the return km keeps two decimals and the range of the field (RB16)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);

        const decimals = await finalize(session, route, { km_return: 1100.555 });
        assert.equal(decimals.status, 400);
        assert.equal(decimals.body.data.km_return.code, "validation_too_many_decimals");

        const above = await finalize(session, route, { km_return: 1000000 });
        assert.equal(above.status, 400);
        assert.ok(above.body.data.km_return);

        assert.equal((await readRoute(route)).status, "aberta");
        assert.equal((await readVehicle(vehicle)).odometer, 1000);
    });

    test("the return date cannot be sent, the server sets it (RNF05)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);

        const response = await finalize(session, route, { date_return: "2020-01-01 10:00:00.000Z" });

        assert.notEqual(response.status, 200);
        assert.equal((await readRoute(route)).status, "aberta");
    });

    test("only the author finalizes: another driver and a supervisor cannot (RB17)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);
        const stranger = await signIn(await make.user());

        assert.notEqual((await finalize(stranger, route)).status, 200);
        assert.notEqual((await finalize(asSupervisor, route)).status, 200);
        assert.equal((await readRoute(route)).status, "aberta");
        assert.equal((await readVehicle(vehicle)).odometer, 1000);
    });

    test("a supervisor finalizes a route of their own like any author", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const route = await start(asSupervisor, vehicle);

        assert.equal((await finalize(asSupervisor, route)).status, 200);
        assert.equal((await readVehicle(vehicle)).odometer, 1100);
    });

    test("it happens once: a finalized route is not editable, not even by its author (RB17)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);
        await finalize(session, route);

        for (const [who, body] of [
            [session, { status: "finalizada", km_return: 1200 }],
            [session, { obs_return: "Changed" }],
            [session, { status: "aberta" }],
            [session, { status: "encerrada" }],
            [asSupervisor, { status: "encerrada" }],
            [asSupervisor, { km_return: 1200 }],
        ]) {
            const response = await who.patch(`${PATH}/${route.id}`, body);
            assert.notEqual(response.status, 200, JSON.stringify(body));
        }

        const stored = await readRoute(route);
        assert.equal(stored.status, "finalizada");
        assert.equal(stored.km_return, 1100);
        assert.equal((await readVehicle(vehicle)).odometer, 1100);
    });

    test("the other fields of the route stay fixed while it is open (RB17)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);
        const other = await make.vehicle();
        const stranger = await make.user();

        for (const body of [
            { itinerary: "Elsewhere" },
            { km_departure: 500 },
            { obs_departure: "Changed" },
            { vehicle: other.id },
            { user: stranger.id },
        ]) {
            const response = await session.patch(`${PATH}/${route.id}`, { status: "finalizada", km_return: 1100, ...body });
            assert.notEqual(response.status, 200, JSON.stringify(body));
        }

        const stored = await readRoute(route);
        assert.equal(stored.status, "aberta");
        assert.equal(stored.itinerary, "Downtown");
        assert.equal(stored.km_departure, 1000);
        assert.equal(stored.vehicle, vehicle.id);
    });

    test("the departure date is the server's: a value sent on update or create is ignored (RNF05)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle, { date_departure: "2020-01-01 10:00:00.000Z" });
        assert.ok(new Date(route.date_departure).getFullYear() >= 2026, route.date_departure);

        await finalize(session, route, { date_departure: "2020-01-01 10:00:00.000Z" });

        assert.equal((await readRoute(route)).date_departure, route.date_departure);
    });

    test("an update that leaves the status out is refused", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);

        assert.notEqual((await session.patch(`${PATH}/${route.id}`, { km_return: 1100 })).status, 200);
        assert.equal((await readRoute(route)).km_return, 0);
    });

    test("a route is never deleted by a request (RB17)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);

        assert.notEqual((await session.delete(`${PATH}/${route.id}`)).status, 204);
        assert.notEqual((await asSupervisor.delete(`${PATH}/${route.id}`)).status, 204);
        assert.equal((await admin.get(`${PATH}/${route.id}`)).status, 200);
    });
});

describe("the supervisor closes a route administratively (RF10, RB15)", () => {
    test("the route becomes encerrada, with no return km and the current km untouched", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);

        const response = await asSupervisor.patch(`${PATH}/${route.id}`, { status: "encerrada" });

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal(response.body.status, "encerrada");
        assert.equal(response.body.km_return, 0);
        assert.equal(response.body.date_return, "");
        assert.equal((await readVehicle(vehicle)).odometer, 1000);
    });

    test("it asks for no km, and refuses a return km or note in the request", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);

        assert.notEqual((await asSupervisor.patch(`${PATH}/${route.id}`, { status: "encerrada", km_return: 1100 })).status, 200);
        assert.notEqual((await asSupervisor.patch(`${PATH}/${route.id}`, { status: "encerrada", obs_return: "Closed" })).status, 200);
        assert.equal((await readRoute(route)).status, "aberta");
    });

    test("a driver cannot close a route, not even their own", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);
        const stranger = await signIn(await make.user());

        assert.notEqual((await session.patch(`${PATH}/${route.id}`, { status: "encerrada" })).status, 200);
        assert.notEqual((await stranger.patch(`${PATH}/${route.id}`, { status: "encerrada" })).status, 200);
        assert.equal((await readRoute(route)).status, "aberta");
    });

    test("only an open route is closed, and a closed one is not editable (RB17)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);
        await asSupervisor.patch(`${PATH}/${route.id}`, { status: "encerrada" });

        for (const body of [{ status: "encerrada" }, { status: "aberta" }, { status: "finalizada", km_return: 1100 }, { itinerary: "Changed" }]) {
            assert.notEqual((await asSupervisor.patch(`${PATH}/${route.id}`, body)).status, 200, JSON.stringify(body));
            assert.notEqual((await session.patch(`${PATH}/${route.id}`, body)).status, 200, JSON.stringify(body));
        }
        assert.equal((await readRoute(route)).status, "encerrada");
    });

    test("closing frees the vehicle and the driver (RB01, RB02, RB15)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);
        assert.equal((await session.post(PATH, departure(vehicle))).status, 400);

        await asSupervisor.patch(`${PATH}/${route.id}`, { status: "encerrada" });

        assert.equal((await session.post(PATH, departure(vehicle))).status, 200);
    });

    test("the superuser can still close a route from the panel", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);

        assert.equal((await admin.patch(`${PATH}/${route.id}`, { status: "encerrada" })).status, 200);
        assert.equal((await readVehicle(vehicle)).odometer, 1000);
    });
});

describe("the closure module lists open and closed routes, never finalized ones (RF10, RB10)", () => {
    /** The query of the closure list in the app (src/services/routes.ts), as a session reads it. */
    const closureList = (session) =>
        session.get(`${PATH}?perPage=200&sort=-date_departure&expand=user,vehicle&filter=${encodeURIComponent('status != "finalizada"')}`);

    test("the supervisor sees open and encerrada routes of every driver, with driver and vehicle", async () => {
        const open = await driverWithVehicle();
        const openRoute = await start(open.session, open.vehicle);
        const closed = await driverWithVehicle();
        const closedRoute = await start(closed.session, closed.vehicle);
        await asSupervisor.patch(`${PATH}/${closedRoute.id}`, { status: "encerrada" });
        const done = await driverWithVehicle();
        const doneRoute = await start(done.session, done.vehicle);
        assert.equal((await finalize(done.session, doneRoute)).status, 200);

        const response = await closureList(asSupervisor);
        const byId = new Map(response.body.items.map((item) => [item.id, item]));

        assert.equal(response.status, 200);
        assert.equal(byId.get(openRoute.id).status, "aberta");
        assert.equal(byId.get(closedRoute.id).status, "encerrada");
        assert.equal(byId.has(doneRoute.id), false);
        assert.equal(byId.get(openRoute.id).expand.user.name, open.user.name);
        assert.equal(byId.get(openRoute.id).expand.vehicle.plate, open.vehicle.plate);
    });

    test("a driver gets only their own routes from the same query", async () => {
        const mine = await driverWithVehicle();
        const myRoute = await start(mine.session, mine.vehicle);
        const other = await driverWithVehicle();
        const otherRoute = await start(other.session, other.vehicle);

        const ids = (await closureList(mine.session)).body.items.map((item) => item.id);

        assert.ok(ids.includes(myRoute.id));
        assert.equal(ids.includes(otherRoute.id), false);
    });
});

describe("the current km follows only finalized routes (RB03, RB15)", () => {
    test("a closed route in between does not count; the last finalized one sets the km", async () => {
        const { session, vehicle } = await driverWithVehicle();

        const first = await start(session, vehicle);
        await finalize(session, first, { km_return: 1100 });
        assert.equal((await readVehicle(vehicle)).odometer, 1100);

        const closed = await start(session, vehicle, { km_departure: 1100 });
        await asSupervisor.patch(`${PATH}/${closed.id}`, { status: "encerrada" });
        assert.equal((await readVehicle(vehicle)).odometer, 1100);

        const last = await start(session, vehicle, { km_departure: 1100 });
        await finalize(session, last, { km_return: 1300.25 });
        assert.equal((await readVehicle(vehicle)).odometer, 1300.25);
    });

    test("the km of another vehicle is not touched", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const bystander = await make.vehicle({ odometer: 777 });

        await finalize(session, await start(session, vehicle));

        assert.equal((await readVehicle(bystander)).odometer, 777);
    });

    test("if the vehicle cannot be saved, the route is not finalized (one transaction)", async () => {
        const { session, vehicle } = await driverWithVehicle();
        const route = await start(session, vehicle);

        /* A new required field makes every existing vehicle invalid, so saving the odometer fails. */
        const collection = (await admin.get("/api/collections/vehicles")).body;
        const patched = await admin.patch(`/api/collections/${collection.id}`, { fields: [...collection.fields, { type: "text", name: "must_have", required: true }] });
        assert.equal(patched.status, 200);

        const response = await finalize(session, route);

        assert.equal(response.status, 400);
        const stored = await readRoute(route);
        assert.equal(stored.status, "aberta");
        assert.equal(stored.km_return, 0);
        assert.equal(stored.date_return, "");
        assert.equal((await readVehicle(vehicle)).odometer, 1000);
    });
});
