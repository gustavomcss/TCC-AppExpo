import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { login } from "./helpers/client.js";
import { complaintForm, createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the km corrections made when a complaint is approved (I-30, RB06, RB07, RB13,
 * RB14) and for the refusal to close a route with a pending complaint (RB21). Every case sends
 * plain requests, without the app, and reads the routes and the vehicle back as superuser to prove
 * what changed and what did not.
 */

const COMPLAINTS = "/api/collections/complaints/records";
const ROUTES = "/api/collections/routes/records";
const VEHICLES = "/api/collections/vehicles/records";

/* State shared by the file: one disposable instance, a supervisor session and factories. */
let pb;
let admin;
let make;
let asSupervisor;

/** Starts the instance and signs in a supervisor. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    make = createFactories(admin);
    asSupervisor = await signIn(await make.user({ role: "supervisor" }));
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

/** Signs in a user created by the factory. */
const signIn = (user) => login(pb.url, "users", user.email, user.password);

/** Reads a record as superuser. */
const read = async (url, record) => (await admin.get(`${url}/${record.id}`)).body;

/** Reads the km of a route and the odometer of a vehicle as one object. */
async function snapshot({ routes = [], vehicle }) {
    const result = { odometer: (await read(VEHICLES, vehicle)).odometer };
    for (const [name, route] of Object.entries(routes)) {
        const stored = await read(ROUTES, route);
        result[name] = { status: stored.status, departure: stored.km_departure, return: stored.km_return };
    }
    return result;
}

/** A driver and their session. */
async function newDriver() {
    const user = await make.user();
    return { user, session: await signIn(user) };
}

/** Opens a route as the driver, the way the app does. */
const open = async ({ session }, vehicle, kmDeparture) => {
    const response = await session.post(ROUTES, { vehicle: vehicle.id, status: "aberta", itinerary: "Downtown", km_departure: kmDeparture });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body;
};

/** Finalizes a route as its driver. */
const finalize = async ({ session }, route, kmReturn) => {
    const response = await session.patch(`${ROUTES}/${route.id}`, { status: "finalizada", km_return: kmReturn });
    assert.equal(response.status, 200, JSON.stringify(response.body));
};

/** Files a complaint as the driver and returns it. */
async function fileComplaint({ session }, route, kmComplaint) {
    const response = await session.post(COMPLAINTS, complaintForm({ route_current: route.id, km_complaint: kmComplaint }));
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body;
}

/** Sends the review as the supervisor. */
const review = (complaint, status) => asSupervisor.patch(`${COMPLAINTS}/${complaint.id}`, { status });

/** Expects a review to be refused as an inconsistent correction (RB14), returning the message. */
function assertInconsistent(response, label = "") {
    assert.equal(response.status, 400, `${label} ${JSON.stringify(response.body)}`);
    assert.equal(response.body.data.status.code, "km_correction_inconsistent", label);
    return response.body.data.status.message;
}

/**
 * A vehicle whose previous route (900 to 1000, finalizada) is followed by an open route that starts
 * at 1000, with a pending complaint of km `kmComplaint` on the open one.
 */
async function withPreviousRoute(kmComplaint = 990) {
    const vehicle = await make.vehicle({ odometer: 1000 });
    const driver = await newDriver();
    const previous = await make.route({ user: driver.user, vehicle, status: "finalizada", km_departure: 900, km_return: 1000 });
    const route = await open(driver, vehicle, 1000);
    const complaint = await fileComplaint(driver, route, kmComplaint);
    return { vehicle, driver, previous, route, complaint };
}

describe("approving corrects the km of the routes (RB06, RB07)", () => {
    test("with a finalizada previous route, both routes and the odometer take the km of the complaint", async () => {
        const { vehicle, previous, route, complaint } = await withPreviousRoute(990);

        const response = await review(complaint, "aprovada");

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.deepEqual(await snapshot({ vehicle, routes: { previous, route } }), {
            odometer: 990,
            previous: { status: "finalizada", departure: 900, return: 990 },
            route: { status: "aberta", departure: 990, return: 0 },
        });
        const stored = await read(COMPLAINTS, complaint);
        assert.equal(stored.status, "aprovada");
        assert.ok(stored.reviewed);
    });

    test("a km above the old one is corrected too, with decimals", async () => {
        const { vehicle, previous, route, complaint } = await withPreviousRoute(1010.55);

        assert.equal((await review(complaint, "aprovada")).status, 200);

        assert.deepEqual(await snapshot({ vehicle, routes: { previous, route } }), {
            odometer: 1010.55,
            previous: { status: "finalizada", departure: 900, return: 1010.55 },
            route: { status: "aberta", departure: 1010.55, return: 0 },
        });
    });

    test("without a previous route, only the route of the complaint changes", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const driver = await newDriver();
        const route = await open(driver, vehicle, 1000);
        const complaint = await fileComplaint(driver, route, 990);

        assert.equal((await review(complaint, "aprovada")).status, 200);

        assert.deepEqual(await snapshot({ vehicle, routes: { route } }), {
            odometer: 1000,
            route: { status: "aberta", departure: 990, return: 0 },
        });
    });

    test("with an encerrada previous route, no other route changes and the odometer stays", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const driver = await newDriver();
        const older = await make.route({ user: driver.user, vehicle, status: "finalizada", km_departure: 800, km_return: 1000 });
        const closed = await make.route({ user: driver.user, vehicle, status: "encerrada", km_departure: 1000 });
        const route = await open(driver, vehicle, 1000);
        const complaint = await fileComplaint(driver, route, 990);
        assert.equal((await read(COMPLAINTS, complaint)).route_previous, closed.id);

        assert.equal((await review(complaint, "aprovada")).status, 200);

        assert.deepEqual(await snapshot({ vehicle, routes: { older, closed, route } }), {
            odometer: 1000,
            older: { status: "finalizada", departure: 800, return: 1000 },
            closed: { status: "encerrada", departure: 1000, return: 0 },
            route: { status: "aberta", departure: 990, return: 0 },
        });
    });

    test("when the route of the complaint is finalized, the previous route is still corrected but the odometer stays", async () => {
        const { vehicle, driver, previous, route, complaint } = await withPreviousRoute(990);
        await finalize(driver, route, 1100);

        assert.equal((await review(complaint, "aprovada")).status, 200);

        assert.deepEqual(await snapshot({ vehicle, routes: { previous, route } }), {
            odometer: 1100,
            previous: { status: "finalizada", departure: 900, return: 990 },
            route: { status: "finalizada", departure: 990, return: 1100 },
        });
    });

    test("a route that came after the complaint is not touched, and the odometer keeps the last route", async () => {
        const { vehicle, driver, previous, route, complaint } = await withPreviousRoute(990);
        await finalize(driver, route, 1100);
        const later = await open(driver, vehicle, 1100);
        await finalize(driver, later, 1200);

        assert.equal((await review(complaint, "aprovada")).status, 200);

        assert.deepEqual(await snapshot({ vehicle, routes: { previous, route, later } }), {
            odometer: 1200,
            previous: { status: "finalizada", departure: 900, return: 990 },
            route: { status: "finalizada", departure: 990, return: 1100 },
            later: { status: "finalizada", departure: 1100, return: 1200 },
        });
    });

    test("the km of another vehicle is not touched", async () => {
        const { complaint } = await withPreviousRoute(990);
        const other = await make.vehicle({ odometer: 4321 });
        const otherRoute = await make.route({ user: await make.user(), vehicle: other, status: "finalizada", km_departure: 4000, km_return: 4321 });

        assert.equal((await review(complaint, "aprovada")).status, 200);

        assert.deepEqual(await snapshot({ vehicle: other, routes: { otherRoute } }), {
            odometer: 4321,
            otherRoute: { status: "finalizada", departure: 4000, return: 4321 },
        });
    });

    test("the supervisor approves their own complaint, and the correction is the same (RB08)", async () => {
        const author = await make.user({ role: "supervisor" });
        const asAuthor = await signIn(author);
        const vehicle = await make.vehicle({ odometer: 1000 });
        const previous = await make.route({ user: author, vehicle, status: "finalizada", km_departure: 900, km_return: 1000 });
        const route = (await asAuthor.post(ROUTES, { vehicle: vehicle.id, status: "aberta", itinerary: "Downtown", km_departure: 1000 })).body;
        const complaint = (await asAuthor.post(COMPLAINTS, complaintForm({ route_current: route.id, km_complaint: 995 }))).body;

        const response = await asAuthor.patch(`${COMPLAINTS}/${complaint.id}`, { status: "aprovada" });

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.deepEqual(await snapshot({ vehicle, routes: { previous, route } }), {
            odometer: 995,
            previous: { status: "finalizada", departure: 900, return: 995 },
            route: { status: "aberta", departure: 995, return: 0 },
        });
    });
});

