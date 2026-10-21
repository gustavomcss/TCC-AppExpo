import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { login } from "./helpers/client.js";
import { complaintForm, createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the baseline API rules (I-05): who lists, views, creates and deletes in each
 * collection. Rules specific to a feature (routes I-18, service records I-19, complaints I-27,
 * edits I-31, users I-11) have their own issues and tests. Enum values (motorista, aberta...)
 * are data of the model, so they stay in Portuguese.
 */

/** Collections whose records belong to one driver: the author, or for complaints, the author of the route. */
const SCOPED = ["routes", "complaints", "fuels", "oils", "repairs"];

/** Collections with an author in the `user` field, which the server sets on creation. */
const AUTHORED = ["routes", "fuels", "oils", "repairs"];

/** Valid creation payloads of the authored collections, for a given vehicle. */
const PAYLOADS = {
    routes: (vehicle) => ({ vehicle: vehicle.id, status: "aberta", itinerary: "Downtown", km_departure: 1000 }),
    fuels: (vehicle) => ({ vehicle: vehicle.id, km_fuel: 1010, type: "etanol", liters: 30.5, cost: 180.9 }),
    oils: (vehicle) => ({ vehicle: vehicle.id, km_oil: 1010, type: "5W30 synthetic", cost: 250 }),
    repairs: (vehicle) => ({ vehicle: vehicle.id, km_repair: 1010, description: "Brakes", cost: 400 }),
};

/* State shared by the file: one disposable instance, three logged-in users and their records. */
let pb;
let admin;
let make;
let driverA;
let driverB;
let supervisor;
let asA;
let asB;
let asSupervisor;
let vehicleA;
let vehicleB;

/** Records of each scoped collection: `a` belongs to driver A and `b` to driver B. */
const owned = {};

/** Ids of the records in a list response. */
const ids = (response) => response.body.items.map((item) => item.id);

/** Total number of records of a collection, read as superuser. */
const count = async (collection) => (await admin.get(`/api/collections/${collection}/records?perPage=1`)).body.totalItems;

/* Starts the instance, creates the users, a vehicle each and one record of every scoped collection per driver. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    make = createFactories(admin);

    driverA = await make.user();
    driverB = await make.user();
    supervisor = await make.user({ role: "supervisor" });
    asA = await login(pb.url, "users", driverA.email, driverA.password);
    asB = await login(pb.url, "users", driverB.email, driverB.password);
    asSupervisor = await login(pb.url, "users", supervisor.email, supervisor.password);

    vehicleA = await make.vehicle();
    vehicleB = await make.vehicle();

    const routeA = await make.route({ user: driverA, vehicle: vehicleA });
    const routeB = await make.route({ user: driverB, vehicle: vehicleB });
    owned.routes = { a: routeA, b: routeB };
    owned.complaints = {
        a: await make.complaint({ route_current: routeA.id }),
        b: await make.complaint({ route_current: routeB.id }),
    };
    for (const [collection, factory] of [["fuels", make.fuel], ["oils", make.oil], ["repairs", make.repair]]) {
        owned[collection] = {
            a: await factory({ user: driverA, vehicle: vehicleA }),
            b: await factory({ user: driverB, vehicle: vehicleB }),
        };
    }
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

describe("a driver sees only their own records, a supervisor sees everyone's (RF17)", () => {
    for (const collection of SCOPED) {
        test(`${collection}: the driver lists and views only their own`, async () => {
            const { a, b } = owned[collection];

            const list = await asA.get(`/api/collections/${collection}/records?perPage=200`);
            assert.equal(list.status, 200);
            assert.ok(ids(list).includes(a.id), "own record is missing");
            assert.ok(!ids(list).includes(b.id), "another driver's record leaked into the list");

            assert.equal((await asA.get(`/api/collections/${collection}/records/${a.id}`)).status, 200);
            assert.equal((await asA.get(`/api/collections/${collection}/records/${b.id}`)).status, 404);
        });

        test(`${collection}: the supervisor lists and views everyone's`, async () => {
            const { a, b } = owned[collection];

            const list = await asSupervisor.get(`/api/collections/${collection}/records?perPage=200`);
            assert.equal(list.status, 200);
            assert.ok(ids(list).includes(a.id) && ids(list).includes(b.id));

            for (const record of [a, b]) {
                assert.equal((await asSupervisor.get(`/api/collections/${collection}/records/${record.id}`)).status, 200);
            }
        });
    }

    test("users: the driver sees only themself, the supervisor sees all", async () => {
        const list = await asA.get("/api/collections/users/records?perPage=200");
        assert.equal(list.status, 200);
        assert.deepEqual(ids(list), [driverA.id]);
        assert.equal((await asA.get(`/api/collections/users/records/${driverB.id}`)).status, 404);

        const all = await asSupervisor.get("/api/collections/users/records?perPage=200");
        assert.deepEqual(ids(all).sort(), [driverA.id, driverB.id, supervisor.id].sort());
        assert.equal((await asSupervisor.get(`/api/collections/users/records/${driverB.id}`)).status, 200);
    });

    test("vehicles: every signed-in user lists and views them, including inactive ones", async () => {
        const inactive = await make.vehicle({ active: false });
        for (const client of [asA, asB, asSupervisor]) {
            const list = await client.get("/api/collections/vehicles/records?perPage=200");
            assert.equal(list.status, 200);
            for (const vehicle of [vehicleA, vehicleB, inactive]) {
                assert.ok(ids(list).includes(vehicle.id));
                assert.equal((await client.get(`/api/collections/vehicles/records/${vehicle.id}`)).status, 200);
            }
        }
    });
});

describe("the app deletes no route, complaint, fuel, oil or repair record (RB17)", () => {
    for (const collection of SCOPED) {
        test(`${collection}: neither the author nor the supervisor deletes`, async () => {
            const { a } = owned[collection];
            for (const client of [asA, asSupervisor, pb.anonymous]) {
                const response = await client.delete(`/api/collections/${collection}/records/${a.id}`);
                assert.equal(response.status, 403);
            }
            assert.equal((await admin.get(`/api/collections/${collection}/records/${a.id}`)).status, 200);
        });
    }
});

describe("vehicle management belongs to the supervisor", () => {
    test("the supervisor registers a vehicle with its initial odometer (RB03)", async () => {
        const response = await asSupervisor.post("/api/collections/vehicles/records", {
            plate: "NEW-0001",
            type: "van",
            model: "Sprinter",
            odometer: 500,
            active: true,
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.odometer, 500);
    });

    test("a driver cannot register, edit or delete a vehicle", async () => {
        const total = await count("vehicles");
        const create = await asA.post("/api/collections/vehicles/records", { plate: "DRV-0001", type: "carro", model: "Gol", odometer: 1 });
        assert.ok([400, 403].includes(create.status), `create status ${create.status}`);
        assert.equal(await count("vehicles"), total);

        const edit = await asA.patch(`/api/collections/vehicles/records/${vehicleA.id}`, { model: "Hacked" });
        assert.ok([403, 404].includes(edit.status), `edit status ${edit.status}`);
        assert.equal((await admin.get(`/api/collections/vehicles/records/${vehicleA.id}`)).body.model, vehicleA.model);

        const remove = await asA.delete(`/api/collections/vehicles/records/${vehicleA.id}`);
        assert.ok([403, 404].includes(remove.status), `delete status ${remove.status}`);
        assert.equal(await count("vehicles"), total);
    });

    test("the supervisor edits the vehicle data and deletes one without records", async () => {
        const vehicle = await make.vehicle();
        const edit = await asSupervisor.patch(`/api/collections/vehicles/records/${vehicle.id}`, { model: "Updated", active: false });
        assert.equal(edit.status, 200);
        assert.equal(edit.body.model, "Updated");

        assert.equal((await asSupervisor.delete(`/api/collections/vehicles/records/${vehicle.id}`)).status, 204);
    });

    test("a vehicle with linked records is not deleted, even by the supervisor (RB12)", async () => {
        const response = await asSupervisor.delete(`/api/collections/vehicles/records/${vehicleA.id}`);
        assert.equal(response.status, 400);
        assert.equal((await admin.get(`/api/collections/vehicles/records/${vehicleA.id}`)).status, 200);
    });
});

describe("the current km of a vehicle is not changed by a request from the app (RB09)", () => {
    test("the supervisor cannot change the odometer", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const response = await asSupervisor.patch(`/api/collections/vehicles/records/${vehicle.id}`, { odometer: 9999 });
        assert.ok([400, 403, 404].includes(response.status), `status ${response.status}`);
        assert.equal((await admin.get(`/api/collections/vehicles/records/${vehicle.id}`)).body.odometer, 1000);
    });

    test("a driver cannot change the odometer", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const response = await asA.patch(`/api/collections/vehicles/records/${vehicle.id}`, { odometer: 9999 });
        assert.ok([400, 403, 404].includes(response.status), `status ${response.status}`);
        assert.equal((await admin.get(`/api/collections/vehicles/records/${vehicle.id}`)).body.odometer, 1000);
    });

    test("sending the odometer unchanged along with other fields is accepted", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const response = await asSupervisor.patch(`/api/collections/vehicles/records/${vehicle.id}`, { odometer: 1000, model: "Same km" });
        assert.equal(response.status, 200);
        assert.equal(response.body.model, "Same km");
    });
});

describe("the author is set by the server from the signed-in user, not by the body", () => {
    for (const collection of AUTHORED) {
        test(`${collection}: the author is the signed-in user even if the body names another`, async () => {
            const response = await asA.post(`/api/collections/${collection}/records`, { ...PAYLOADS[collection](vehicleA), user: driverB.id });
            assert.equal(response.status, 200);
            assert.equal(response.body.user, driverA.id);
            assert.equal((await admin.get(`/api/collections/${collection}/records/${response.body.id}`)).body.user, driverA.id);
        });

        test(`${collection}: the author is filled in when the body omits it`, async () => {
            const response = await asB.post(`/api/collections/${collection}/records`, PAYLOADS[collection](vehicleB));
            assert.equal(response.status, 200);
            assert.equal(response.body.user, driverB.id);
        });

        test(`${collection}: a supervisor is also the author of what they create`, async () => {
            const response = await asSupervisor.post(`/api/collections/${collection}/records`, { ...PAYLOADS[collection](vehicleA), user: driverA.id });
            assert.equal(response.status, 200);
            assert.equal(response.body.user, supervisor.id);
        });
    }

    test("complaints: only the author of the route files a complaint on it", async () => {
        const route = await make.route({ user: driverA, vehicle: await make.vehicle() });

        const foreign = await asB.post("/api/collections/complaints/records", complaintForm({ route_current: route.id }));
        assert.ok([400, 403].includes(foreign.status), `status ${foreign.status}`);
        assert.equal((await admin.get(`/api/collections/complaints/records?filter=route_current='${route.id}'`)).body.totalItems, 0);

        const own = await asA.post("/api/collections/complaints/records", complaintForm({ route_current: route.id }));
        assert.equal(own.status, 200);
    });
});

describe("requests without authentication are rejected on every collection", () => {
    /** Creation bodies for each collection; complaints go as multipart because of the photo. */
    const CREATE = {
        users: () => ({ email: "anon@test.local", password: "senha12345", passwordConfirm: "senha12345", name: "Anon", role: "motorista", active: true }),
        vehicles: () => ({ plate: "ANO-0001", type: "carro", model: "Gol", odometer: 1 }),
        routes: () => ({ user: driverA.id, ...PAYLOADS.routes(vehicleA) }),
        complaints: () => complaintForm({ route_current: owned.routes.a.id }),
        fuels: () => ({ user: driverA.id, ...PAYLOADS.fuels(vehicleA) }),
        oils: () => ({ user: driverA.id, ...PAYLOADS.oils(vehicleA) }),
        repairs: () => ({ user: driverA.id, ...PAYLOADS.repairs(vehicleA) }),
    };

    for (const [collection, body] of Object.entries(CREATE)) {
        test(`${collection}: no listing, viewing, creating, editing or deleting`, async () => {
            const anonymous = pb.anonymous;
            const existing = (await admin.get(`/api/collections/${collection}/records?perPage=1`)).body.items[0];
            const total = await count(collection);

            const list = await anonymous.get(`/api/collections/${collection}/records`);
            assert.ok([200, 403].includes(list.status), `list status ${list.status}`);
            assert.equal(list.status === 200 ? list.body.items.length : 0, 0, "records leaked to an anonymous list");

            const view = await anonymous.get(`/api/collections/${collection}/records/${existing.id}`);
            assert.ok([403, 404].includes(view.status), `view status ${view.status}`);

            const create = await anonymous.post(`/api/collections/${collection}/records`, body());
            assert.ok([400, 403].includes(create.status), `create status ${create.status}`);

            const edit = await anonymous.patch(`/api/collections/${collection}/records/${existing.id}`, { created: "2000-01-01 00:00:00.000Z" });
            assert.ok([403, 404].includes(edit.status), `edit status ${edit.status}`);

            const remove = await anonymous.delete(`/api/collections/${collection}/records/${existing.id}`);
            assert.ok([403, 404].includes(remove.status), `delete status ${remove.status}`);

            assert.equal(await count(collection), total);
        });
    }
});
