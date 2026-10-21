import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createClient, login } from "./helpers/client.js";
import { complaintForm, createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for blocking inactive users (I-07, RB18): an inactive user cannot sign in, and a
 * session opened before the deactivation loses access to every collection. The tests send plain
 * requests, without the app, to prove that the backend holds the rule by itself.
 */

const AUTH_PATH = "/api/collections/users/auth-with-password";

/** Every collection of the model, which an inactive user must not read or write. */
const COLLECTIONS = ["users", "vehicles", "routes", "complaints", "fuels", "oils", "repairs"];

/* State shared by the file: one disposable instance and a few vehicles and records to look at. */
let pb;
let admin;
let make;
let vehicle;

/** Starts the instance and creates the vehicle the scenarios use. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    make = createFactories(admin);
    vehicle = await make.vehicle();
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

/** Signs a user in and returns a client holding the session token, as the app does. */
const signIn = (user) => login(pb.url, "users", user.email, user.password);

/** Sets the `active` flag of a user as superuser. */
async function setActive(user, active) {
    const response = await admin.patch(`/api/collections/users/records/${user.id}`, { active });
    assert.equal(response.status, 200);
}

/**
 * Creates one record per scoped collection for a user, so that the checks below have something
 * that the user could read if the rule let them.
 */
async function seed(user) {
    const route = await make.route({ user, vehicle, status: "finalizada", km_return: 1100 });
    return {
        route,
        complaint: await make.complaint({ route_current: route.id }),
        fuel: await make.fuel({ user, vehicle }),
        oil: await make.oil({ user, vehicle }),
        repair: await make.repair({ user, vehicle }),
    };
}

describe("an inactive user cannot sign in (RB18)", () => {
    test("a user created as inactive gets 403 with correct credentials, and no token", async () => {
        const user = await make.user({ active: false });
        const response = await pb.anonymous.post(AUTH_PATH, { identity: user.email, password: user.password });
        assert.equal(response.status, 403);
        assert.equal(response.body.token, undefined);
    });

    test("a user deactivated after creation can no longer sign in", async () => {
        const user = await make.user();
        assert.equal((await pb.anonymous.post(AUTH_PATH, { identity: user.email, password: user.password })).status, 200);

        await setActive(user, false);
        const response = await pb.anonymous.post(AUTH_PATH, { identity: user.email, password: user.password });
        assert.equal(response.status, 403);
        assert.equal(response.body.token, undefined);
    });

    test("a supervisor is blocked in the same way", async () => {
        const user = await make.user({ role: "supervisor", active: false });
        const response = await pb.anonymous.post(AUTH_PATH, { identity: user.email, password: user.password });
        assert.equal(response.status, 403);
    });

    test("a wrong password for an inactive user still answers 400, so the block is not visible without the password", async () => {
        const user = await make.user({ active: false });
        const inactive = await pb.anonymous.post(AUTH_PATH, { identity: user.email, password: "wrong-password" });
        const unknown = await pb.anonymous.post(AUTH_PATH, { identity: "nobody@test.local", password: "wrong-password" });
        assert.equal(inactive.status, 400);
        assert.equal(inactive.body.message, unknown.body.message);
    });
});

describe("a session opened before the deactivation loses access (RB18)", () => {
    test("the token no longer renews", async () => {
        const user = await make.user();
        const session = await signIn(user);
        assert.equal((await session.post("/api/collections/users/auth-refresh")).status, 200);

        await setActive(user, false);
        const response = await session.post("/api/collections/users/auth-refresh");
        assert.ok([400, 401, 403].includes(response.status), `status ${response.status}`);
        assert.equal(response.body.token, undefined);
    });

    for (const role of ["motorista", "supervisor"]) {
        test(`${role}: lists, views, creates and edits nothing in any collection`, async () => {
            const user = await make.user({ role });
            const own = await seed(user);
            const session = await signIn(user);

            /* Before the change the session reads its own data, so the later refusal is the rule's doing. */
            const baseline = await session.get("/api/collections/routes/records?perPage=200");
            assert.ok(baseline.body.items.some((item) => item.id === own.route.id));

            await setActive(user, false);
            const records = { users: user, vehicles: vehicle, routes: own.route, complaints: own.complaint, fuels: own.fuel, oils: own.oil, repairs: own.repair };

            for (const collection of COLLECTIONS) {
                const list = await session.get(`/api/collections/${collection}/records?perPage=200`);
                assert.ok(list.status === 403 || (list.status === 200 && list.body.items.length === 0), `${collection} list: ${list.status}`);

                const view = await session.get(`/api/collections/${collection}/records/${records[collection].id}`);
                assert.ok([403, 404].includes(view.status), `${collection} view: ${view.status}`);
            }

            const route = await session.post("/api/collections/routes/records", { vehicle: vehicle.id, status: "aberta", itinerary: "Downtown", km_departure: 1000 });
            const fuel = await session.post("/api/collections/fuels/records", { vehicle: vehicle.id, km_fuel: 1010, type: "etanol", liters: 30, cost: 180 });
            const oil = await session.post("/api/collections/oils/records", { vehicle: vehicle.id, km_oil: 1010, type: "5W30", cost: 250 });
            const repair = await session.post("/api/collections/repairs/records", { vehicle: vehicle.id, km_repair: 1010, description: "Brakes", cost: 400 });
            const complaint = await session.post("/api/collections/complaints/records", complaintForm({ route_current: own.route.id }));
            for (const [name, response] of Object.entries({ route, fuel, oil, repair, complaint })) {
                assert.ok([400, 403].includes(response.status), `create ${name}: ${response.status}`);
            }

            /* Nothing was written, and the user's own records are intact. */
            for (const collection of ["routes", "fuels", "oils", "repairs"]) {
                const total = await admin.get(`/api/collections/${collection}/records?filter=${encodeURIComponent(`user = "${user.id}"`)}`);
                assert.equal(total.body.totalItems, 1, `${collection} count`);
            }
        });
    }

    test("a supervisor loses the vehicle management as well", async () => {
        const supervisor = await make.user({ role: "supervisor" });
        const target = await make.vehicle();
        const session = await signIn(supervisor);
        await setActive(supervisor, false);

        const create = await session.post("/api/collections/vehicles/records", { plate: "INA-0001", type: "carro", model: "Gol", odometer: 1, active: true });
        assert.ok([400, 403].includes(create.status), `create: ${create.status}`);

        const edit = await session.patch(`/api/collections/vehicles/records/${target.id}`, { model: "Hacked" });
        assert.ok([403, 404].includes(edit.status), `edit: ${edit.status}`);
        assert.equal((await admin.get(`/api/collections/vehicles/records/${target.id}`)).body.model, target.model);

        const remove = await session.delete(`/api/collections/vehicles/records/${target.id}`);
        assert.ok([403, 404].includes(remove.status), `delete: ${remove.status}`);
        assert.equal((await admin.get(`/api/collections/vehicles/records/${target.id}`)).status, 200);
    });

    test("a supervisor no longer sees other users", async () => {
        const supervisor = await make.user({ role: "supervisor" });
        const other = await make.user();
        const session = await signIn(supervisor);
        assert.equal((await session.get(`/api/collections/users/records/${other.id}`)).status, 200);

        await setActive(supervisor, false);
        assert.ok([403, 404].includes((await session.get(`/api/collections/users/records/${other.id}`)).status));
    });

    test("the same token works again if the user is reactivated", async () => {
        const user = await make.user();
        const session = await signIn(user);
        await setActive(user, false);
        assert.equal((await session.get(`/api/collections/users/records/${user.id}`)).status, 404);

        await setActive(user, true);
        assert.equal((await session.get(`/api/collections/users/records/${user.id}`)).status, 200);
    });

    test("an anonymous request still gets nothing, as before", async () => {
        const response = await createClient(pb.url).get("/api/collections/routes/records");
        assert.ok(response.status === 403 || (response.status === 200 && response.body.items.length === 0));
    });
});

describe("active users are not affected", () => {
    test("a driver signs in, reads their own records and creates a fuel record", async () => {
        const user = await make.user();
        const own = await seed(user);
        const session = await signIn(user);

        for (const [collection, record] of [["routes", own.route], ["complaints", own.complaint], ["fuels", own.fuel], ["oils", own.oil], ["repairs", own.repair], ["users", user]]) {
            assert.equal((await session.get(`/api/collections/${collection}/records/${record.id}`)).status, 200, collection);
        }
        assert.equal((await session.get(`/api/collections/vehicles/records/${vehicle.id}`)).status, 200);
        assert.equal((await session.post("/api/collections/users/auth-refresh")).status, 200);

        const fuel = await session.post("/api/collections/fuels/records", { vehicle: vehicle.id, km_fuel: 1010, type: "etanol", liters: 30, cost: 180 });
        assert.equal(fuel.status, 200);
        assert.equal(fuel.body.user, user.id);
    });

    test("a supervisor still manages vehicles", async () => {
        const supervisor = await make.user({ role: "supervisor" });
        const session = await signIn(supervisor);
        const created = await session.post("/api/collections/vehicles/records", { plate: "ACT-0001", type: "van", model: "Sprinter", odometer: 500, active: true });
        assert.equal(created.status, 200);
        assert.equal((await session.patch(`/api/collections/vehicles/records/${created.body.id}`, { model: "Updated" })).status, 200);
    });

    test("deactivating one user does not affect another", async () => {
        const a = await make.user();
        const b = await make.user();
        const sessionB = await signIn(b);
        await setActive(a, false);
        assert.equal((await sessionB.get(`/api/collections/users/records/${b.id}`)).status, 200);
    });
});