describe("rejecting changes no km (RB07)", () => {
    test("both routes and the odometer stay as they were", async () => {
        const { vehicle, previous, route, complaint } = await withPreviousRoute(990);
        const before = await snapshot({ vehicle, routes: { previous, route } });

        const response = await review(complaint, "reprovada");

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.deepEqual(await snapshot({ vehicle, routes: { previous, route } }), before);
        const stored = await read(COMPLAINTS, complaint);
        assert.equal(stored.status, "reprovada");
        assert.ok(stored.reviewed);
    });

    test("it is never refused, even when approving would be", async () => {
        const { complaint } = await withPreviousRoute(850);

        assertInconsistent(await review(complaint, "aprovada"));
        const response = await review(complaint, "reprovada");

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal((await read(COMPLAINTS, complaint)).status, "reprovada");
    });
});

describe("a correction that would be inconsistent is refused and nothing changes (RB14)", () => {
    test("a km that is not greater than the departure km of the previous route", async () => {
        for (const km of [900, 850, 0.01]) {
            const { vehicle, previous, route, complaint } = await withPreviousRoute(km);
            const before = await snapshot({ vehicle, routes: { previous, route } });

            assertInconsistent(await review(complaint, "aprovada"), String(km));

            assert.deepEqual(await snapshot({ vehicle, routes: { previous, route } }), before, String(km));
            const stored = await read(COMPLAINTS, complaint);
            assert.equal(stored.status, "pendente", String(km));
            assert.equal(stored.reviewed, "", String(km));
        }
    });

    test("the smallest km above the departure km of the previous route is accepted", async () => {
        const { vehicle, previous, complaint } = await withPreviousRoute(900.01);

        assert.equal((await review(complaint, "aprovada")).status, 200);

        assert.equal((await snapshot({ vehicle, routes: { previous } })).previous.return, 900.01);
    });

    test("the refusal answers with one code on `status`, and no field of a route", async () => {
        const { complaint } = await withPreviousRoute(850);

        const response = await review(complaint, "aprovada");

        assert.equal(response.status, 400);
        assert.deepEqual(Object.keys(response.body.data), ["status"]);
        assert.equal(response.body.data.status.code, "km_correction_inconsistent");
    });

    test("the previous route is not corrected when it is encerrada, so the same km is accepted", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const driver = await newDriver();
        await make.route({ user: driver.user, vehicle, status: "encerrada", km_departure: 5000 });
        const route = await open(driver, vehicle, 1000);
        const complaint = await fileComplaint(driver, route, 850);

        assert.equal((await review(complaint, "aprovada")).status, 200);
    });

    test("the refusal also holds for the superuser", async () => {
        const { vehicle, previous, route, complaint } = await withPreviousRoute(850);
        const before = await snapshot({ vehicle, routes: { previous, route } });

        const response = await admin.patch(`${COMPLAINTS}/${complaint.id}`, { status: "aprovada" });

        assertInconsistent(response);
        assert.deepEqual(await snapshot({ vehicle, routes: { previous, route } }), before);
        assert.equal((await read(COMPLAINTS, complaint)).status, "pendente");
    });

    test("an inconsistent approval can be followed by a rejection, and the route is finalized as usual", async () => {
        const { vehicle, driver, route, complaint } = await withPreviousRoute(850);

        assertInconsistent(await review(complaint, "aprovada"));
        assert.equal((await review(complaint, "reprovada")).status, 200);
        await finalize(driver, route, 1100);

        assert.equal((await read(VEHICLES, vehicle)).odometer, 1100);
    });
});

