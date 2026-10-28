import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { login } from "./helpers/client.js";
import { complaintForm, createFactories, fakePhoto } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the integrity rules of complaints (I-27, RB05, RB08, RB11, RB16, RB17). Every case
 * sends plain requests, without the app, to prove the server holds the rule alone. A refusal is
 * checked by status and, when the app translates it, by `code` (src/services/serverErrors.ts).
 * The km corrections made when a complaint is approved are I-30 and are not covered here.
 */

const PATH = "/api/collections/complaints/records";
const ROUTES = "/api/collections/routes/records";

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

/** A driver, their session and a route they have open (departure km 1000). */
async function driverWithRoute(overrides = {}) {
    const user = await make.user();
    const vehicle = await make.vehicle({ odometer: 1000 });
    const route = await make.route({ user, vehicle, km_departure: 1000, ...overrides });
    return { user, vehicle, route, session: await signIn(user) };
}

/** Files a complaint the way the app does (multipart, with the photo) and returns the response. */
const file = (session, route, fields = {}) => session.post(PATH, complaintForm({ route_current: route.id, km_complaint: 990, ...fields }));

/** Files a complaint and returns the record, failing if the server refuses. */
async function fileOk(session, route, fields) {
    const response = await file(session, route, fields);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body;
}

/** Reads a complaint as superuser. */
const readComplaint = async (complaint) => (await admin.get(`${PATH}/${complaint.id}`)).body;

/** Reads a route as superuser. */
const readRoute = async (route) => (await admin.get(`${ROUTES}/${route.id}`)).body;

/** Sends a review as the given session. */
const review = (session, complaint, fields) => session.patch(`${PATH}/${complaint.id}`, fields);

