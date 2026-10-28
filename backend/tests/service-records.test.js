import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { login } from "./helpers/client.js";
import { createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the creation of service records: fuels, oils and repairs (I-19, RB04, RB09, RB12,
 * RB17, RNF05). Every case sends plain requests, without the app, to prove the server holds the
 * rule alone. A refusal is checked by status and, when the app translates it, by `code`
 * (src/services/serverErrors.ts).
 */

/** The body the app sends for each collection (the author is set by the server). */
const BODIES = {
    fuels: (vehicle, overrides = {}) => ({ vehicle: vehicle.id, km_fuel: 1010, type: "etanol", liters: 30.5, cost: 180.9, ...overrides }),
    oils: (vehicle, overrides = {}) => ({ vehicle: vehicle.id, km_oil: 1010, type: "5W30 synthetic", cost: 250, ...overrides }),
    repairs: (vehicle, overrides = {}) => ({ vehicle: vehicle.id, km_repair: 1010, description: "Brakes", cost: 400, ...overrides }),
};

/** The km field of each collection. */
const KM_FIELD = { fuels: "km_fuel", oils: "km_oil", repairs: "km_repair" };

const COLLECTIONS = Object.keys(BODIES);
const path = (collection) => `/api/collections/${collection}/records`;

/** A date far in the past, to prove the server ignores a `created` sent by the client. */
const OLD_DATE = "2000-01-01 00:00:00.000Z";

/* State shared by the file: one disposable instance, a driver and a supervisor, signed in. */
let pb;
let admin;
let make;
let driver;
let supervisor;
let asDriver;
let asSupervisor;

/** Starts the instance and signs in a driver and a supervisor. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    make = createFactories(admin);

    driver = await make.user();
    supervisor = await make.user({ role: "supervisor" });
    asDriver = await login(pb.url, "users", driver.email, driver.password);
    asSupervisor = await login(pb.url, "users", supervisor.email, supervisor.password);
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

/** Reads a record as superuser. */
const read = async (collection, id) => (await admin.get(`${path(collection)}/${id}`)).body;

/** Reads a vehicle as superuser. */
const readVehicle = async (vehicle) => (await admin.get(`/api/collections/vehicles/records/${vehicle.id}`)).body;

/** Total number of records of a collection that point to the vehicle, read as superuser. */
const countFor = async (collection, vehicle) => (await admin.get(`${path(collection)}?filter=vehicle='${vehicle.id}'&perPage=1`)).body.totalItems;

for (const collection of COLLECTIONS) {
    describe(`${collection}: driver and supervisor create records`, () => {
        test("a driver creates a record for an active vehicle, as the author", async () => {
            const vehicle = await make.vehicle();
            const response = await asDriver.post(path(collection), BODIES[collection](vehicle));

            assert.equal(response.status, 200, JSON.stringify(response.body));
            assert.equal(response.body.user, driver.id);
            assert.equal(response.body.vehicle, vehicle.id);
        });

        test("a supervisor creates a record for an active vehicle, as the author", async () => {
            const vehicle = await make.vehicle();
            const response = await asSupervisor.post(path(collection), BODIES[collection](vehicle));

            assert.equal(response.status, 200, JSON.stringify(response.body));
            assert.equal(response.body.user, supervisor.id);
        });

        test("a driver can use a vehicle that has an open route of another driver", async () => {
            const vehicle = await make.vehicle();
            await make.route({ user: await make.user(), vehicle });

            const response = await asDriver.post(path(collection), BODIES[collection](vehicle));
            assert.equal(response.status, 200, JSON.stringify(response.body));
        });
    });

    describe(`${collection}: an inactive vehicle is refused (RB12)`, () => {
        test("a driver and a supervisor get 400 with vehicle_inactive on the vehicle, and nothing is saved", async () => {
            const vehicle = await make.vehicle({ active: false });

            for (const session of [asDriver, asSupervisor]) {
                const response = await session.post(path(collection), BODIES[collection](vehicle));
                assert.equal(response.status, 400, JSON.stringify(response.body));
                assert.equal(response.body.data.vehicle.code, "vehicle_inactive");
            }
            assert.equal(await countFor(collection, vehicle), 0);
        });

        test("the superuser is refused too", async () => {
            const vehicle = await make.vehicle({ active: false });
            const response = await admin.post(path(collection), { user: driver.id, ...BODIES[collection](vehicle) });

            assert.equal(response.status, 400);
            assert.equal(response.body.data.vehicle.code, "vehicle_inactive");
        });

        test("records saved before the inactivation stay in the history", async () => {
            const vehicle = await make.vehicle();
            const saved = await asDriver.post(path(collection), BODIES[collection](vehicle));
            assert.equal(saved.status, 200);

            assert.equal((await admin.patch(`/api/collections/vehicles/records/${vehicle.id}`, { active: false })).status, 200);

            const list = await asDriver.get(`${path(collection)}?filter=vehicle='${vehicle.id}'`);
            assert.deepEqual(list.body.items.map((item) => item.id), [saved.body.id]);
            assert.equal((await asDriver.post(path(collection), BODIES[collection](vehicle))).status, 400);
        });

        test("the vehicle accepts records again once it is reactivated", async () => {
            const vehicle = await make.vehicle({ active: false });
            assert.equal((await asDriver.post(path(collection), BODIES[collection](vehicle))).status, 400);

            assert.equal((await admin.patch(`/api/collections/vehicles/records/${vehicle.id}`, { active: true })).status, 200);
            assert.equal((await asDriver.post(path(collection), BODIES[collection](vehicle))).status, 200);
        });

        test("a vehicle that does not exist is refused by the relation field", async () => {
            const response = await asDriver.post(path(collection), BODIES[collection]({ id: "doesnotexist00" }));

            assert.equal(response.status, 400);
            assert.ok(response.body.data.vehicle, JSON.stringify(response.body));
            assert.notEqual(response.body.data.vehicle.code, "vehicle_inactive");
        });
    });

    describe(`${collection}: the author is the signed-in user`, () => {
        test("the user sent in the body is overwritten, for a driver and for a supervisor", async () => {
            const vehicle = await make.vehicle();
            const other = await make.user();

            for (const [session, user] of [[asDriver, driver], [asSupervisor, supervisor]]) {
                const response = await session.post(path(collection), BODIES[collection](vehicle, { user: other.id }));
                assert.equal(response.status, 200, JSON.stringify(response.body));
                assert.equal(response.body.user, user.id);
                assert.equal((await read(collection, response.body.id)).user, user.id);
            }
        });

        test("a body without user works, because the server fills it", async () => {
            const vehicle = await make.vehicle();
            const response = await asDriver.post(path(collection), BODIES[collection](vehicle));

            assert.equal(response.status, 200, JSON.stringify(response.body));
            assert.equal(response.body.user, driver.id);
        });

        test("a user that does not exist in the body is overwritten as well", async () => {
            const vehicle = await make.vehicle();
            const response = await asDriver.post(path(collection), BODIES[collection](vehicle, { user: "doesnotexist00" }));

            assert.equal(response.status, 200, JSON.stringify(response.body));
            assert.equal(response.body.user, driver.id);
        });
    });

    describe(`${collection}: the km is informative (RB04, RB09)`, () => {
        test("a km above, below or equal to the odometer leaves the odometer as it was", async () => {
            const vehicle = await make.vehicle({ odometer: 1000 });

            for (const km of [5000, 10, 1000]) {
                const response = await asDriver.post(path(collection), BODIES[collection](vehicle, { [KM_FIELD[collection]]: km }));
                assert.equal(response.status, 200, JSON.stringify(response.body));
                assert.equal(response.body[KM_FIELD[collection]], km);
                assert.equal((await readVehicle(vehicle)).odometer, 1000);
            }
        });

        test("an odometer sent in the body is not applied to the vehicle", async () => {
            const vehicle = await make.vehicle({ odometer: 1000 });
            const response = await asSupervisor.post(path(collection), BODIES[collection](vehicle, { odometer: 9999 }));

            assert.equal(response.status, 200, JSON.stringify(response.body));
            assert.equal((await readVehicle(vehicle)).odometer, 1000);
        });
    });

    describe(`${collection}: nothing is deleted by a user (RB17)`, () => {
        test("the author and the supervisor cannot delete a record", async () => {
            const vehicle = await make.vehicle();
            const created = await asDriver.post(path(collection), BODIES[collection](vehicle));
            assert.equal(created.status, 200);

            for (const session of [asDriver, asSupervisor]) {
                const response = await session.delete(`${path(collection)}/${created.body.id}`);
                assert.equal(response.status, 403);
            }
            assert.equal((await read(collection, created.body.id)).id, created.body.id);
        });
    });

    describe(`${collection}: the creation date is the server's (RNF05)`, () => {
        test("a created date sent by a driver or a supervisor is ignored", async () => {
            const vehicle = await make.vehicle();
            const before = Date.now() - 5000;

            for (const session of [asDriver, asSupervisor]) {
                const response = await session.post(path(collection), BODIES[collection](vehicle, { created: OLD_DATE }));
                assert.equal(response.status, 200, JSON.stringify(response.body));
                assert.ok(new Date(response.body.created).getTime() >= before, response.body.created);
            }
        });
    });
}

describe("fuels: the values of the form (RF11, RB16)", () => {
    test("the five fields of the form create the record with every value as sent", async () => {
        const vehicle = await make.vehicle();
        const response = await asDriver.post(path("fuels"), BODIES.fuels(vehicle, { km_fuel: 999999.99, type: "diesel", liters: 0.01, cost: 0.01 }));

        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal(response.body.km_fuel, 999999.99);
        assert.equal(response.body.type, "diesel");
        assert.equal(response.body.liters, 0.01);
        assert.equal(response.body.cost, 0.01);
    });

    test("each fuel type of the form is accepted and any other is refused", async () => {
        const vehicle = await make.vehicle();

        for (const type of ["gasolina", "aditivada", "etanol", "diesel"]) {
            assert.equal((await asDriver.post(path("fuels"), BODIES.fuels(vehicle, { type }))).status, 200, type);
        }

        const refused = await asDriver.post(path("fuels"), BODIES.fuels(vehicle, { type: "gnv" }));
        assert.equal(refused.status, 400);
        assert.equal(refused.body.data.type.code, "validation_invalid_value");
    });

    test("km, liters and cost are required, and a zero counts as missing", async () => {
        const vehicle = await make.vehicle();

        for (const field of ["km_fuel", "liters", "cost"]) {
            for (const value of [0, null]) {
                const response = await asDriver.post(path("fuels"), BODIES.fuels(vehicle, { [field]: value }));
                assert.equal(response.status, 400, `${field}=${value}`);
                assert.equal(response.body.data[field].code, "validation_required", `${field}=${value}`);
            }
        }
        assert.equal(await countFor("fuels", vehicle), 0);
    });

    test("a negative value, a value above 999.999,99 and a third decimal are refused", async () => {
        const vehicle = await make.vehicle();
        const cases = [
            [-1, "validation_min_number_constraint"],
            [1000000, "validation_max_number_constraint"],
            [10.123, "validation_too_many_decimals"],
        ];

        for (const field of ["km_fuel", "liters", "cost"]) {
            for (const [value, code] of cases) {
                const response = await asDriver.post(path("fuels"), BODIES.fuels(vehicle, { [field]: value }));
                assert.equal(response.status, 400, `${field}=${value}`);
                assert.equal(response.body.data[field].code, code, `${field}=${value}`);
            }
        }
        assert.equal(await countFor("fuels", vehicle), 0);
    });
});
