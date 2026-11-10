import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { LIST_PAGE_SIZE, readSegmentedPage } from "../../frontend/src/services/segmentedList.ts";
import { login } from "./helpers/client.js";
import { createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the paged lists of the supervisor: route closure (RF10, RB10) and complaint review
 * (RF15). The segments (filter and sort) are the ones `closureSegments` and `reviewSegments` build
 * in src/services/routes.ts and complaints.ts, written out here the way history-queries.test.js
 * does with the history filters. The paging itself is not copied: `readSegmentedPage` is imported
 * from the app (src/services/segmentedList.ts, which has no dependencies; Node strips its types)
 * and run against the server, so these tests prove that the pages join without gap or repeat in
 * the order the screens show, and that the API rules still decide who reads what.
 */

const ROUTES = "/api/collections/routes/records";
const COMPLAINTS = "/api/collections/complaints/records";

/* State shared by the file: one disposable instance and a supervisor session. */
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

/** The reader the app gives `readSegmentedPage`, over plain requests of the given session. */
const reader = (session, collection, expand) => async (segment, page, perPage) => {
    const query = `page=${page}&perPage=${perPage}&sort=${segment.sort}&expand=${expand}${segment.filter ? `&filter=${encodeURIComponent(segment.filter)}` : ""}`;
    const response = await session.get(`/api/collections/${collection}/records?${query}`);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return { items: response.body.items, totalItems: response.body.totalItems };
};

/** Same thing as the search box of the app: the filter of the search text, or none. */
function search(vehicle, driver, text) {
    if (text === "") {
        return "";
    }
    return `(${vehicle}.model ~ '${text}' || ${vehicle}.plate ~ '${text.toUpperCase()}' || ${driver}.name ~ '${text}')`;
}

/** Joins the filter of a situation with the search filter, as `closureSegments` does. */
const withSearch = (filter, found) => (found === "" ? filter : `${filter} && ${found}`);

/** `closureSegments` (src/services/routes.ts): open routes oldest first, then closed ones newest first. */
function closureSegments({ query = "", status = "all" } = {}) {
    const found = search("vehicle", "user", query);
    const open = { filter: withSearch("status = 'aberta'", found), sort: "date_departure,id" };
    const closed = { filter: withSearch("status = 'encerrada'", found), sort: "-date_departure,-id" };
    return status === "aberta" ? [open] : status === "encerrada" ? [closed] : [open, closed];
}

/** `reviewSegments` (src/services/complaints.ts): pending oldest first, then reviewed ones latest first. */
function reviewSegments({ query = "", status = "all" } = {}) {
    const found = search("route_current.vehicle", "route_current.user", query);
    const pending = { filter: withSearch("status = 'pendente'", found), sort: "created,id" };
    const reviewed = { filter: withSearch("status != 'pendente'", found), sort: "-reviewed,-id" };
    return status === "pendente" ? [pending] : status === "revisada" ? [reviewed] : [pending, reviewed];
}

/** Reads every page of the list with `readSegmentedPage` and returns the pages. */
async function readAllPages(segments, pageSize, read) {
    const pages = [];
    for (let page = 1; page <= 50; page++) {
        const result = await readSegmentedPage(segments, page, pageSize, read);
        pages.push(result);
        if (!result.hasMore) {
            return pages;
        }
    }
    throw new Error("The list never ended");
}

/** The ids of the items of a page. */
const idsOf = (page) => page.items.map((item) => item.id);

/**
 * Checks the whole paging of a list at several page sizes: the pages, put one after the other, are
 * the expected ids (no gap, no repeat, in order), only the last one says there is nothing more, and
 * every page but the last is full.
 */
async function assertPaging(segments, read, expectedIds) {
    for (const pageSize of [1, 3, 4, 5, LIST_PAGE_SIZE]) {
        const pages = await readAllPages(segments, pageSize, read);
        const label = `page size ${pageSize}`;

        assert.deepEqual(pages.flatMap(idsOf), expectedIds, label);
        assert.equal(pages.length, Math.max(1, Math.ceil(expectedIds.length / pageSize)), label);
        pages.slice(0, -1).forEach((page) => assert.equal(page.items.length, pageSize, label));
    }
}

describe("the route closure list (RF10, RB10)", () => {
    /* Five open routes, six closed ones and two finalized ones, plus the people behind them. */
    let scenario;

    before(async () => {
        const open = [];
        const model = ["Alfa", "Bravo", "Charlie", "Delta", "Echo"];
        for (const [index, name] of model.entries()) {
            const user = await make.user();
            const vehicle = await make.vehicle({ model: `${name} Closure`, type: index % 2 ? "moto" : "carro" });
            open.push({ user, vehicle, route: await make.route({ user, vehicle }) });
        }

        /* One driver and vehicle closing route after route: RB01 and RB02 only bind open routes. */
        const closedUser = await make.user();
        const closedVehicle = await make.vehicle({ model: "Zulu Closure" });
        const closed = [];
        for (let index = 0; index < 6; index++) {
            const route = await make.route({ user: closedUser, vehicle: closedVehicle });
            const response = await admin.patch(`${ROUTES}/${route.id}`, { status: "encerrada" });
            assert.equal(response.status, 200, JSON.stringify(response.body));
            closed.push(route);
        }

        const doneUser = await make.user();
        const doneVehicle = await make.vehicle({ model: "Finished Closure" });
        const finalized = [];
        for (let index = 0; index < 2; index++) {
            const route = await make.route({ user: doneUser, vehicle: doneVehicle });
            const response = await admin.patch(`${ROUTES}/${route.id}`, { status: "finalizada", km_return: 1100 + index });
            assert.equal(response.status, 200, JSON.stringify(response.body));
            finalized.push(route);
        }

        scenario = { open, closed, closedUser, closedVehicle, finalized, doneUser };
    });

    const read = () => reader(asSupervisor, "routes", "user,vehicle,complaints_via_route_current");

    test("the pages put together are the open routes oldest first and then the closed ones newest first, at any page size", async () => {
        const expected = [...scenario.open.map((entry) => entry.route.id), ...scenario.closed.map((route) => route.id).reverse()];

        await assertPaging(closureSegments(), read(), expected);
    });

    test("the page that crosses from the open to the closed routes holds the end of one and the start of the other", async () => {
        const [first, second] = await Promise.all([1, 2].map((page) => readSegmentedPage(closureSegments(), page, 4, read())));

        assert.deepEqual(idsOf(first), scenario.open.slice(0, 4).map((entry) => entry.route.id));
        assert.deepEqual(idsOf(second), [scenario.open[4].route.id, ...scenario.closed.slice(-3).map((route) => route.id).reverse()]);
        assert.equal(first.hasMore && second.hasMore, true);
    });

    test("a page that ends exactly where the open routes end still says there is more, because closed routes follow", async () => {
        const page = await readSegmentedPage(closureSegments(), 1, 5, read());

        assert.deepEqual(idsOf(page), scenario.open.map((entry) => entry.route.id));
        assert.equal(page.hasMore, true);
    });

    test("a page past the end is empty and has nothing more", async () => {
        const page = await readSegmentedPage(closureSegments(), 9, 5, read());

        assert.deepEqual(page, { items: [], hasMore: false });
    });

    test("finalized routes never come (RB10), whatever the filter", async () => {
        const finalized = new Set(scenario.finalized.map((route) => route.id));

        for (const status of ["all", "aberta", "encerrada"]) {
            const pages = await readAllPages(closureSegments({ status }), 4, read());
            assert.equal(pages.flatMap(idsOf).some((id) => finalized.has(id)), false, status);
        }
    });

    test("the situation chips keep one segment: abertas only the open ones, encerradas only the closed ones", async () => {
        const abertas = await readAllPages(closureSegments({ status: "aberta" }), 3, read());
        const encerradas = await readAllPages(closureSegments({ status: "encerrada" }), 3, read());

        assert.deepEqual(abertas.flatMap(idsOf), scenario.open.map((entry) => entry.route.id));
        assert.deepEqual(encerradas.flatMap(idsOf), scenario.closed.map((route) => route.id).reverse());
        assert.ok(abertas.flatMap((page) => page.items).every((item) => item.status === "aberta"));
        assert.ok(encerradas.flatMap((page) => page.items).every((item) => item.status === "encerrada"));
    });

    test("the search finds the driver, the model and the plate in both segments, and pages the result", async () => {
        const [alfa, , , delta] = scenario.open;

        const byModel = await readAllPages(closureSegments({ query: "bravo closure" }), 3, read());
        assert.deepEqual(byModel.flatMap(idsOf), [scenario.open[1].route.id]);

        const byDriver = await readAllPages(closureSegments({ query: delta.user.name }), 3, read());
        assert.deepEqual(byDriver.flatMap(idsOf), [delta.route.id]);

        /* The driver with the closed routes is found among the closed ones, newest first. */
        const closedDriver = await readAllPages(closureSegments({ query: scenario.closedUser.name }), 4, read());
        assert.deepEqual(closedDriver.flatMap(idsOf), scenario.closed.map((route) => route.id).reverse());

        /* A part of the plate, with the hyphen, as the app tries it. */
        const byPlate = await readAllPages(closureSegments({ query: alfa.vehicle.plate }), 3, read());
        assert.deepEqual(byPlate.flatMap(idsOf), [alfa.route.id]);

        const none = await readAllPages(closureSegments({ query: "no such closure" }), 3, read());
        assert.deepEqual(none, [{ items: [], hasMore: false }]);
    });

    test("the search and the situation combine", async () => {
        const abertas = await readAllPages(closureSegments({ query: "closure", status: "aberta" }), 2, read());
        const encerradas = await readAllPages(closureSegments({ query: "zulu", status: "encerrada" }), 2, read());
        const none = await readAllPages(closureSegments({ query: "zulu", status: "aberta" }), 2, read());

        assert.equal(abertas.flatMap(idsOf).length, scenario.open.length);
        assert.equal(encerradas.flatMap(idsOf).length, scenario.closed.length);
        assert.deepEqual(none.flatMap(idsOf), []);
    });

    test("a driver reading the same list gets only their own routes", async () => {
        const mine = scenario.open[0];
        const session = await signIn(mine.user);

        const pages = await readAllPages(closureSegments(), 3, reader(session, "routes", "user,vehicle,complaints_via_route_current"));

        assert.deepEqual(pages.flatMap(idsOf), [mine.route.id]);
    });

    test("a driver with open and closed routes sees both of theirs, in the same order, and nobody else's", async () => {
        const session = await signIn(scenario.closedUser);

        const pages = await readAllPages(closureSegments(), 2, reader(session, "routes", "user,vehicle,complaints_via_route_current"));

        assert.deepEqual(pages.flatMap(idsOf), scenario.closed.map((route) => route.id).reverse());
    });
});

describe("the complaint review list (RF15)", () => {
    /* Six complaints from six drivers: two stay pending, four are reviewed in a known order. */
    let scenario;

    before(async () => {
        const entries = [];
        for (const name of ["Alfa", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"]) {
            const user = await make.user();
            const vehicle = await make.vehicle({ model: `${name} Review` });
            const route = await make.route({ user, vehicle });
            entries.push({ user, vehicle, route, complaint: await make.complaint({ route_current: route.id, km_complaint: 990 }) });
        }

        /* Reviewed one after the other, so the review dates are in this order: 1, then 3, then 5, then 0. */
        const order = [
            [1, "reprovada"],
            [3, "aprovada"],
            [5, "reprovada"],
            [0, "aprovada"],
        ];
        for (const [index, status] of order) {
            const response = await asSupervisor.patch(`${COMPLAINTS}/${entries[index].complaint.id}`, { status });
            assert.equal(response.status, 200, JSON.stringify(response.body));
        }

        scenario = { entries, pending: [2, 4], reviewedLatestFirst: [0, 5, 3, 1] };
    });

    const read = () => reader(asSupervisor, "complaints", "route_current.user,route_current.vehicle");
    const complaintId = (index) => scenario.entries[index].complaint.id;

    test("the pages put together are the pending complaints oldest first and then the reviewed ones latest review first, at any page size", async () => {
        const expected = [...scenario.pending, ...scenario.reviewedLatestFirst].map(complaintId);

        await assertPaging(reviewSegments(), read(), expected);
    });

    test("a page of three crosses from the pending to the reviewed ones and the next one goes on", async () => {
        const first = await readSegmentedPage(reviewSegments(), 1, 3, read());
        const second = await readSegmentedPage(reviewSegments(), 2, 3, read());

        assert.deepEqual(idsOf(first), [...scenario.pending, scenario.reviewedLatestFirst[0]].map(complaintId));
        assert.deepEqual(idsOf(second), scenario.reviewedLatestFirst.slice(1).map(complaintId));
        assert.equal(first.hasMore, true);
        assert.equal(second.hasMore, false);
    });

    test("a page that ends exactly where the pending complaints end still says there is more", async () => {
        const page = await readSegmentedPage(reviewSegments(), 1, 2, read());

        assert.deepEqual(idsOf(page), scenario.pending.map(complaintId));
        assert.equal(page.hasMore, true);
    });

    test("the chips keep one segment: pendentes only the pending ones, revisadas only the reviewed ones", async () => {
        const pendentes = await readAllPages(reviewSegments({ status: "pendente" }), 1, read());
        const revisadas = await readAllPages(reviewSegments({ status: "revisada" }), 3, read());

        assert.deepEqual(pendentes.flatMap(idsOf), scenario.pending.map(complaintId));
        assert.deepEqual(revisadas.flatMap(idsOf), scenario.reviewedLatestFirst.map(complaintId));
        assert.ok(pendentes.flatMap((page) => page.items).every((item) => item.status === "pendente"));
        assert.ok(revisadas.flatMap((page) => page.items).every((item) => item.status !== "pendente" && item.reviewed));
    });

    test("the search finds the driver, the model and the plate of the route, in both segments", async () => {
        const byDriver = await readAllPages(reviewSegments({ query: scenario.entries[3].user.name }), 3, read());
        assert.deepEqual(byDriver.flatMap(idsOf), [complaintId(3)]);

        const byModel = await readAllPages(reviewSegments({ query: "echo review" }), 3, read());
        assert.deepEqual(byModel.flatMap(idsOf), [complaintId(4)]);

        const byPlate = await readAllPages(reviewSegments({ query: scenario.entries[0].vehicle.plate }), 3, read());
        assert.deepEqual(byPlate.flatMap(idsOf), [complaintId(0)]);

        const all = await readAllPages(reviewSegments({ query: "review" }), 4, read());
        assert.deepEqual(all.flatMap(idsOf), [...scenario.pending, ...scenario.reviewedLatestFirst].map(complaintId));

        const none = await readAllPages(reviewSegments({ query: "no such complaint" }), 3, read());
        assert.deepEqual(none, [{ items: [], hasMore: false }]);
    });

    test("the search and the situation combine", async () => {
        const pending = await readAllPages(reviewSegments({ query: "review", status: "pendente" }), 1, read());
        const reviewedOfPending = await readAllPages(reviewSegments({ query: "echo", status: "revisada" }), 1, read());

        assert.deepEqual(pending.flatMap(idsOf), scenario.pending.map(complaintId));
        assert.deepEqual(reviewedOfPending.flatMap(idsOf), []);
    });

    test("the complaint carries what the row shows: driver, vehicle, departure km, km informed and the review date", async () => {
        const [page] = await readAllPages(reviewSegments({ query: scenario.entries[1].user.name }), 3, read());
        const item = page.items[0];

        assert.equal(item.expand.route_current.expand.user.name, scenario.entries[1].user.name);
        assert.equal(item.expand.route_current.expand.vehicle.plate, scenario.entries[1].vehicle.plate);
        assert.equal(item.expand.route_current.km_departure, 1000);
        assert.equal(item.km_complaint, 990);
        assert.equal(item.status, "reprovada");
        assert.ok(Date.parse(item.reviewed.replace(" ", "T")) > 0);
        assert.ok(item.created);
    });

    test("a driver reading the same list gets only their own complaint", async () => {
        const session = await signIn(scenario.entries[2].user);

        const pages = await readAllPages(reviewSegments(), 2, reader(session, "complaints", "route_current.user,route_current.vehicle"));

        assert.deepEqual(pages.flatMap(idsOf), [complaintId(2)]);
    });
});

/* Last on purpose: the complaint it files is pending and would join the review scenario above. */
describe("the closure row carries the indicator of the complaint of its route (RF19)", () => {
    test("driver, vehicle, departure and the complaint situation come with the route, and follow the review", async () => {
        const user = await make.user();
        const vehicle = await make.vehicle({ model: "Indicator Closure" });
        const route = await make.route({ user, vehicle });
        const complaint = await make.complaint({ route_current: route.id, km_complaint: 990 });
        const read = reader(asSupervisor, "routes", "user,vehicle,complaints_via_route_current");

        const [pending] = await readAllPages(closureSegments({ query: user.name }), 3, read);
        const item = pending.items[0];

        assert.equal(item.id, route.id);
        assert.equal(item.expand.user.name, user.name);
        assert.equal(item.expand.vehicle.plate, vehicle.plate);
        assert.equal(item.expand.complaints_via_route_current.id, complaint.id);
        assert.equal(item.expand.complaints_via_route_current.status, "pendente");
        assert.ok(item.date_departure);
        assert.equal(item.km_departure, 1000);

        assert.equal((await asSupervisor.patch(`${COMPLAINTS}/${complaint.id}`, { status: "reprovada" })).status, 200);
        const [reviewed] = await readAllPages(closureSegments({ query: user.name }), 3, read);

        assert.equal(reviewed.items[0].expand.complaints_via_route_current.status, "reprovada");
    });
});