describe("a complaint is created (RB11)", () => {
    test("the author of an open route files it, born pendente and not reviewed", async () => {
        const { route, session } = await driverWithRoute();
        const response = await file(session, route);

        assert.equal(response.status, 200);
        assert.equal(response.body.status, "pendente");
        assert.equal(response.body.route_current, route.id);
        assert.equal(response.body.km_complaint, 990);
        assert.ok(response.body.photo);
        assert.ok(response.body.created);
        assert.equal(response.body.reviewed, "");
    });

    test("a second complaint on the same route is refused (RB11)", async () => {
        const { route, session } = await driverWithRoute();
        await fileOk(session, route);

        const response = await file(session, route, { km_complaint: 995 });

        assert.equal(response.status, 400);
        assert.equal(response.body.data.route_current.code, "validation_not_unique");
        assert.equal((await admin.get(`${PATH}?filter=route_current='${route.id}'`)).body.totalItems, 1);
    });

    test("another driver cannot file it on a route that is not theirs (RB11)", async () => {
        const { route } = await driverWithRoute();
        const stranger = await signIn(await make.user());

        const response = await file(stranger, route);

        assert.equal(response.status, 400);
        assert.equal((await admin.get(`${PATH}?filter=route_current='${route.id}'`)).body.totalItems, 0);
    });

    test("a supervisor cannot file it on a route of a driver (RB11)", async () => {
        const { route } = await driverWithRoute();

        const response = await file(asSupervisor, route);

        assert.equal(response.status, 400);
        assert.equal((await admin.get(`${PATH}?filter=route_current='${route.id}'`)).body.totalItems, 0);
    });

    test("a supervisor files it on their own open route (RB08)", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const route = await make.route({ user: supervisor, vehicle, km_departure: 1000 });

        const response = await file(asSupervisor, route);

        assert.equal(response.status, 200);
        assert.equal(response.body.status, "pendente");
    });

    test("a finalizada route does not take a complaint (RB11)", async () => {
        const { route, session } = await driverWithRoute({ status: "finalizada", km_return: 1100 });

        const response = await file(session, route);

        assert.equal(response.status, 400);
        assert.equal(response.body.data.route_current.code, "route_not_open");
    });

    test("an encerrada route does not take a complaint (RB11, RB15)", async () => {
        const { route, session } = await driverWithRoute({ status: "encerrada" });

        const response = await file(session, route);

        assert.equal(response.status, 400);
        assert.equal(response.body.data.route_current.code, "route_not_open");
    });

    test("the complaint cannot be filed once the route is finalized, even by the superuser (RB11)", async () => {
        const { route, session } = await driverWithRoute();
        assert.equal((await session.patch(`${ROUTES}/${route.id}`, { status: "finalizada", km_return: 1100 })).status, 200);

        const response = await admin.post(PATH, complaintForm({ route_current: route.id }));

        assert.equal(response.status, 400);
        assert.equal(response.body.data.route_current.code, "route_not_open");
    });

    test("a km equal to the departure km is refused (RB11)", async () => {
        const { route, session } = await driverWithRoute();

        const response = await file(session, route, { km_complaint: 1000 });

        assert.equal(response.status, 400);
        assert.equal(response.body.data.km_complaint.code, "km_equals_departure");
        assert.equal((await admin.get(`${PATH}?filter=route_current='${route.id}'`)).body.totalItems, 0);
    });

    test("a km equal to the departure km with decimals is refused too (RB11, RB16)", async () => {
        const { route, session } = await driverWithRoute({ km_departure: 1234.5 });

        const response = await file(session, route, { km_complaint: 1234.5 });

        assert.equal(response.status, 400);
        assert.equal(response.body.data.km_complaint.code, "km_equals_departure");
    });

    test("a km below or above the departure km is accepted (RB11)", async () => {
        const below = await driverWithRoute();
        const above = await driverWithRoute();

        assert.equal((await file(below.session, below.route, { km_complaint: 999.99 })).status, 200);
        assert.equal((await file(above.session, above.route, { km_complaint: 1000.01 })).status, 200);
    });

    test("the km is validated like every decimal (RB16)", async () => {
        const { route, session } = await driverWithRoute();

        for (const km of [-1, 1000000, 990.123]) {
            const response = await file(session, route, { km_complaint: km });
            assert.equal(response.status, 400, `km ${km}`);
            assert.ok(response.body.data.km_complaint, `km ${km}`);
        }
        assert.equal((await admin.get(`${PATH}?filter=route_current='${route.id}'`)).body.totalItems, 0);
    });

    test("the photo and the km are required", async () => {
        const { route, session } = await driverWithRoute();

        const noPhoto = await file(session, route, { photo: null });
        const noKm = await file(session, route, { km_complaint: null });

        assert.equal(noPhoto.status, 400);
        assert.ok(noPhoto.body.data.photo);
        assert.equal(noKm.status, 400);
        assert.ok(noKm.body.data.km_complaint);
    });

    test("the complaint is born pendente: any other status is refused", async () => {
        const { route, session } = await driverWithRoute();

        for (const status of ["aprovada", "reprovada"]) {
            assert.equal((await file(session, route, { status })).status, 400, status);
        }
        assert.equal((await file(session, route, { status: null })).status, 400);
        assert.equal((await admin.get(`${PATH}?filter=route_current='${route.id}'`)).body.totalItems, 0);
    });

    test("the client cannot send the review date", async () => {
        const { route, session } = await driverWithRoute();

        const response = await file(session, route, { reviewed: "2026-01-01 10:00:00.000Z" });

        assert.equal(response.status, 400);
        assert.equal((await admin.get(`${PATH}?filter=route_current='${route.id}'`)).body.totalItems, 0);
    });

    test("`created` is the server's, whatever the client sends (RNF05)", async () => {
        const { route, session } = await driverWithRoute();

        const record = await fileOk(session, route, { created: "2001-01-01 00:00:00.000Z" });

        assert.ok(Date.parse(record.created.replace(" ", "T")) > Date.parse("2026-01-01T00:00:00Z"));
    });
});

describe("route_previous is set by the server (RB06)", () => {
    test("the first route of a vehicle has no previous route", async () => {
        const { route, session } = await driverWithRoute();

        const record = await fileOk(session, route);

        assert.equal(record.route_previous, "");
    });

    test("it is the last earlier route of the same vehicle, finalizada or encerrada", async () => {
        for (const status of ["finalizada", "encerrada"]) {
            const user = await make.user();
            const vehicle = await make.vehicle({ odometer: 1000 });
            const older = await make.route({ user, vehicle, status: "finalizada", km_departure: 900, km_return: 950 });
            const previous = await make.route({ user, vehicle, status, km_departure: 950, ...(status === "finalizada" ? { km_return: 1000 } : {}) });
            const route = await make.route({ user, vehicle, km_departure: 1000 });

            const record = await fileOk(await signIn(user), route);

            assert.notEqual(record.route_previous, older.id, status);
            assert.equal(record.route_previous, previous.id, status);
        }
    });

    test("a route of another vehicle is never the previous one", async () => {
        const user = await make.user();
        const vehicle = await make.vehicle({ odometer: 1000 });
        const other = await make.vehicle({ odometer: 1000 });
        await make.route({ user, vehicle: other, status: "finalizada", km_departure: 900, km_return: 1000 });
        const route = await make.route({ user, vehicle, km_departure: 1000 });

        const record = await fileOk(await signIn(user), route);

        assert.equal(record.route_previous, "");
    });

    test("a route_previous sent by the client is refused", async () => {
        const user = await make.user();
        const vehicle = await make.vehicle({ odometer: 1000 });
        const foreign = await make.route({ user: await make.user(), vehicle: await make.vehicle(), status: "finalizada", km_departure: 10, km_return: 20 });
        const route = await make.route({ user, vehicle, km_departure: 1000 });

        const response = await file(await signIn(user), route, { route_previous: foreign.id });

        assert.equal(response.status, 400);
        assert.equal((await admin.get(`${PATH}?filter=route_current='${route.id}'`)).body.totalItems, 0);
    });
});

