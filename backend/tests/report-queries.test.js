import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { loadAppModule } from "./helpers/app-modules.js";
import { login } from "./helpers/client.js";
import { createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the queries behind the financial report (I-36, RF22). The app filters on the
 * server, reads `cost` and the expanded vehicle of every record and adds them up on the device
 * (`loadReport` in src/services/reports.ts). The filters and the `fields` are sent as they are
 * here, so these tests prove that the server runs them and returns what the sum needs, that the
 * sum of what comes back is the sum of the records created, that inactive vehicles still come
 * (RB12), and that the API rules still decide who reads what: a driver gets only their own records.
 * The sum is not copied: `buildReport` is loaded from the app (src/services/reportTotals.ts), so a
 * change in how the app adds up breaks these tests. The filters are written out the way
 * history-queries.test.js does, because src/services/reports.ts needs the PocketBase client.
 */

/* The fields the report asks for, as in REPORT_FIELDS. */
const REPORT_FIELDS = "id,cost,created,vehicle,expand.vehicle";

/* The three services and the field each one costs under, in the order the report lists them. */
const SERVICES = ["fuels", "oils", "repairs"];

/* The kind each collection has in the app's report. */
const KINDS = { fuels: "fuel", oils: "oil", repairs: "repair" };

/* State shared by the file: one disposable instance, two sessions, the app's sum and the scenario below. */
let pb;
let admin;
let make;
let asSupervisor;
let scenario;
let buildReport;

/** Starts the instance, signs in a supervisor and builds the scenario. */
before(async () => {
    ({ buildReport } = await loadAppModule("services/reportTotals.ts"));
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

const DAY = 24 * 60 * 60 * 1000;

/** The period part of the report filter, as `buildReportFilter` writes it. */
const period = (from, to) => `created >= '${pbDate(new Date(from))}' && created < '${pbDate(new Date(to))}'`;

/** Reads one service the way the app does: filtered by the server, with only the fields the report needs. */
async function read(session, collection, filter) {
    const response = await session.get(
        `/api/collections/${collection}/records?perPage=500&expand=vehicle&fields=${encodeURIComponent(REPORT_FIELDS)}&filter=${encodeURIComponent(filter)}`,
    );
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body.items;
}

/**
 * Reads the three services and adds them up with the app's own `buildReport`, then reshapes the
 * result by vehicle id and in cents, so the assertions below read the figures directly.
 */
async function report(session, filter) {
    const entries = [];

    for (const collection of SERVICES) {
        for (const record of await read(session, collection, filter)) {
            entries.push({ kind: KINDS[collection], vehicle: record.expand.vehicle, cost: record.cost, created: record.created });
        }
    }

    const built = buildReport(entries);
    const byVehicle = {};

    for (const line of built.vehicles) {
        const services = {};
        for (const [collection, kind] of Object.entries(KINDS)) {
            if (line.services[kind].count > 0) {
                services[collection] = Math.round(line.services[kind].total * 100);
            }
        }
        byVehicle[line.vehicle.id] = { plate: line.vehicle.plate, services, cents: Math.round(line.total * 100) };
    }

    return { byVehicle, general: Math.round(built.total * 100) };
}

/*
 * A car and a motorcycle with records of the three services from two drivers, and a van, with an
 * oil change and a repair, that is made inactive after them.
 */
async function buildScenario() {
    const driverA = await make.user();
    const driverB = await make.user();
    const car = await make.vehicle({ type: "carro", model: "Onix Rep" });
    const moto = await make.vehicle({ type: "moto", model: "Titan Rep" });
    const van = await make.vehicle({ type: "van", model: "Fiorino Rep" });

    await make.fuel({ user: driverA, vehicle: car, cost: 100.1 });
    await make.fuel({ user: driverA, vehicle: car, cost: 50.2 });
    await make.oil({ user: driverA, vehicle: car, cost: 250 });
    await make.repair({ user: driverB, vehicle: car, cost: 400.3 });
    await make.fuel({ user: driverA, vehicle: moto, cost: 80.05 });
    await make.repair({ user: driverA, vehicle: moto, cost: 99.99 });
    await make.oil({ user: driverB, vehicle: van, cost: 300.15 });
    await make.repair({ user: driverB, vehicle: van, cost: 1250 });

    const deactivated = await admin.patch(`/api/collections/vehicles/records/${van.id}`, { active: false });
    assert.equal(deactivated.status, 200, JSON.stringify(deactivated.body));

    return { driverA, driverB, sessionA: await signIn(driverA), car, moto, van };
}

describe("what the report reads of each record", () => {
    test("only the cost, the creation date and the vehicle, with the vehicle expanded for the grouping", async () => {
        const [record] = await read(asSupervisor, "fuels", period(Date.now() - DAY, Date.now() + DAY));

        assert.deepEqual(Object.keys(record).sort(), ["cost", "created", "expand", "id", "vehicle"]);
        const vehicle = record.expand.vehicle;
        assert.ok(vehicle.id && vehicle.plate && vehicle.model && vehicle.type);
        assert.equal(typeof vehicle.active, "boolean");
        assert.equal(record.vehicle, vehicle.id);
    });
});

describe("the totals (RF22)", () => {
    const now = Date.now();
    const filter = period(now - DAY, now + DAY);

    test("each service of each vehicle, the vehicle and the general total add up the records created", async () => {
        const { byVehicle, general } = await report(asSupervisor, filter);
        const car = byVehicle[scenario.car.id];
        const moto = byVehicle[scenario.moto.id];

        assert.deepEqual(car.services, { fuels: 15030, oils: 25000, repairs: 40030 });
        assert.equal(car.cents, 80060);
        assert.deepEqual(moto.services, { fuels: 8005, repairs: 9999 });
        assert.equal(moto.cents, 18004);
        assert.equal(general, 80060 + 18004 + 30015 + 125000);
    });

    test("an inactive vehicle with records in the period still comes, with its totals (RB12)", async () => {
        const { byVehicle } = await report(asSupervisor, filter);
        const records = await read(asSupervisor, "oils", filter);
        const van = records.find((record) => record.vehicle === scenario.van.id);

        assert.equal(van.expand.vehicle.active, false);
        assert.deepEqual(byVehicle[scenario.van.id].services, { oils: 30015, repairs: 125000 });
    });
});

describe("the period", () => {
    test("records of the day come in, and a period that ends before them or starts after them leaves them out", async () => {
        const now = Date.now();
        const inside = await report(asSupervisor, period(now - DAY, now + DAY));
        const before = await report(asSupervisor, period(now - 3 * DAY, now - DAY));
        const after = await report(asSupervisor, period(now + DAY, now + 3 * DAY));

        assert.ok(inside.general > 0);
        assert.equal(before.general, 0);
        assert.equal(after.general, 0);
    });

    test("without a period the filter has no date, so every record comes", async () => {
        const all = await report(asSupervisor, "");
        const inside = await report(asSupervisor, period(Date.now() - DAY, Date.now() + DAY));

        assert.equal(all.general, inside.general);
        assert.ok(all.general > 0);
    });

    test("the start is included and the end is left out, so a custom last day is the start of the day after", async () => {
        const [fuel] = await read(asSupervisor, "fuels", period(Date.now() - DAY, Date.now() + DAY));
        const created = new Date((await asSupervisor.get(`/api/collections/fuels/records/${fuel.id}`)).body.created.replace(" ", "T")).getTime();
        const startsAtCreation = await read(asSupervisor, "fuels", period(created, created + DAY));
        const endsAtCreation = await read(asSupervisor, "fuels", period(created - DAY, created));

        assert.ok(startsAtCreation.some((record) => record.id === fuel.id));
        assert.ok(!endsAtCreation.some((record) => record.id === fuel.id));
    });
});

describe("the vehicle and service filters", () => {
    const now = Date.now();
    const base = period(now - DAY, now + DAY);

    test("type narrows to the vehicles of that type, in every service", async () => {
        const { byVehicle } = await report(asSupervisor, `${base} && vehicle.type = 'moto'`);

        assert.deepEqual(Object.keys(byVehicle), [scenario.moto.id]);
        assert.equal(byVehicle[scenario.moto.id].cents, 18004);
    });

    test("the search text finds the model, and the plate with or without the hyphen", async () => {
        const byModel = await report(asSupervisor, `${base} && (vehicle.model ~ 'titan')`);
        const plate = scenario.car.plate;
        const byPlate = await report(asSupervisor, `${base} && (vehicle.model ~ '${plate.replace("-", "")}' || vehicle.plate ~ '${plate}')`);

        assert.deepEqual(Object.keys(byModel.byVehicle), [scenario.moto.id]);
        assert.deepEqual(Object.keys(byPlate.byVehicle), [scenario.car.id]);
    });

    test("a service alone leaves the other two out", async () => {
        const fuels = await read(asSupervisor, "fuels", base);
        const total = fuels.reduce((sum, record) => sum + Math.round(record.cost * 100), 0);

        assert.equal(total, 15030 + 8005);
    });

    test("type, search and period combine", async () => {
        const hit = await report(asSupervisor, `${base} && (vehicle.model ~ 'Onix') && vehicle.type = 'carro'`);
        const miss = await report(asSupervisor, `${base} && (vehicle.model ~ 'Onix') && vehicle.type = 'moto'`);

        assert.deepEqual(Object.keys(hit.byVehicle), [scenario.car.id]);
        assert.equal(miss.general, 0);
    });

    test("an inactive vehicle is found by the same filters", async () => {
        const { byVehicle } = await report(asSupervisor, `${base} && vehicle.type = 'van'`);

        assert.deepEqual(Object.keys(byVehicle), [scenario.van.id]);
    });
});

describe("who reads what", () => {
    const now = Date.now();
    const base = period(now - DAY, now + DAY);

    test("a driver reads only the records they created, so the report cannot show anyone else's costs", async () => {
        const { byVehicle } = await report(scenario.sessionA, base);

        assert.deepEqual(byVehicle[scenario.car.id].services, { fuels: 15030, oils: 25000 });
        assert.deepEqual(byVehicle[scenario.moto.id].services, { fuels: 8005, repairs: 9999 });
        assert.equal(byVehicle[scenario.van.id], undefined);
    });
});
