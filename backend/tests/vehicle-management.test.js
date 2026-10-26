import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { login } from "./helpers/client.js";
import { createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for editing, deleting and inactivating vehicles (I-17, RB09, RB12). The app confirms
 * and explains, but the server is what refuses: each case sends plain requests, without the app.
 * The refusal of a deletion is checked by its `code`, because the app translates it into the
 * advice to inactivate the vehicle (src/services/serverErrors.ts).
 */

const PATH = "/api/collections/vehicles/records";

/* State shared by the file: one disposable instance, a supervisor, a driver and factories. */
let pb;
let admin;
let make;
let asSupervisor;
let asDriver;
let driver;

/** Starts the instance and signs in a supervisor and a driver. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    make = createFactories(admin);

    const supervisorUser = await make.user({ role: "supervisor" });
    driver = await make.user();
    asSupervisor = await login(pb.url, "users", supervisorUser.email, supervisorUser.password);
    asDriver = await login(pb.url, "users", driver.email, driver.password);
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

/** Reads a vehicle as superuser. */
const read = async (vehicle) => (await admin.get(`${PATH}/${vehicle.id}`)).body;

/** Whether the vehicle still exists. */
const exists = async (vehicle) => (await admin.get(`${PATH}/${vehicle.id}`)).status === 200;

/** An open route of a driver of its own, since a driver has at most one open route (RB02). */
const openRoute = async (vehicle) => make.route({ user: await make.user(), vehicle });

describe("the supervisor edits plate, model and type (RF06)", () => {
    test("the three fields change and the odometer stays", async () => {
        const vehicle = await make.vehicle({ odometer: 1234.5 });
        const response = await asSupervisor.patch(`${PATH}/${vehicle.id}`, { plate: "NEW-1A23", model: "Updated", type: "van" });

        assert.equal(response.status, 200);
        assert.equal(response.body.plate, "NEW-1A23");
        assert.equal(response.body.model, "Updated");
        assert.equal(response.body.type, "van");
        assert.equal(response.body.odometer, 1234.5);
    });

    test("a plate out of the AAA-0A00 format is refused on edit too", async () => {
        const vehicle = await make.vehicle();
        const response = await asSupervisor.patch(`${PATH}/${vehicle.id}`, { plate: "abc1234" });

        assert.equal(response.status, 400);
        assert.equal(response.body.data.plate.code, "validation_invalid_format");
        assert.equal((await read(vehicle)).plate, vehicle.plate);
    });

    test("a type outside carro, moto, caminhao and van is refused", async () => {
        const vehicle = await make.vehicle();
        const response = await asSupervisor.patch(`${PATH}/${vehicle.id}`, { type: "bike" });

        assert.equal(response.status, 400);
        assert.ok(response.body.data.type);
        assert.equal((await read(vehicle)).type, vehicle.type);
    });

    test("an empty model is refused", async () => {
        const vehicle = await make.vehicle();
        const response = await asSupervisor.patch(`${PATH}/${vehicle.id}`, { model: "" });

        assert.equal(response.status, 400);
        assert.equal(response.body.data.model.code, "validation_required");
    });
});

describe("the current km is not edited (RB09)", () => {
    test("a request that changes the odometer along with other fields is refused as a whole", async () => {
        const vehicle = await make.vehicle({ odometer: 1000 });
        const response = await asSupervisor.patch(`${PATH}/${vehicle.id}`, { model: "Sneaky", odometer: 5 });

        assert.equal(response.status, 404);
        const stored = await read(vehicle);
        assert.equal(stored.odometer, 1000);
        assert.equal(stored.model, vehicle.model);
    });

    test("the km of a vehicle with a finalized route is not editable either", async () => {
        const vehicle = await make.vehicle({ odometer: 2000 });
        await make.route({ user: driver, vehicle, status: "finalizada", km_departure: 1500, km_return: 2000 });
        const response = await asSupervisor.patch(`${PATH}/${vehicle.id}`, { odometer: 1500 });

        assert.equal(response.status, 404);
        assert.equal((await read(vehicle)).odometer, 2000);
    });
});

describe("a vehicle without records is deleted (RF06)", () => {
    test("the supervisor deletes it", async () => {
        const vehicle = await make.vehicle();

        assert.equal((await asSupervisor.delete(`${PATH}/${vehicle.id}`)).status, 204);
        assert.equal(await exists(vehicle), false);
    });

    test("a driver does not", async () => {
        const vehicle = await make.vehicle();
        const response = await asDriver.delete(`${PATH}/${vehicle.id}`);

        assert.ok([403, 404].includes(response.status), `status ${response.status}`);
        assert.equal(await exists(vehicle), true);
    });

    test("an inactive vehicle without records is deleted too", async () => {
        const vehicle = await make.vehicle({ active: false });

        assert.equal((await asSupervisor.delete(`${PATH}/${vehicle.id}`)).status, 204);
    });
});

describe("a vehicle with records is not deleted, it is inactivated (RB12)", () => {
    const records = {
        routes: (vehicle) => openRoute(vehicle),
        fuels: (vehicle) => make.fuel({ user: driver, vehicle }),
        oils: (vehicle) => make.oil({ user: driver, vehicle }),
        repairs: (vehicle) => make.repair({ user: driver, vehicle }),
    };

    for (const [collection, create] of Object.entries(records)) {
        test(`${collection}: refused with vehicle_has_records, for the supervisor and the superuser`, async () => {
            const vehicle = await make.vehicle();
            await create(vehicle);

            for (const session of [asSupervisor, admin]) {
                const response = await session.delete(`${PATH}/${vehicle.id}`);

                assert.equal(response.status, 400);
                assert.equal(response.body.data.id.code, "vehicle_has_records");
                assert.equal(await exists(vehicle), true);
            }
        });
    }

    test("a vehicle with a complaint is not deleted, through its route", async () => {
        const vehicle = await make.vehicle();
        const route = await openRoute(vehicle);
        await make.complaint({ route_current: route.id });

        assert.equal((await asSupervisor.delete(`${PATH}/${vehicle.id}`)).status, 400);
        assert.equal(await exists(vehicle), true);
    });

    test("a vehicle whose only record is of another vehicle's is still deleted", async () => {
        const other = await make.vehicle();
        const vehicle = await make.vehicle();
        await make.fuel({ user: driver, vehicle: other });

        assert.equal((await asSupervisor.delete(`${PATH}/${vehicle.id}`)).status, 204);
        assert.equal(await exists(other), true);
    });

    test("the supervisor inactivates and reactivates it, and every record stays", async () => {
        const vehicle = await make.vehicle();
        const route = await make.route({ user: driver, vehicle, status: "finalizada", km_departure: 1000, km_return: 1100 });
        const fuel = await make.fuel({ user: driver, vehicle });

        const off = await asSupervisor.patch(`${PATH}/${vehicle.id}`, { active: false });
        assert.equal(off.status, 200);
        assert.equal(off.body.active, false);
        assert.equal((await admin.get(`/api/collections/routes/records/${route.id}`)).body.vehicle, vehicle.id);
        assert.equal((await admin.get(`/api/collections/fuels/records/${fuel.id}`)).body.vehicle, vehicle.id);

        const on = await asSupervisor.patch(`${PATH}/${vehicle.id}`, { active: true });
        assert.equal(on.status, 200);
        assert.equal(on.body.active, true);
    });

    test("an inactive vehicle is still listed and viewed, so the history keeps it", async () => {
        const vehicle = await make.vehicle({ active: false });
        await make.fuel({ user: driver, vehicle });

        for (const session of [asSupervisor, asDriver]) {
            const list = await session.get(`${PATH}?perPage=200&filter=${encodeURIComponent(`id = "${vehicle.id}"`)}`);
            assert.equal(list.body.items.length, 1);
            assert.equal((await session.get(`${PATH}/${vehicle.id}`)).status, 200);
        }
    });

    test("a driver cannot inactivate or reactivate a vehicle", async () => {
        const vehicle = await make.vehicle();
        const response = await asDriver.patch(`${PATH}/${vehicle.id}`, { active: false });

        assert.ok([403, 404].includes(response.status), `status ${response.status}`);
        assert.equal((await read(vehicle)).active, true);
    });
});

describe("a vehicle with an open route is not inactivated (RB12)", () => {
    test("refused with vehicle_has_open_route on active, for the supervisor and the superuser", async () => {
        const vehicle = await make.vehicle();
        await openRoute(vehicle);

        for (const session of [asSupervisor, admin]) {
            const response = await session.patch(`${PATH}/${vehicle.id}`, { active: false });

            assert.equal(response.status, 400);
            assert.equal(response.body.data.active.code, "vehicle_has_open_route");
            assert.equal((await read(vehicle)).active, true);
        }
    });

    test("the other fields of that vehicle are still edited", async () => {
        const vehicle = await make.vehicle();
        await openRoute(vehicle);
        const response = await asSupervisor.patch(`${PATH}/${vehicle.id}`, { model: "Renamed" });

        assert.equal(response.status, 200);
        assert.equal(response.body.model, "Renamed");
    });

    test("a request that edits fields and inactivates is refused as a whole", async () => {
        const vehicle = await make.vehicle();
        await openRoute(vehicle);
        const response = await asSupervisor.patch(`${PATH}/${vehicle.id}`, { model: "Renamed", active: false });

        assert.equal(response.status, 400);
        const stored = await read(vehicle);
        assert.equal(stored.model, vehicle.model);
        assert.equal(stored.active, true);
    });

    for (const status of ["finalizada", "encerrada"]) {
        test(`a ${status} route does not block it`, async () => {
            const vehicle = await make.vehicle();
            await make.route({ user: driver, vehicle, status, km_departure: 1000, km_return: 1100 });

            assert.equal((await asSupervisor.patch(`${PATH}/${vehicle.id}`, { active: false })).status, 200);
        });
    }

    test("an open route of another vehicle does not block it", async () => {
        const other = await make.vehicle();
        const vehicle = await make.vehicle();
        await openRoute(other);

        assert.equal((await asSupervisor.patch(`${PATH}/${vehicle.id}`, { active: false })).status, 200);
    });

    test("reactivating, and saving one that is already inactive, are not affected", async () => {
        const vehicle = await make.vehicle();
        const route = await openRoute(vehicle);
        await admin.patch(`/api/collections/routes/records/${route.id}`, { status: "encerrada" });
        await admin.patch(`${PATH}/${vehicle.id}`, { active: false });
        await admin.patch(`/api/collections/routes/records/${route.id}`, { status: "aberta" });

        assert.equal((await asSupervisor.patch(`${PATH}/${vehicle.id}`, { model: "Same state", active: false })).status, 200);
        assert.equal((await asSupervisor.patch(`${PATH}/${vehicle.id}`, { active: true })).status, 200);
    });
});
