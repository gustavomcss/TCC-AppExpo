import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { loadAppModule } from "./helpers/app-modules.js";
import { login } from "./helpers/client.js";
import { createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the queries behind the additional reports (I-38, RF23): km driven and complaints.
 * The app filters on the server, reads a few fields and counts or adds on the device (`loadKmReport`
 * and `loadComplaintReport` in src/services/reports.ts). The filters, the `fields` and the
 * `expand` are sent as they are here, so these tests prove that the server runs them and returns
 * what the grouping needs, that what comes back adds up to what the scenario created and to what
 * the history lists, that inactive vehicles still come (RB12), that the km follow a correction by
 * an approved complaint (RB06), and that the API rules still decide who reads what. The sums are
 * not copied: `buildKmReport` and `buildComplaintReport` are loaded from the app
 * (src/services/kmTotals.ts and complaintTotals.ts), so a change in how the app adds up breaks
 * these tests.
 */

const ROUTES = "/api/collections/routes/records";
const COMPLAINTS = "/api/collections/complaints/records";

/* The fields and the expand each report asks for, as in KM_FIELDS and COMPLAINT_FIELDS. */
const KM_FIELDS = "id,km_departure,km_return,vehicle,expand.vehicle";
const COMPLAINT_FIELDS = "id,status,expand.route_current";
const COMPLAINT_EXPAND = "route_current.user,route_current.vehicle";

const DAY = 24 * 60 * 60 * 1000;

/* State shared by the file: one disposable instance, two sessions and the scenario below. */
let pb;
let admin;
let make;
let asSupervisor;
let scenario;
let buildKmReport;
let buildComplaintReport;

/** Starts the instance, signs in a supervisor and builds the scenario. */
before(async () => {
    ({ buildKmReport } = await loadAppModule("services/kmTotals.ts"));
    ({ buildComplaintReport } = await loadAppModule("services/complaintTotals.ts"));
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

/** A date as pb.filter writes it into a filter: "2026-10-22 08:15:00.000Z". */
const pbDate = (date) => date.toISOString().replace("T", " ");

/** Finalizes an open route as superuser: the hook stamps `date_return` and moves the odometer. */
async function finalize(route, kmReturn) {
    const response = await admin.patch(`${ROUTES}/${route.id}`, { status: "finalizada", km_return: kmReturn });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body;
}

/** Reviews a complaint as the supervisor does. */
async function review(complaint, status) {
    const response = await asSupervisor.patch(`${COMPLAINTS}/${complaint.id}`, { status });
    assert.equal(response.status, 200, JSON.stringify(response.body));
}

/** Files a complaint on a fresh open route and finalizes the route, so the next route can open. */
async function fileComplaint({ user, vehicle, kmDeparture, kmComplaint, kmReturn }) {
    const open = await make.route({ user, vehicle, km_departure: kmDeparture });
    const complaint = await make.complaint({ route_current: open.id, km_complaint: kmComplaint });
    const route = await finalize(open, kmReturn);
    return { complaint, route };
}

/** The km part of the report filter, as `buildKmFilter` writes it. */
const kmPeriod = (from, to) => `date_return >= '${pbDate(new Date(from))}' && date_return < '${pbDate(new Date(to))}'`;

/** The period part of the complaints filter, as `buildComplaintFilter` writes it. */
const complaintPeriod = (from, to) => `created >= '${pbDate(new Date(from))}' && created < '${pbDate(new Date(to))}'`;

/** Reads the routes the way the km report does: filtered by the server, with only the fields it needs. */
async function readKm(session, extra = "") {
    const filter = `status = "finalizada"${extra ? ` && ${extra}` : ""}`;
    const response = await session.get(
        `${ROUTES}?perPage=500&expand=vehicle&fields=${encodeURIComponent(KM_FIELDS)}&filter=${encodeURIComponent(filter)}`,
    );
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body.items;
}

/** Adds the km of the routes with the app's `buildKmReport`, reshaped by vehicle id and in hundredths. */
function kmReport(routes) {
    const built = buildKmReport(routes.map((route) => ({ vehicle: route.expand.vehicle, kmDeparture: route.km_departure, kmReturn: route.km_return })));
    const byVehicle = {};

    for (const line of built.vehicles) {
        byVehicle[line.vehicle.id] = { plate: line.vehicle.plate, routes: line.routes, hundredths: Math.round(line.km * 100) };
    }

    return { byVehicle, general: Math.round(built.km * 100) };
}

/** Reads the complaints the way the complaints report does: filtered, expanded to the route, with only the fields it needs. */
async function readComplaints(session, filter = "") {
    const response = await session.get(
        `${COMPLAINTS}?perPage=500&expand=${encodeURIComponent(COMPLAINT_EXPAND)}&fields=${encodeURIComponent(COMPLAINT_FIELDS)}${filter ? `&filter=${encodeURIComponent(filter)}` : ""}`,
    );
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body.items;
}

/** Counts the complaints with the app's `buildComplaintReport`, reshaped by vehicle id and by driver id. */
function complaintReport(items) {
    const built = buildComplaintReport(
        items.map((item) => ({ status: item.status, vehicle: item.expand.route_current.expand.vehicle, driver: item.expand.route_current.expand.user })),
    );
    const byVehicle = {};
    const byDriver = {};

    for (const line of built.vehicles) {
        byVehicle[line.vehicle.id] = { plate: line.vehicle.plate, ...line.counts };
    }
    for (const line of built.drivers) {
        byDriver[line.driver.id] = { name: line.driver.name, ...line.counts };
    }

    return { counts: built.counts, byVehicle, byDriver };
}

/*
 * Km: a car with two routes of one driver, a motorcycle with one of another, a van with one that
 * is made inactive afterwards, a route closed administratively and one left open.
 * Complaints: a pending one and a rejected one by the first driver, an approved one and a pending
 * one by the second, each on its own vehicle so that no correction touches another route.
 */
async function buildScenario() {
    const driverA = await make.user();
    const driverB = await make.user();
    const car = await make.vehicle({ type: "carro", model: "Onix Km" });
    const moto = await make.vehicle({ type: "moto", model: "Titan Km" });
    const van = await make.vehicle({ type: "van", model: "Fiorino Km" });

    const carFirst = await finalize(await make.route({ user: driverA, vehicle: car, km_departure: 1000 }), 1100);
    const carSecond = await finalize(await make.route({ user: driverA, vehicle: car, km_departure: 1100 }), 1150.5);
    const motoOnly = await finalize(await make.route({ user: driverB, vehicle: moto, km_departure: 500 }), 730.25);
    const vanOnly = await finalize(await make.route({ user: driverB, vehicle: van, km_departure: 200 }), 300.1);
    const closedRoute = await make.route({ user: driverA, vehicle: moto, km_departure: 730.25 });
    assert.equal((await admin.patch(`${ROUTES}/${closedRoute.id}`, { status: "encerrada" })).status, 200);
    const openRoute = await make.route({ user: driverA, vehicle: van, km_departure: 300.1 });

    const deactivated = await admin.patch(`/api/collections/vehicles/records/${van.id}`, { active: false });
    assert.equal(deactivated.status, 400, "the van has an open route, so it cannot be made inactive yet");
    await admin.patch(`${ROUTES}/${openRoute.id}`, { status: "encerrada" });
    assert.equal((await admin.patch(`/api/collections/vehicles/records/${van.id}`, { active: false })).status, 200);

    const carC = await make.vehicle({ type: "carro", model: "Onix Den" });
    const motoC = await make.vehicle({ type: "moto", model: "Titan Den" });
    const vanC = await make.vehicle({ type: "van", model: "Fiorino Den" });
    const pendingA = await fileComplaint({ user: driverA, vehicle: carC, kmDeparture: 2000, kmComplaint: 2040, kmReturn: 2100 });
    const rejectedA = await fileComplaint({ user: driverA, vehicle: motoC, kmDeparture: 3000, kmComplaint: 3040, kmReturn: 3100 });
    const approvedB = await fileComplaint({ user: driverB, vehicle: vanC, kmDeparture: 4000, kmComplaint: 4040, kmReturn: 4100 });
    const pendingB = await fileComplaint({ user: driverB, vehicle: motoC, kmDeparture: 3100, kmComplaint: 3140, kmReturn: 3200 });
    await review(rejectedA.complaint, "reprovada");
    await review(approvedB.complaint, "aprovada");
    assert.equal((await admin.patch(`/api/collections/vehicles/records/${vanC.id}`, { active: false })).status, 200);

    return {
        driverA,
        driverB,
        sessionA: await signIn(driverA),
        sessionB: await signIn(driverB),
        car,
        moto,
        van,
        carC,
        motoC,
        vanC,
        routes: { carFirst, carSecond, motoOnly, vanOnly, closedRoute, openRoute },
        complaints: { pendingA, rejectedA, approvedB, pendingB },
    };
}

describe("what the km report reads of each route", () => {
    test("only the two odometer readings and the vehicle, with the vehicle expanded for the grouping", async () => {
        const [route] = await readKm(asSupervisor);

        assert.deepEqual(Object.keys(route).sort(), ["expand", "id", "km_departure", "km_return", "vehicle"]);
        const vehicle = route.expand.vehicle;
        assert.ok(vehicle.id && vehicle.plate && vehicle.model && vehicle.type);
        assert.equal(typeof vehicle.active, "boolean");
        assert.equal(route.vehicle, vehicle.id);
    });
});

describe("the km driven (RF23)", () => {
    const now = Date.now();
    const period = kmPeriod(now - DAY, now + DAY);

    test("each vehicle and the general total add up the km of its finalized routes, in hundredths", async () => {
        const { byVehicle, general } = kmReport(await readKm(asSupervisor, period));
        const { car, moto, van, carC, motoC, vanC } = scenario;

        assert.deepEqual(byVehicle[car.id], { plate: car.plate, routes: 2, hundredths: 10000 + 5050 });
        assert.deepEqual(byVehicle[moto.id], { plate: moto.plate, routes: 1, hundredths: 23025 });
        assert.deepEqual(byVehicle[van.id], { plate: van.plate, routes: 1, hundredths: 10010 });

        /* The routes of the complaints scenario are in the period too: 100 + 100 + 100 + 60 km (the approved one is corrected). */
        const others = [carC, motoC, vanC].reduce((sum, vehicle) => sum + byVehicle[vehicle.id].hundredths, 0);
        assert.equal(others, 10000 + (10000 + 10000) + 6000);
        assert.equal(general, 15050 + 23025 + 10010 + others);
    });

    test("only finalized routes count: the one closed administratively and the open one stay out (RB10)", async () => {
        const routes = await readKm(asSupervisor, period);
        const ids = routes.map((route) => route.id);

        assert.ok(!ids.includes(scenario.routes.closedRoute.id));
        assert.ok(!ids.includes(scenario.routes.openRoute.id));
        assert.ok(ids.includes(scenario.routes.carFirst.id));
    });

    test("the km of a route are the ones the history shows on its card, and the report adds up the same routes", async () => {
        const history = await asSupervisor.get(
            `${ROUTES}?perPage=500&sort=-date_return&filter=${encodeURIComponent(`status = "finalizada" && ${period}`)}`,
        );
        const fromHistory = history.body.items.reduce((sum, route) => sum + (Math.round(route.km_return * 100) - Math.round(route.km_departure * 100)), 0);
        const { general } = kmReport(await readKm(asSupervisor, period));

        assert.equal(history.status, 200, JSON.stringify(history.body));
        assert.ok(general > 0);
        assert.equal(general, fromHistory);
    });

    test("an inactive vehicle with routes in the period still comes, with its km (RB12)", async () => {
        const routes = await readKm(asSupervisor, period);
        const van = routes.find((route) => route.vehicle === scenario.van.id);

        assert.equal(van.expand.vehicle.active, false);
    });
});

describe("the period and the vehicle type of the km report", () => {
    test("a route is placed in the period by its return, and a period that ends before it or starts after it leaves it out", async () => {
        const now = Date.now();
        const inside = kmReport(await readKm(asSupervisor, kmPeriod(now - DAY, now + DAY)));
        const before = kmReport(await readKm(asSupervisor, kmPeriod(now - 3 * DAY, now - DAY)));
        const after = kmReport(await readKm(asSupervisor, kmPeriod(now + DAY, now + 3 * DAY)));

        assert.ok(inside.general > 0);
        assert.equal(before.general, 0);
        assert.equal(after.general, 0);
    });

    test("without a period the filter has no date, so every finalized route comes", async () => {
        const all = kmReport(await readKm(asSupervisor));
        const inside = kmReport(await readKm(asSupervisor, kmPeriod(Date.now() - DAY, Date.now() + DAY)));

        assert.equal(all.general, inside.general);
    });

    test("the type narrows to the vehicles of that type", async () => {
        const moto = kmReport(await readKm(asSupervisor, `vehicle.type = 'moto' && vehicle.model ~ 'Km'`));

        assert.deepEqual(Object.keys(moto.byVehicle), [scenario.moto.id]);
        assert.equal(moto.general, 23025);
    });

    test("a driver reads only the routes of their own, so the report cannot show anyone else's km", async () => {
        const { byVehicle } = kmReport(await readKm(scenario.sessionA, kmPeriod(Date.now() - DAY, Date.now() + DAY)));

        assert.equal(byVehicle[scenario.car.id].hundredths, 15050);
        assert.equal(byVehicle[scenario.moto.id], undefined);
        assert.equal(byVehicle[scenario.van.id], undefined);
    });
});

describe("the km after a complaint is approved (RB06)", () => {
    test("the route of an approved complaint counts from the corrected departure km, as the history shows it", async () => {
        const route = scenario.complaints.approvedB.route;
        const read = await readKm(asSupervisor, `vehicle = '${scenario.vanC.id}'`);
        const [corrected] = read;

        assert.equal(read.length, 1);
        assert.equal(corrected.id, route.id);
        assert.equal(corrected.km_departure, 4040);
        assert.equal(kmReport(read).general, 6000);
    });
});

describe("what the complaints report reads of each complaint", () => {
    test("the situation and the route with its driver and vehicle, which is all the grouping needs", async () => {
        const [item] = await readComplaints(asSupervisor);
        const route = item.expand.route_current;

        assert.deepEqual(Object.keys(item).sort(), ["expand", "id", "status"]);
        assert.ok(route.expand.user.id && route.expand.user.name);
        assert.ok(["motorista", "supervisor"].includes(route.expand.user.role), "the report prints the role under the name");
        assert.ok(route.expand.vehicle.id && route.expand.vehicle.plate && route.expand.vehicle.model && route.expand.vehicle.type);
        assert.equal(typeof route.expand.vehicle.active, "boolean");
    });
});

describe("the complaints by situation, vehicle and driver (RF23)", () => {
    const now = Date.now();
    const period = complaintPeriod(now - DAY, now + DAY);

    test("the counts by situation add up the complaints created", async () => {
        const { counts } = complaintReport(await readComplaints(asSupervisor, period));

        assert.deepEqual(counts, { pendente: 2, aprovada: 1, reprovada: 1 });
    });

    test("each vehicle counts the complaints filed on its routes, and an inactive vehicle still comes (RB12)", async () => {
        const items = await readComplaints(asSupervisor, period);
        const { byVehicle } = complaintReport(items);
        const { carC, motoC, vanC } = scenario;

        assert.deepEqual(byVehicle[carC.id], { plate: carC.plate, pendente: 1, aprovada: 0, reprovada: 0 });
        assert.deepEqual(byVehicle[motoC.id], { plate: motoC.plate, pendente: 1, aprovada: 0, reprovada: 1 });
        assert.deepEqual(byVehicle[vanC.id], { plate: vanC.plate, pendente: 0, aprovada: 1, reprovada: 0 });
        assert.equal(items.find((item) => item.expand.route_current.vehicle === vanC.id).expand.route_current.expand.vehicle.active, false);
    });

    test("each driver counts the complaints of their own routes, since a complaint has no author of its own", async () => {
        const { byDriver } = complaintReport(await readComplaints(asSupervisor, period));
        const { driverA, driverB } = scenario;

        assert.deepEqual(byDriver[driverA.id], { name: driverA.name, pendente: 1, aprovada: 0, reprovada: 1 });
        assert.deepEqual(byDriver[driverB.id], { name: driverB.name, pendente: 1, aprovada: 1, reprovada: 0 });
    });

    test("the totals of the vehicles and of the drivers both add up to the general total", async () => {
        const { counts, byVehicle, byDriver } = complaintReport(await readComplaints(asSupervisor, period));
        const total = counts.pendente + counts.aprovada + counts.reprovada;
        const sum = (groups) => Object.values(groups).reduce((all, group) => all + group.pendente + group.aprovada + group.reprovada, 0);

        assert.equal(total, 4);
        assert.equal(sum(byVehicle), total);
        assert.equal(sum(byDriver), total);
    });
});

describe("the period and the vehicle type of the complaints report", () => {
    const now = Date.now();
    const period = complaintPeriod(now - DAY, now + DAY);

    test("a complaint is placed in the period by its creation, and a period that ends before it or starts after it leaves it out", async () => {
        const before = await readComplaints(asSupervisor, complaintPeriod(now - 3 * DAY, now - DAY));
        const after = await readComplaints(asSupervisor, complaintPeriod(now + DAY, now + 3 * DAY));

        assert.equal(before.length, 0);
        assert.equal(after.length, 0);
    });

    test("the vehicle type is reached through the route of the complaint", async () => {
        const moto = complaintReport(await readComplaints(asSupervisor, `${period} && route_current.vehicle.type = 'moto'`));

        assert.deepEqual(Object.keys(moto.byVehicle), [scenario.motoC.id]);
        assert.deepEqual(moto.counts, { pendente: 1, aprovada: 0, reprovada: 1 });
    });

    test("period and type combine", async () => {
        const hit = await readComplaints(asSupervisor, `${period} && route_current.vehicle.type = 'moto'`);
        const miss = await readComplaints(asSupervisor, `${period} && route_current.vehicle.type = 'caminhao'`);

        assert.equal(hit.length, 2);
        assert.equal(miss.length, 0);
    });

    test("a driver reads only the complaints of their own routes, so the report cannot show anyone else's", async () => {
        const { counts, byDriver } = complaintReport(await readComplaints(scenario.sessionA, period));

        assert.deepEqual(counts, { pendente: 1, aprovada: 0, reprovada: 1 });
        assert.deepEqual(Object.keys(byDriver), [scenario.driverA.id]);
    });
});