describe("a complaint does not block the route (RB05)", () => {
    test("the route is finalized with a pending complaint, and the complaint stays pendente", async () => {
        const { route, session, vehicle } = await driverWithRoute();
        const complaint = await fileOk(session, route);

        const response = await session.patch(`${ROUTES}/${route.id}`, { status: "finalizada", km_return: 1100 });

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal((await readRoute(route)).status, "finalizada");
        assert.equal((await readComplaint(complaint)).status, "pendente");
        assert.equal((await admin.get(`/api/collections/vehicles/records/${vehicle.id}`)).body.odometer, 1100);
    });
});

describe("a complaint changes only by the review of a supervisor (RB17, RB08)", () => {
    test("the author cannot edit the complaint after filing it, whatever the field", async () => {
        const { route, session } = await driverWithRoute();
        const complaint = await fileOk(session, route);
        const photo = new FormData();
        photo.append("photo", fakePhoto(), "other.jpg");

        const attempts = [
            { status: "aprovada" },
            { status: "reprovada" },
            { km_complaint: 995 },
            { reviewed: "2026-01-01 10:00:00.000Z" },
            photo,
        ];
        for (const body of attempts) {
            const response = await session.patch(`${PATH}/${complaint.id}`, body);
            assert.ok([403, 404].includes(response.status), JSON.stringify(response.body));
        }

        const stored = await readComplaint(complaint);
        assert.equal(stored.status, "pendente");
        assert.equal(stored.km_complaint, 990);
        assert.equal(stored.photo, complaint.photo);
        assert.equal(stored.reviewed, "");
    });

    test("another driver cannot review it", async () => {
        const { route, session } = await driverWithRoute();
        const complaint = await fileOk(session, route);
        const stranger = await signIn(await make.user());

        const response = await review(stranger, complaint, { status: "aprovada" });

        assert.ok([403, 404].includes(response.status), JSON.stringify(response.body));
        assert.equal((await readComplaint(complaint)).status, "pendente");
    });

    test("the supervisor approves it, and the server stamps the review date", async () => {
        const { route, session } = await driverWithRoute();
        const complaint = await fileOk(session, route);
        const before = Date.now();

        const response = await review(asSupervisor, complaint, { status: "aprovada" });

        assert.equal(response.status, 200, JSON.stringify(response.body));
        const stored = await readComplaint(complaint);
        assert.equal(stored.status, "aprovada");
        const reviewed = Date.parse(stored.reviewed.replace(" ", "T"));
        assert.ok(reviewed >= before - 1000 && reviewed <= Date.now() + 1000, stored.reviewed);
        assert.equal(stored.km_complaint, 990);
        assert.equal(stored.photo, complaint.photo);
        assert.equal(stored.route_current, route.id);
        assert.equal(stored.created, complaint.created);
    });

    test("the supervisor rejects it, and the server stamps the review date", async () => {
        const { route, session } = await driverWithRoute();
        const complaint = await fileOk(session, route);

        const response = await review(asSupervisor, complaint, { status: "reprovada" });

        assert.equal(response.status, 200, JSON.stringify(response.body));
        const stored = await readComplaint(complaint);
        assert.equal(stored.status, "reprovada");
        assert.ok(stored.reviewed);
    });

    test("the supervisor reviews a complaint they filed themselves (RB08)", async () => {
        const author = await make.user({ role: "supervisor" });
        const asAuthor = await signIn(author);
        const vehicle = await make.vehicle({ odometer: 1000 });
        const route = await make.route({ user: author, vehicle, km_departure: 1000 });
        const complaint = await fileOk(asAuthor, route);

        const response = await review(asAuthor, complaint, { status: "aprovada" });

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal((await readComplaint(complaint)).status, "aprovada");
    });

    test("the review date sent by the client is refused", async () => {
        const { route, session } = await driverWithRoute();
        const complaint = await fileOk(session, route);

        const response = await review(asSupervisor, complaint, { status: "aprovada", reviewed: "2001-01-01 00:00:00.000Z" });

        assert.ok([400, 403, 404].includes(response.status), JSON.stringify(response.body));
        const stored = await readComplaint(complaint);
        assert.equal(stored.status, "pendente");
        assert.equal(stored.reviewed, "");
    });

    test("the review cannot carry any other field along with the status", async () => {
        const other = await make.route({ user: await make.user(), vehicle: await make.vehicle(), status: "finalizada", km_departure: 10, km_return: 20 });
        const photo = () => {
            const form = new FormData();
            form.append("status", "aprovada");
            form.append("photo", fakePhoto(), "other.jpg");
            return form;
        };
        const attempts = {
            km_complaint: () => ({ status: "aprovada", km_complaint: 995 }),
            route_current: () => ({ status: "aprovada", route_current: other.id }),
            route_previous: () => ({ status: "aprovada", route_previous: other.id }),
            photo,
        };

        /* A new complaint for each attempt, so one that got through could not hide the others. */
        for (const [field, body] of Object.entries(attempts)) {
            const { route, session } = await driverWithRoute();
            const complaint = await fileOk(session, route);

            const response = await review(asSupervisor, complaint, body());

            assert.ok([400, 403, 404].includes(response.status), `${field}: ${JSON.stringify(response.body)}`);
            const stored = await readComplaint(complaint);
            assert.equal(stored.status, "pendente", field);
            assert.equal(stored.km_complaint, 990, field);
            assert.equal(stored.route_current, route.id, field);
            assert.equal(stored.route_previous, "", field);
            assert.equal(stored.photo, complaint.photo, field);
            assert.equal(stored.reviewed, "", field);
        }
    });

    test("`created` does not change in a review (RNF05)", async () => {
        const { route, session } = await driverWithRoute();
        const complaint = await fileOk(session, route);

        await review(asSupervisor, complaint, { status: "aprovada", created: "2001-01-01 00:00:00.000Z" });

        assert.equal((await readComplaint(complaint)).created, complaint.created);
    });

    test("the supervisor cannot change the km alone, nor any value other than the two outcomes", async () => {
        const { route, session } = await driverWithRoute();
        const complaint = await fileOk(session, route);

        for (const body of [{ km_complaint: 995 }, { status: "pendente" }, { status: "arquivada" }, {}]) {
            const response = await review(asSupervisor, complaint, body);
            assert.ok([400, 403, 404].includes(response.status), JSON.stringify(body) + JSON.stringify(response.body));
        }

        const stored = await readComplaint(complaint);
        assert.equal(stored.status, "pendente");
        assert.equal(stored.km_complaint, 990);
    });

    test("a reviewed complaint is final: it is not reviewed again nor edited", async () => {
        const { route, session } = await driverWithRoute();
        const complaint = await fileOk(session, route);
        assert.equal((await review(asSupervisor, complaint, { status: "reprovada" })).status, 200);
        const reviewed = (await readComplaint(complaint)).reviewed;

        for (const body of [{ status: "aprovada" }, { status: "reprovada" }, { km_complaint: 995 }]) {
            const response = await review(asSupervisor, complaint, body);
            assert.ok([400, 403, 404].includes(response.status), JSON.stringify(body) + JSON.stringify(response.body));
        }

        const stored = await readComplaint(complaint);
        assert.equal(stored.status, "reprovada");
        assert.equal(stored.reviewed, reviewed);
        assert.equal(stored.km_complaint, 990);
    });

    test("a supervisor reviews the complaint of any driver, even after the route is finalized (RB05)", async () => {
        const { route, session } = await driverWithRoute();
        const complaint = await fileOk(session, route);
        assert.equal((await session.patch(`${ROUTES}/${route.id}`, { status: "finalizada", km_return: 1100 })).status, 200);

        const response = await review(asSupervisor, complaint, { status: "reprovada" });

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal((await readComplaint(complaint)).status, "reprovada");
    });

    test("an inactive supervisor cannot review (RB18)", async () => {
        const { route, session } = await driverWithRoute();
        const complaint = await fileOk(session, route);
        const inactive = await make.user({ role: "supervisor" });
        const asInactive = await signIn(inactive);
        assert.equal((await admin.patch(`/api/collections/users/records/${inactive.id}`, { active: false })).status, 200);

        const response = await review(asInactive, complaint, { status: "aprovada" });

        assert.ok([401, 403, 404].includes(response.status), JSON.stringify(response.body));
        assert.equal((await readComplaint(complaint)).status, "pendente");
    });

    test("no one deletes a complaint (RB17)", async () => {
        const { route, session } = await driverWithRoute();
        const complaint = await fileOk(session, route);

        for (const client of [session, asSupervisor]) {
            const response = await client.delete(`${PATH}/${complaint.id}`);
            assert.ok([403, 404].includes(response.status), JSON.stringify(response.body));
        }
        assert.equal((await admin.get(`${PATH}/${complaint.id}`)).status, 200);
    });
});