describe("two complaints queued on the same vehicle, in both orders of review (RB14)", () => {
    /**
     * Route 1 (previous, 1000 to 1100, finalizada) has complaint A; route 2 starts at 1100 and has
     * complaint B, whose previous route is route 1.
     */
    async function queued(kmA, kmB) {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const driver = await newDriver();
        const route1 = await open(driver, vehicle, 1000);
        const complaintA = await fileComplaint(driver, route1, kmA);
        await finalize(driver, route1, 1100);
        const route2 = await open(driver, vehicle, 1100);
        const complaintB = await fileComplaint(driver, route2, kmB);
        assert.equal((await read(COMPLAINTS, complaintB)).route_previous, route1.id);
        return { vehicle, route1, route2, complaintA, complaintB };
    }

    test("consistent km: both orders end with the same data", async () => {
        const expected = {
            odometer: 1090,
            route1: { status: "finalizada", departure: 990, return: 1090 },
            route2: { status: "aberta", departure: 1090, return: 0 },
        };

        for (const order of ["AB", "BA"]) {
            const { vehicle, route1, route2, complaintA, complaintB } = await queued(990, 1090);
            const complaints = { A: complaintA, B: complaintB };

            for (const key of order) {
                const response = await review(complaints[key], "aprovada");
                assert.equal(response.status, 200, `${order}: ${key} ${JSON.stringify(response.body)}`);
            }

            assert.deepEqual(await snapshot({ vehicle, routes: { route1, route2 } }), expected, order);
        }
    });

    test("A raises the departure km above what B would leave as return: B first is refused with the review-first message", async () => {
        const { vehicle, route1, route2, complaintA, complaintB } = await queued(1095, 1090);
        const before = await snapshot({ vehicle, routes: { route1, route2 } });

        const message = assertInconsistent(await review(complaintB, "aprovada"));

        assert.match(message, /pending complaint/);
        assert.match(message, /review it first/);
        assert.deepEqual(await snapshot({ vehicle, routes: { route1, route2 } }), before);
        assert.equal((await read(COMPLAINTS, complaintB)).status, "pendente");

        /* A first, then B is refused too, now because the departure km of route 1 is already 1095. */
        assert.equal((await review(complaintA, "aprovada")).status, 200);
        const second = assertInconsistent(await review(complaintB, "aprovada"));
        assert.doesNotMatch(second, /pending complaint/);
        assert.deepEqual(await snapshot({ vehicle, routes: { route1, route2 } }), {
            odometer: 1100,
            route1: { status: "finalizada", departure: 1095, return: 1100 },
            route2: { status: "aberta", departure: 1100, return: 0 },
        });

        /* Rejecting B is always possible. */
        assert.equal((await review(complaintB, "reprovada")).status, 200);
    });

    test("rejecting A first lets B be approved", async () => {
        const { vehicle, route1, route2, complaintA, complaintB } = await queued(1095, 1090);

        assert.equal((await review(complaintA, "reprovada")).status, 200);
        assert.equal((await review(complaintB, "aprovada")).status, 200);

        assert.deepEqual(await snapshot({ vehicle, routes: { route1, route2 } }), {
            odometer: 1090,
            route1: { status: "finalizada", departure: 1000, return: 1090 },
            route2: { status: "aberta", departure: 1090, return: 0 },
        });
    });
});

