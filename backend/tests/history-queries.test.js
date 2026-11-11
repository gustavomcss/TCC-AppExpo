import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { login } from "./helpers/client.js";
import { createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the queries behind the history tab (I-33, RF17, RB10). The filters are built by
 * `buildHistoryFilter` in src/services/history.ts and sent as they are here, so these tests prove
 * that the server runs them (relation paths, `~`, date ranges, paging) and that the API rules
 * still decide who reads what: a driver gets only their own records, a supervisor everyone's.
 */

const ROUTES = "/api/collections/routes/records";

/* State shared by the file: one disposable instance, two sessions and the scenario below. */
let pb;
let admin;
let make;
let asSupervisor;
let scenario;

/** Starts the instance, signs in a supervisor and builds the scenario. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    make = createFactories(admin);
    asSupervisor = await signIn(await make.user({ role: "supervisor" }));
    scenario = await buildScenario();
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

/** Signs in a user created by the factory. */
const signIn = (user) => login(pb.url, "users", user.email, user.password);

/** Finalizes an open route as superuser: the hook stamps `date_return` and moves the odometer. */
async function finalize(route, kmReturn = 1100) {
    const response = await admin.patch(`${ROUTES}/${route.id}`, { status: "finalizada", km_return: kmReturn });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body;
}

/** Reads a list the way the app does: sorted, expanded and paged, with an optional server filter. */
function list(session, collection, { filter = "", sort = "-created", expand = "", page = 1, perPage = 500 } = {}) {
    const query = `page=${page}&perPage=${perPage}&sort=${sort}${expand ? `&expand=${expand}` : ""}${filter ? `&filter=${encodeURIComponent(filter)}` : ""}`;
    return session.get(`/api/collections/${collection}/records?${query}`);
}

/** The ids of a list response. */
const idsOf = (response) => response.body.items.map((item) => item.id);

/** A date as pb.filter writes it into a filter: "2026-10-22 08:15:00.000Z". */
const pbDate = (date) => date.toISOString().replace("T", " ");

/**
 * The plate texts the app looks for (plateSearchTexts in services/history.ts): what was typed
 * without symbols, and the same with the hyphen in each position it could take, since the stored
 * plate is AAA-0A00 and the user may type part of it.
 */
function plateTexts(text) {
    const code = text.replace(/[^a-z0-9]/gi, "").toUpperCase();
    const texts = code === "" ? [] : [code];

    for (let left = 1; left <= 3 && left < code.length; left++) {
        if (code.length - left <= 4) {
            texts.push(`${code.slice(0, left)}-${code.slice(left)}`);
        }
    }

    return texts;
}

/**
 * The filter of a vehicle search on the model and the plate, as the app builds it. `vehicle` is the
 * path to the relation and `others` are alternatives added to the same search (the driver's name).
 */
function vehicleSearchFilter(typed, vehicle = "vehicle", others = []) {
    const plates = plateTexts(typed).map((text) => `${vehicle}.plate ~ '${text}'`);
    return `(${[`${vehicle}.model ~ '${typed}'`, ...plates, ...others].join(" || ")})`;
}

const DAY = 24 * 60 * 60 * 1000;

/*
 * Two drivers with records on a car and a motorcycle, a third driver whose route was closed
 * administratively, and a complaint on the open route of each of the first two.
 */
async function buildScenario() {
    const driverA = await make.user();
    const driverB = await make.user();
    const driverC = await make.user();
    const car = await make.vehicle({ type: "carro", model: "Onix Hist" });
    const moto = await make.vehicle({ type: "moto", model: "Titan Hist" });
    const van = await make.vehicle({ type: "van", model: "Fiorino Hist" });

    const fuelACar = await make.fuel({ user: driverA, vehicle: car });
    const fuelAMoto = await make.fuel({ user: driverA, vehicle: moto });
    const fuelBCar = await make.fuel({ user: driverB, vehicle: car });
    const oilACar = await make.oil({ user: driverA, vehicle: car });
    const oilBMoto = await make.oil({ user: driverB, vehicle: moto });
    const repairAMoto = await make.repair({ user: driverA, vehicle: moto });
    const repairBCar = await make.repair({ user: driverB, vehicle: car });

    const routeACar = await finalize(await make.route({ user: driverA, vehicle: car, km_departure: 1000 }));
    const routeBMoto = await finalize(await make.route({ user: driverB, vehicle: moto, km_departure: 1000 }));
    const routeCVan = await make.route({ user: driverC, vehicle: van });
    const closed = await admin.patch(`${ROUTES}/${routeCVan.id}`, { status: "encerrada" });
    assert.equal(closed.status, 200, JSON.stringify(closed.body));
    const openAMoto = await make.route({ user: driverA, vehicle: moto, km_departure: 1100 });
    const openBCar = await make.route({ user: driverB, vehicle: car, km_departure: 1100 });

    const complaintAMoto = await make.complaint({ route_current: openAMoto.id, km_complaint: 1090 });
    const complaintBCar = await make.complaint({ route_current: openBCar.id, km_complaint: 1090 });

    return {
        driverA,
        driverB,
        sessionA: await signIn(driverA),
        sessionB: await signIn(driverB),
        car,
        moto,
        van,
        fuels: { aCar: fuelACar, aMoto: fuelAMoto, bCar: fuelBCar },
        oils: { aCar: oilACar, bMoto: oilBMoto },
        repairs: { aMoto: repairAMoto, bCar: repairBCar },
        routes: { aCar: routeACar, bMoto: routeBMoto, closed: routeCVan, openAMoto, openBCar },
        complaints: { aMoto: complaintAMoto, bCar: complaintBCar },
    };
}

describe("who reads what in each module (RF17)", () => {
    const MODULES = [
        { name: "fuels", collection: "fuels", own: (s) => [s.fuels.aCar.id, s.fuels.aMoto.id], others: (s) => [s.fuels.bCar.id] },
        { name: "oils", collection: "oils", own: (s) => [s.oils.aCar.id], others: (s) => [s.oils.bMoto.id] },
        { name: "repairs", collection: "repairs", own: (s) => [s.repairs.aMoto.id], others: (s) => [s.repairs.bCar.id] },
        { name: "complaints", collection: "complaints", own: (s) => [s.complaints.aMoto.id], others: (s) => [s.complaints.bCar.id] },
    ];

    for (const { name, collection, own, others } of MODULES) {
        test(`${name}: a driver lists only their own, a supervisor lists everyone's`, async () => {
            const driver = await list(scenario.sessionA, collection);
            const supervisor = await list(asSupervisor, collection);

            assert.equal(driver.status, 200, JSON.stringify(driver.body));
            for (const id of own(scenario)) {
                assert.ok(idsOf(driver).includes(id));
            }
            for (const id of others(scenario)) {
                assert.ok(!idsOf(driver).includes(id), "the other driver's record leaked");
            }
            for (const id of [...own(scenario), ...others(scenario)]) {
                assert.ok(idsOf(supervisor).includes(id));
            }
        });
    }

    test("routes: a driver lists only their own finalized routes, a supervisor everyone's (RB10)", async () => {
        const filter = 'status = "finalizada"';
        const driver = await list(scenario.sessionA, "routes", { filter, sort: "-date_return" });
        const supervisor = await list(asSupervisor, "routes", { filter, sort: "-date_return" });
        const { routes } = scenario;

        assert.deepEqual(idsOf(driver), [routes.aCar.id]);
        assert.ok(idsOf(supervisor).includes(routes.aCar.id));
        assert.ok(idsOf(supervisor).includes(routes.bMoto.id));
        for (const route of [routes.openAMoto, routes.openBCar, routes.closed]) {
            assert.ok(!idsOf(supervisor).includes(route.id), "an open or closed route reached the history");
        }
    });

    test("a request without a session lists nothing", async () => {
        const anonymous = await list(createAnonymous(), "fuels");

        assert.equal(anonymous.status, 200, JSON.stringify(anonymous.body));
        assert.equal(anonymous.body.totalItems, 0, JSON.stringify(anonymous.body));
    });
});

/** A client without a session. */
function createAnonymous() {
    return { get: (path) => fetch(pb.url + path).then(async (r) => ({ status: r.status, body: await r.json() })) };
}

describe("the vehicle filters, in the service modules and through the route of a complaint", () => {
    test("by model, ignoring case", async () => {
        const filter = "(vehicle.model ~ 'onix hist')";
        const response = await list(asSupervisor, "fuels", { filter });

        assert.ok(idsOf(response).includes(scenario.fuels.aCar.id));
        assert.ok(idsOf(response).includes(scenario.fuels.bCar.id));
        assert.ok(!idsOf(response).includes(scenario.fuels.aMoto.id));
    });

    test("by plate, with or without the hyphen the user typed", async () => {
        for (const typed of [scenario.moto.plate, scenario.moto.plate.replace("-", "").toLowerCase()]) {
            const response = await list(asSupervisor, "oils", { filter: vehicleSearchFilter(typed) });

            assert.ok(idsOf(response).includes(scenario.oils.bMoto.id), `plate typed as "${typed}"`);
            assert.ok(!idsOf(response).includes(scenario.oils.aCar.id), `plate typed as "${typed}"`);
        }
    });

    test("by part of the plate: the last four characters, or a piece that crosses the hyphen", async () => {
        const plate = scenario.moto.plate;
        const pieces = [
            plate.slice(4) /* 0A00 */,
            plate.slice(4).toLowerCase(),
            plate.slice(2, 6) /* the hyphen in the middle */,
            plate.slice(2, 6).replace("-", "").toLowerCase(),
            plate.slice(0, 5).replace("-", "") /* the three letters and the first digit */,
        ];

        for (const typed of pieces) {
            const response = await list(asSupervisor, "oils", { filter: vehicleSearchFilter(typed) });

            assert.ok(idsOf(response).includes(scenario.oils.bMoto.id), `part typed as "${typed}"`);
        }
    });

    test("by vehicle type", async () => {
        const response = await list(asSupervisor, "repairs", { filter: "vehicle.type = 'moto'" });

        assert.ok(idsOf(response).includes(scenario.repairs.aMoto.id));
        assert.ok(!idsOf(response).includes(scenario.repairs.bCar.id));
    });

    test("routes: by type, among the finalized ones", async () => {
        const filter = "status = \"finalizada\" && vehicle.type = 'moto'";
        const response = await list(asSupervisor, "routes", { filter, sort: "-date_return" });

        assert.ok(idsOf(response).includes(scenario.routes.bMoto.id));
        assert.ok(!idsOf(response).includes(scenario.routes.aCar.id));
    });

    test("complaints: the vehicle is reached through the route", async () => {
        const byType = await list(asSupervisor, "complaints", { filter: "route_current.vehicle.type = 'moto'" });
        const byModel = await list(asSupervisor, "complaints", { filter: "(route_current.vehicle.model ~ 'Onix Hist')" });
        const byPlate = await list(asSupervisor, "complaints", {
            filter: vehicleSearchFilter(scenario.car.plate, "route_current.vehicle"),
        });

        assert.ok(idsOf(byType).includes(scenario.complaints.aMoto.id));
        assert.ok(!idsOf(byType).includes(scenario.complaints.bCar.id));
        assert.ok(idsOf(byModel).includes(scenario.complaints.bCar.id));
        assert.ok(!idsOf(byModel).includes(scenario.complaints.aMoto.id));
        assert.ok(idsOf(byPlate).includes(scenario.complaints.bCar.id));
    });

    test("by driver name, in every module, for the supervisor", async () => {
        const name = scenario.driverB.name;
        const byDriver = (path) => `(${path}.name ~ '${name}')`;
        const fuels = await list(asSupervisor, "fuels", { filter: byDriver("user") });
        const routes = await list(asSupervisor, "routes", {
            filter: `status = "finalizada" && ${byDriver("user")}`,
            sort: "-date_return",
        });
        const complaints = await list(asSupervisor, "complaints", { filter: byDriver("route_current.user") });

        assert.deepEqual(idsOf(fuels), [scenario.fuels.bCar.id]);
        assert.deepEqual(idsOf(routes), [scenario.routes.bMoto.id]);
        assert.deepEqual(idsOf(complaints), [scenario.complaints.bCar.id]);
    });

    test("the driver name, the model and the plate are alternatives of one search", async () => {
        const term = scenario.driverA.name;
        const filter = vehicleSearchFilter(term, "vehicle", [`user.name ~ '${term}'`]);
        const response = await list(asSupervisor, "oils", { filter });

        assert.deepEqual(idsOf(response), [scenario.oils.aCar.id]);
    });

    test("a driver's filter narrows only their own records", async () => {
        const response = await list(scenario.sessionA, "fuels", { filter: "(vehicle.model ~ 'Onix Hist')" });

        assert.deepEqual(idsOf(response), [scenario.fuels.aCar.id]);
    });

    test("a complaint filter on the vehicle does not widen what a driver reads", async () => {
        const response = await list(scenario.sessionA, "complaints", { filter: "route_current.vehicle.type = 'carro'" });

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.deepEqual(idsOf(response), []);
    });
});

describe("the period filter", () => {
    const now = Date.now();
    const range = (from, to, field = "created") => `${field} >= '${pbDate(new Date(from))}' && ${field} < '${pbDate(new Date(to))}'`;

    test("includes what was created inside the range and leaves out what was not", async () => {
        const inside = await list(asSupervisor, "fuels", { filter: range(now - DAY, now + DAY) });
        const after = await list(asSupervisor, "fuels", { filter: `created >= '${pbDate(new Date(now + DAY))}'` });
        const before = await list(asSupervisor, "fuels", { filter: `created < '${pbDate(new Date(now - DAY))}'` });

        assert.ok(idsOf(inside).includes(scenario.fuels.aCar.id));
        assert.ok(!idsOf(after).includes(scenario.fuels.aCar.id));
        assert.ok(!idsOf(before).includes(scenario.fuels.aCar.id));
    });

    test("the end of the range is excluded and the start is included", async () => {
        const created = new Date(scenario.fuels.aCar.created.replace(" ", "T"));
        const endsAtCreation = await list(asSupervisor, "fuels", { filter: range(created.getTime() - DAY, created.getTime()) });
        const startsAtCreation = await list(asSupervisor, "fuels", { filter: range(created.getTime(), created.getTime() + DAY) });

        assert.ok(!idsOf(endsAtCreation).includes(scenario.fuels.aCar.id));
        assert.ok(idsOf(startsAtCreation).includes(scenario.fuels.aCar.id));
    });

    test("routes are placed in the period by their return date", async () => {
        const base = 'status = "finalizada" && ';
        const inside = await list(asSupervisor, "routes", { filter: base + range(now - DAY, now + DAY, "date_return"), sort: "-date_return" });
        const outside = await list(asSupervisor, "routes", { filter: base + range(now - 3 * DAY, now - DAY, "date_return"), sort: "-date_return" });

        assert.ok(idsOf(inside).includes(scenario.routes.aCar.id));
        assert.ok(!idsOf(outside).includes(scenario.routes.aCar.id));
    });

    test("complaints are placed in the period by their creation date", async () => {
        const inside = await list(asSupervisor, "complaints", { filter: range(now - DAY, now + DAY) });
        const outside = await list(asSupervisor, "complaints", { filter: range(now - 3 * DAY, now - DAY) });

        assert.ok(idsOf(inside).includes(scenario.complaints.aMoto.id));
        assert.ok(!idsOf(outside).includes(scenario.complaints.aMoto.id));
    });

    test("period, type and model combine", async () => {
        const filter = `(vehicle.model ~ 'Onix') && vehicle.type = 'carro' && ${range(now - DAY, now + DAY)}`;
        const response = await list(scenario.sessionA, "fuels", { filter });

        assert.deepEqual(idsOf(response), [scenario.fuels.aCar.id]);
        assert.equal(
            (await list(scenario.sessionA, "fuels", { filter: `${filter} && vehicle.type = 'moto'` })).body.totalItems,
            0,
        );
    });
});

describe("incremental loading", () => {
    test("pages of the filtered list come newest first, without gaps or repeats", async () => {
        const vehicle = await make.vehicle({ model: "Paged Hist" });
        const user = await make.user();
        const fuels = [];
        for (let index = 0; index < 5; index++) {
            fuels.push(await make.fuel({ user, vehicle }));
        }
        const filter = "(vehicle.model ~ 'Paged Hist')";

        const first = await list(asSupervisor, "fuels", { filter, page: 1, perPage: 2 });
        const second = await list(asSupervisor, "fuels", { filter, page: 2, perPage: 2 });
        const third = await list(asSupervisor, "fuels", { filter, page: 3, perPage: 2 });

        assert.equal(first.body.totalPages, 3);
        assert.equal(first.body.totalItems, 5);
        assert.deepEqual([first, second, third].map((page) => page.body.items.length), [2, 2, 1]);
        const all = [first, second, third].flatMap(idsOf);
        assert.equal(new Set(all).size, 5);
        assert.deepEqual(all, fuels.map((fuel) => fuel.id).reverse());
    });

    test("a page past the end is empty and still answers 200", async () => {
        const response = await list(asSupervisor, "fuels", { filter: "(vehicle.model ~ 'Onix Hist')", page: 9, perPage: 20 });

        assert.equal(response.status, 200);
        assert.deepEqual(response.body.items, []);
    });
});

describe("what the cards read from the expanded relations", () => {
    test("a driver's own fuel carries the vehicle and the author", async () => {
        const response = await list(scenario.sessionA, "fuels", { expand: "vehicle,user" });
        const item = response.body.items.find((candidate) => candidate.id === scenario.fuels.aCar.id);

        assert.equal(item.expand.vehicle.plate, scenario.car.plate);
        assert.equal(item.expand.vehicle.type, "carro");
        assert.equal(item.expand.user.name, scenario.driverA.name);
    });

    test("a route carries the driver and the vehicle, and the return date and km", async () => {
        const response = await list(asSupervisor, "routes", { filter: 'status = "finalizada"', sort: "-date_return", expand: "user,vehicle" });
        const item = response.body.items.find((candidate) => candidate.id === scenario.routes.bMoto.id);

        assert.equal(item.expand.user.name, scenario.driverB.name);
        assert.equal(item.expand.vehicle.plate, scenario.moto.plate);
        assert.ok(item.date_return);
        assert.equal(item.km_return, 1100);
    });

    test("a complaint carries the driver, the vehicle and the departure km of its route, to a supervisor and to its author", async () => {
        const expand = "route_current.user,route_current.vehicle";
        const asAuthor = await list(scenario.sessionA, "complaints", { expand });
        const asReviewer = await list(asSupervisor, "complaints", { expand });

        for (const response of [asAuthor, asReviewer]) {
            const item = response.body.items.find((candidate) => candidate.id === scenario.complaints.aMoto.id);

            assert.equal(item.expand.route_current.expand.user.name, scenario.driverA.name);
            assert.equal(item.expand.route_current.expand.vehicle.plate, scenario.moto.plate);
            assert.equal(item.expand.route_current.km_departure, 1100);
        }
    });
});

describe("the complaint indicator of a route card (RF19, RB06)", () => {
    const EXPAND = "user,vehicle,complaints_via_route_current";

    /* A driver with three finalized routes: no complaint, a pending one and one that is approved. */
    let driver;
    let session;
    let routes;

    before(async () => {
        driver = await make.user();
        session = await signIn(driver);
        const plain = await make.vehicle({ type: "carro" });
        const pending = await make.vehicle({ type: "van" });
        const approved = await make.vehicle({ type: "moto" });

        routes = {
            plain: await finalize(await make.route({ user: driver, vehicle: plain, km_departure: 500 }), 600),
        };
        const pendingRoute = await make.route({ user: driver, vehicle: pending, km_departure: 500 });
        await make.complaint({ route_current: pendingRoute.id, km_complaint: 520 });
        routes.pending = await finalize(pendingRoute, 600);
        const approvedRoute = await make.route({ user: driver, vehicle: approved, km_departure: 500 });
        routes.complaint = await make.complaint({ route_current: approvedRoute.id, km_complaint: 520 });
        routes.approved = await finalize(approvedRoute, 600);
    });

    /** The finalized routes of the driver, as the app reads them. */
    const readRoutes = (reader) =>
        list(reader, "routes", { filter: 'status = "finalizada"', sort: "-date_return", expand: EXPAND });

    /** One route of a list response. */
    const find = (response, route) => response.body.items.find((item) => item.id === route.id);

    test("a route without a complaint carries no complaint", async () => {
        const item = find(await readRoutes(session), routes.plain);

        assert.equal(item.expand.complaints_via_route_current, undefined);
    });

    test("a route with a pending complaint carries it, to its driver and to a supervisor", async () => {
        for (const reader of [session, asSupervisor]) {
            const item = find(await readRoutes(reader), routes.pending);

            assert.equal(item.expand.complaints_via_route_current.status, "pendente");
        }
    });

    test("after the approval the card reads the corrected departure km and the approved complaint (RB06)", async () => {
        const review = await asSupervisor.patch(`/api/collections/complaints/records/${routes.complaint.id}`, { status: "aprovada" });
        assert.equal(review.status, 200, JSON.stringify(review.body));

        const item = find(await readRoutes(session), routes.approved);

        assert.equal(item.km_departure, 520);
        assert.equal(item.km_return, 600);
        assert.equal(item.expand.complaints_via_route_current.status, "aprovada");
    });
});
