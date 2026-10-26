import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { login } from "./helpers/client.js";
import { createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the vehicle availability view (I-20, RB01, RB12). Every case sends plain requests,
 * without the app, to prove the server answers who is out without exposing the routes themselves.
 */

const PATH = "/api/collections/vehicle_availability/records";

/* State shared by the file: one disposable instance and factories. */
let pb;
let admin;
let make;

/** Starts the instance. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    make = createFactories(admin);
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

/** Signs in a user created by the factory. */
const signIn = (user) => login(pb.url, "users", user.email, user.password);

/** The ids listed by the view for a session. */
async function busyIds(session) {
    const response = await session.get(`${PATH}?perPage=500`);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body.items.map((item) => item.id);
}

describe("the view lists the vehicles with an open route (RB01)", () => {
    test("a driver sees a vehicle that another driver has out, and not a free one", async () => {
        const owner = await make.user();
        const viewer = await make.user();
        const busy = await make.vehicle();
        const free = await make.vehicle();
        await make.route({ user: owner, vehicle: busy });

        const ids = await busyIds(await signIn(viewer));

        assert.ok(ids.includes(busy.id));
        assert.ok(!ids.includes(free.id));
    });

    test("a finalized or closed route frees the vehicle again, as soon as the route changes", async () => {
        const owner = await make.user();
        const viewer = await signIn(await make.user());
        const closed = await make.vehicle();
        const finalized = await make.vehicle();
        const supervisor = await make.user({ role: "supervisor" });
        const route = await make.route({ user: owner, vehicle: closed });
        const other = await make.user();
        const second = await make.route({ user: other, vehicle: finalized });
        assert.ok((await busyIds(viewer)).includes(closed.id));

        const closing = await (await signIn(supervisor)).patch(`/api/collections/routes/records/${route.id}`, { status: "encerrada" });
        assert.equal(closing.status, 200, JSON.stringify(closing.body));
        const finishing = await (await signIn(other)).patch(`/api/collections/routes/records/${second.id}`, { status: "finalizada", km_return: 1100 });
        assert.equal(finishing.status, 200, JSON.stringify(finishing.body));

        const ids = await busyIds(viewer);
        assert.ok(!ids.includes(closed.id));
        assert.ok(!ids.includes(finalized.id));
    });

    test("an inactive vehicle with no open route is not listed as busy (RB12)", async () => {
        const viewer = await signIn(await make.user());
        const inactive = await make.vehicle({ active: false });

        assert.ok(!(await busyIds(viewer)).includes(inactive.id));
    });

    test("a supervisor sees the same list", async () => {
        const owner = await make.user();
        const busy = await make.vehicle();
        await make.route({ user: owner, vehicle: busy });
        const supervisor = await signIn(await make.user({ role: "supervisor" }));

        assert.ok((await busyIds(supervisor)).includes(busy.id));
    });
});

describe("the view exposes nothing but the vehicle id", () => {
    test("a record has no driver, itinerary or km", async () => {
        const owner = await make.user();
        const busy = await make.vehicle();
        await make.route({ user: owner, vehicle: busy, itinerary: "Secret place", km_departure: 1234 });
        const viewer = await signIn(await make.user());

        const response = await viewer.get(`${PATH}/${busy.id}`);

        assert.equal(response.status, 200);
        assert.deepEqual(Object.keys(response.body).sort(), ["collectionId", "collectionName", "id"]);
    });

    test("a driver still sees only their own routes in `routes`", async () => {
        const owner = await make.user();
        const busy = await make.vehicle();
        await make.route({ user: owner, vehicle: busy });
        const viewer = await signIn(await make.user());

        const response = await viewer.get("/api/collections/routes/records");

        assert.equal(response.status, 200);
        assert.equal(response.body.totalItems, 0);
    });
});

describe("only an active signed-in user reads the view", () => {
    test("an anonymous request lists nothing", async () => {
        const response = await pb.anonymous.get(PATH);

        assert.equal(response.status, 200);
        assert.equal(response.body.totalItems, 0);
    });

    test("a user deactivated with a session still open lists nothing (RB18)", async () => {
        const user = await make.user();
        const busy = await make.vehicle();
        await make.route({ user: await make.user(), vehicle: busy });
        const session = await signIn(user);
        assert.ok((await busyIds(session)).includes(busy.id));

        await admin.patch(`/api/collections/users/records/${user.id}`, { active: false });

        const response = await session.get(PATH);
        assert.equal(response.body.totalItems, 0);
    });

    test("nobody writes through the view", async () => {
        const session = await signIn(await make.user({ role: "supervisor" }));
        const vehicle = await make.vehicle();

        for (const response of [await session.post(PATH, { id: vehicle.id }), await session.patch(`${PATH}/${vehicle.id}`, {}), await session.delete(`${PATH}/${vehicle.id}`)]) {
            assert.ok([400, 403, 404].includes(response.status), String(response.status));
        }
    });
});