describe("a route with a pending complaint is not closed (RB21)", () => {
    /** Closes the route as the supervisor, the way the app does. */
    const close = (route) => asSupervisor.patch(`${ROUTES}/${route.id}`, { status: "encerrada" });

    test("the closing is refused and nothing changes, the vehicle and the driver stay occupied", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const driver = await newDriver();
        const route = await open(driver, vehicle, 1000);
        await fileComplaint(driver, route, 990);

        const response = await close(route);

        assert.equal(response.status, 400, JSON.stringify(response.body));
        assert.equal(response.body.data.status.code, "route_has_pending_complaint");
        assert.deepEqual(await snapshot({ vehicle, routes: { route } }), { odometer: 1000, route: { status: "aberta", departure: 1000, return: 0 } });
        const again = await driver.session.post(ROUTES, { vehicle: vehicle.id, status: "aberta", itinerary: "Downtown", km_departure: 1000 });
        assert.equal(again.status, 400);
        assert.equal(again.body.data.vehicle.code, "vehicle_in_open_route");
    });

    test("the refusal also holds for the superuser", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const driver = await newDriver();
        const route = await open(driver, vehicle, 1000);
        await fileComplaint(driver, route, 990);

        const response = await admin.patch(`${ROUTES}/${route.id}`, { status: "encerrada" });

        assert.equal(response.status, 400, JSON.stringify(response.body));
        assert.equal(response.body.data.status.code, "route_has_pending_complaint");
        assert.equal((await read(ROUTES, route)).status, "aberta");
    });

    test("after the complaint is approved, the route is closed, and the km stay as the approval left them (RB15)", async () => {
        const { vehicle, previous, route, complaint } = await withPreviousRoute(990);
        assert.equal((await review(complaint, "aprovada")).status, 200);

        const response = await close(route);

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.deepEqual(await snapshot({ vehicle, routes: { previous, route } }), {
            odometer: 990,
            previous: { status: "finalizada", departure: 900, return: 990 },
            route: { status: "encerrada", departure: 990, return: 0 },
        });
    });

    test("after the complaint is rejected, the route is closed and no km changes (RB15)", async () => {
        const { vehicle, previous, route, complaint } = await withPreviousRoute(990);
        assert.equal((await review(complaint, "reprovada")).status, 200);

        const response = await close(route);

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.deepEqual(await snapshot({ vehicle, routes: { previous, route } }), {
            odometer: 1000,
            previous: { status: "finalizada", departure: 900, return: 1000 },
            route: { status: "encerrada", departure: 1000, return: 0 },
        });
    });

    test("a route without a complaint is closed as before, and a complaint of another route does not block it (RB15)", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const driver = await newDriver();
        const route = await open(driver, vehicle, 1000);
        const other = await withPreviousRoute(990);

        assert.equal((await close(route)).status, 200);
        assert.equal((await read(ROUTES, route)).status, "encerrada");
        assert.equal((await read(COMPLAINTS, other.complaint)).status, "pendente");
    });

    test("a pending complaint left on a closed route can still be approved, and only the departure km is corrected", async () => {
        /* Only the superuser can build this: reject, close, then put the complaint back to pendente. */
        const { vehicle, previous, route, complaint } = await withPreviousRoute(990);
        assert.equal((await review(complaint, "reprovada")).status, 200);
        assert.equal((await close(route)).status, 200);
        assert.equal((await admin.patch(`${COMPLAINTS}/${complaint.id}`, { status: "pendente" })).status, 200);

        assert.equal((await review(complaint, "aprovada")).status, 200);

        assert.deepEqual(await snapshot({ vehicle, routes: { previous, route } }), {
            odometer: 990,
            previous: { status: "finalizada", departure: 900, return: 990 },
            route: { status: "encerrada", departure: 990, return: 0 },
        });
    });
});

describe("the review and the corrections happen together or not at all", () => {
    test("if a correction cannot be saved, the approval is rolled back (one transaction)", async () => {
        const { vehicle, previous, route, complaint } = await withPreviousRoute(990);
        const before = await snapshot({ vehicle, routes: { previous, route } });

        /* A new required field makes every existing vehicle invalid, so saving the odometer fails, the last step. */
        const collection = (await admin.get("/api/collections/vehicles")).body;
        const patched = await admin.patch(`/api/collections/${collection.id}`, { fields: [...collection.fields, { type: "text", name: "must_have", required: true }] });
        assert.equal(patched.status, 200);

        const response = await review(complaint, "aprovada");

        assert.equal(response.status, 400, JSON.stringify(response.body));
        assert.deepEqual(await snapshot({ vehicle, routes: { previous, route } }), before);
        const stored = await read(COMPLAINTS, complaint);
        assert.equal(stored.status, "pendente");
        assert.equal(stored.reviewed, "");
    });
});
