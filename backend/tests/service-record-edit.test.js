import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { login } from "./helpers/client.js";
import { createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the edit rules of the service records: fuels, oils and repairs (I-31, RB04, RB16,
 * RB17, RB18, RNF05). Every case sends plain requests, without the app, to prove the server holds
 * the rule alone. A refusal by the update rule answers 403 or 404 depending on the case, so it is
 * checked as "not 200" plus the record read back unchanged.
 */

/** Per collection: how to build a record, its km field and the fields the author may edit. */
const KINDS = {
    fuels: {
        make: (make, user, vehicle) => make.fuel({ user, vehicle }),
        km: "km_fuel",
        editable: { type: "diesel", liters: 12.34, cost: 99.9 },
    },
    oils: {
        make: (make, user, vehicle) => make.oil({ user, vehicle }),
        km: "km_oil",
        editable: { type: "10W40 mineral", cost: 310.5 },
    },
    repairs: {
        make: (make, user, vehicle) => make.repair({ user, vehicle }),
        km: "km_repair",
        editable: { description: "Clutch replacement", cost: 720 },
    },
};

const path = (collection) => `/api/collections/${collection}/records`;

/* State shared by the file: one disposable instance, a driver, another driver and a supervisor. */
let pb;
let admin;
let make;
let driver;
let stranger;
let supervisor;
let asDriver;
let asStranger;
let asSupervisor;

/** Starts the instance and signs in two drivers and a supervisor. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    make = createFactories(admin);

    driver = await make.user();
    stranger = await make.user();
    supervisor = await make.user({ role: "supervisor" });
    asDriver = await login(pb.url, "users", driver.email, driver.password);
    asStranger = await login(pb.url, "users", stranger.email, stranger.password);
    asSupervisor = await login(pb.url, "users", supervisor.email, supervisor.password);
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

/** Reads a record as superuser. */
const read = async (collection, id) => (await admin.get(`${path(collection)}/${id}`)).body;

/** Reads a vehicle as superuser. */
const readVehicle = async (vehicle) => (await admin.get(`/api/collections/vehicles/records/${vehicle.id}`)).body;

/** Asserts that a request was refused (rule or validation), never accepted. */
const assertRefused = (response, label = "") => assert.ok([400, 403, 404].includes(response.status), `${label} ${response.status} ${JSON.stringify(response.body)}`);

for (const [collection, kind] of Object.entries(KINDS)) {
    describe(`${collection}: the author edits the non-sensitive fields (RB17)`, () => {
        test("each editable field is saved alone, and the sensitive ones stay as they were", async () => {
            const vehicle = await make.vehicle();
            const record = await kind.make(make, driver, vehicle);

            for (const [field, value] of Object.entries(kind.editable)) {
                const response = await asDriver.patch(`${path(collection)}/${record.id}`, { [field]: value });
                assert.equal(response.status, 200, `${field}: ${JSON.stringify(response.body)}`);
                assert.equal(response.body[field], value);
            }

            const stored = await read(collection, record.id);
            assert.equal(stored.user, driver.id);
            assert.equal(stored.vehicle, vehicle.id);
            assert.equal(stored[kind.km], record[kind.km]);
            assert.equal(stored.created, record.created);
        });

        test("all the editable fields change in one request", async () => {
            const record = await kind.make(make, driver, await make.vehicle());
            const response = await asDriver.patch(`${path(collection)}/${record.id}`, kind.editable);

            assert.equal(response.status, 200, JSON.stringify(response.body));
            const stored = await read(collection, record.id);
            for (const [field, value] of Object.entries(kind.editable)) {
                assert.equal(stored[field], value);
            }
        });

        test("a form that sends back the fixed fields with their saved values is accepted", async () => {
            const vehicle = await make.vehicle();
            const record = await kind.make(make, driver, vehicle);
            const response = await asDriver.patch(`${path(collection)}/${record.id}`, {
                user: driver.id,
                vehicle: vehicle.id,
                [kind.km]: record[kind.km],
                created: record.created,
                ...kind.editable,
            });

            assert.equal(response.status, 200, JSON.stringify(response.body));
        });

        test("a supervisor edits the records they authored", async () => {
            const record = await kind.make(make, supervisor, await make.vehicle());
            const response = await asSupervisor.patch(`${path(collection)}/${record.id}`, kind.editable);

            assert.equal(response.status, 200, JSON.stringify(response.body));
        });

        test("the record stays editable after its vehicle is inactivated, because the vehicle does not change", async () => {
            const vehicle = await make.vehicle();
            const record = await kind.make(make, driver, vehicle);
            assert.equal((await admin.patch(`/api/collections/vehicles/records/${vehicle.id}`, { active: false })).status, 200);

            const response = await asDriver.patch(`${path(collection)}/${record.id}`, kind.editable);
            assert.equal(response.status, 200, JSON.stringify(response.body));
        });
    });

    describe(`${collection}: only the author edits (RB17)`, () => {
        test("another driver is refused and the record stays as it was", async () => {
            const record = await kind.make(make, driver, await make.vehicle());
            const response = await asStranger.patch(`${path(collection)}/${record.id}`, kind.editable);

            assertRefused(response);
            assert.deepEqual(await read(collection, record.id), record);
        });

        test("a supervisor is refused on the record of another user, and the record stays as it was", async () => {
            const record = await kind.make(make, driver, await make.vehicle());
            const response = await asSupervisor.patch(`${path(collection)}/${record.id}`, kind.editable);

            assertRefused(response);
            assert.deepEqual(await read(collection, record.id), record);
        });

        test("a request without a session is refused", async () => {
            const record = await kind.make(make, driver, await make.vehicle());
            const response = await pb.anonymous.patch(`${path(collection)}/${record.id}`, kind.editable);

            assertRefused(response);
            assert.deepEqual(await read(collection, record.id), record);
        });

        test("an inactive author is refused even with a session opened before (RB18)", async () => {
            const user = await make.user();
            const session = await login(pb.url, "users", user.email, user.password);
            const record = await kind.make(make, user, await make.vehicle());
            assert.equal((await admin.patch(`/api/collections/users/records/${user.id}`, { active: false })).status, 200);

            assertRefused(await session.patch(`${path(collection)}/${record.id}`, kind.editable));
            assert.deepEqual(await read(collection, record.id), record);
        });
    });

    describe(`${collection}: the vehicle, the km, the author and the date stay fixed (RB04, RB17, RNF05)`, () => {
        test("a change of vehicle, km or author is refused, for the author and the supervisor", async () => {
            const vehicle = await make.vehicle();
            const record = await kind.make(make, driver, vehicle);
            const other = await make.vehicle();
            const inactive = await make.vehicle({ active: false });

            const changes = [
                { vehicle: other.id },
                { vehicle: inactive.id },
                { [kind.km]: record[kind.km] + 1 },
                { [kind.km]: 1000 },
                { user: stranger.id },
                { user: supervisor.id },
            ];

            for (const session of [asDriver, asSupervisor]) {
                for (const change of changes) {
                    assertRefused(await session.patch(`${path(collection)}/${record.id}`, change), JSON.stringify(change));
                }
            }
            assert.deepEqual(await read(collection, record.id), record);
        });

        test("a creation date sent in the body is ignored, so the stored date stays the server's (RNF05)", async () => {
            const record = await kind.make(make, driver, await make.vehicle());

            for (const session of [asDriver, asSupervisor]) {
                await session.patch(`${path(collection)}/${record.id}`, { created: "2000-01-01 00:00:00.000Z" });
            }
            assert.equal((await read(collection, record.id)).created, record.created);
        });

        test("a fixed field in the same request as an editable one refuses the whole request", async () => {
            const record = await kind.make(make, driver, await make.vehicle());
            const other = await make.vehicle();

            for (const change of [{ vehicle: other.id }, { [kind.km]: record[kind.km] + 1 }, { user: stranger.id }]) {
                assertRefused(await asDriver.patch(`${path(collection)}/${record.id}`, { ...kind.editable, ...change }));
            }
            assert.deepEqual(await read(collection, record.id), record);
        });

        test("editing leaves the odometer of the vehicle as it was", async () => {
            const vehicle = await make.vehicle({ odometer: 1000 });
            const record = await kind.make(make, driver, vehicle);

            assert.equal((await asDriver.patch(`${path(collection)}/${record.id}`, kind.editable)).status, 200);
            assertRefused(await asDriver.patch(`${path(collection)}/${record.id}`, { [kind.km]: 5000 }));
            assert.equal((await readVehicle(vehicle)).odometer, 1000);
        });

        test("an odometer sent in the body is not applied to the vehicle", async () => {
            const vehicle = await make.vehicle({ odometer: 1000 });
            const record = await kind.make(make, driver, vehicle);

            await asDriver.patch(`${path(collection)}/${record.id}`, { ...kind.editable, odometer: 9999 });
            assert.equal((await readVehicle(vehicle)).odometer, 1000);
        });
    });

    describe(`${collection}: the edited values keep the rules of the form (RB16)`, () => {
        test("cost is still required, positive, at most 999.999,99 and with two decimals", async () => {
            const record = await kind.make(make, driver, await make.vehicle());
            const cases = [
                [0, "validation_required"],
                [null, "validation_required"],
                [-1, "validation_min_number_constraint"],
                [1000000, "validation_max_number_constraint"],
                [10.123, "validation_too_many_decimals"],
            ];

            for (const [value, code] of cases) {
                const response = await asDriver.patch(`${path(collection)}/${record.id}`, { cost: value });
                assert.equal(response.status, 400, `cost=${value}`);
                assert.equal(response.body.data.cost.code, code, `cost=${value}`);
            }
            assert.equal((await read(collection, record.id)).cost, record.cost);
        });

        test("deleting is still refused to the author and to the supervisor (RB17)", async () => {
            const record = await kind.make(make, driver, await make.vehicle());

            for (const session of [asDriver, asSupervisor]) {
                assert.equal((await session.delete(`${path(collection)}/${record.id}`)).status, 403);
            }
            assert.equal((await read(collection, record.id)).id, record.id);
        });
    });
}

describe("fuels: the values of the edit (RF11, RB16)", () => {
    test("liters are required, positive, at most 999.999,99 and with two decimals", async () => {
        const record = await make.fuel({ user: driver, vehicle: await make.vehicle() });
        const cases = [
            [0, "validation_required"],
            [null, "validation_required"],
            [-1, "validation_min_number_constraint"],
            [1000000, "validation_max_number_constraint"],
            [10.123, "validation_too_many_decimals"],
        ];

        for (const [value, code] of cases) {
            const response = await asDriver.patch(`${path("fuels")}/${record.id}`, { liters: value });
            assert.equal(response.status, 400, `liters=${value}`);
            assert.equal(response.body.data.liters.code, code, `liters=${value}`);
        }
        assert.equal((await read("fuels", record.id)).liters, record.liters);
    });

    test("each fuel type is accepted and any other is refused", async () => {
        const record = await make.fuel({ user: driver, vehicle: await make.vehicle() });

        for (const type of ["gasolina", "aditivada", "etanol", "diesel"]) {
            assert.equal((await asDriver.patch(`${path("fuels")}/${record.id}`, { type })).status, 200, type);
        }

        const refused = await asDriver.patch(`${path("fuels")}/${record.id}`, { type: "gnv" });
        assert.equal(refused.status, 400);
        assert.equal(refused.body.data.type.code, "validation_invalid_value");
    });
});

describe("oils: the values of the edit (RF12)", () => {
    test("the oil type is required and has up to 100 characters", async () => {
        const record = await make.oil({ user: driver, vehicle: await make.vehicle() });

        assert.equal((await asDriver.patch(`${path("oils")}/${record.id}`, { type: "x".repeat(100) })).status, 200);

        const tooLong = await asDriver.patch(`${path("oils")}/${record.id}`, { type: "x".repeat(101) });
        assert.equal(tooLong.status, 400);
        assert.equal(tooLong.body.data.type.code, "validation_max_text_constraint");

        for (const type of ["", null]) {
            const missing = await asDriver.patch(`${path("oils")}/${record.id}`, { type });
            assert.equal(missing.status, 400, `type=${type}`);
            assert.equal(missing.body.data.type.code, "validation_required", `type=${type}`);
        }
    });
});

describe("repairs: the values of the edit (RF13)", () => {
    test("the description is required and has up to 500 characters", async () => {
        const record = await make.repair({ user: driver, vehicle: await make.vehicle() });

        assert.equal((await asDriver.patch(`${path("repairs")}/${record.id}`, { description: "x".repeat(500) })).status, 200);

        const tooLong = await asDriver.patch(`${path("repairs")}/${record.id}`, { description: "x".repeat(501) });
        assert.equal(tooLong.status, 400);
        assert.equal(tooLong.body.data.description.code, "validation_max_text_constraint");

        for (const description of ["", null]) {
            const missing = await asDriver.patch(`${path("repairs")}/${record.id}`, { description });
            assert.equal(missing.status, 400, `description=${description}`);
            assert.equal(missing.body.data.description.code, "validation_required", `description=${description}`);
        }
    });
});

describe("routes and complaints change only along the planned flows (RB17)", () => {
    /** An open route on a vehicle of its own, for a driver of its own (one open route per driver, RB02). */
    const openRoute = async () => {
        const user = await make.user();
        const session = await login(pb.url, "users", user.email, user.password);
        return { route: await make.route({ user, vehicle: await make.vehicle() }), session };
    };

    test("no one edits a field of an open route outside the finalization and the closure", async () => {
        const { route, session: asAuthor } = await openRoute();
        const other = await make.vehicle();

        for (const session of [asAuthor, asStranger, asSupervisor]) {
            for (const change of [{ itinerary: "Elsewhere" }, { obs_departure: "Changed" }, { km_departure: 500 }, { vehicle: other.id }, { user: stranger.id }]) {
                assertRefused(await session.patch(`${path("routes")}/${route.id}`, change), JSON.stringify(change));
            }
        }
        assert.deepEqual(await read("routes", route.id), route);
    });

    test("a finalized route and a closed route are not editable by the author or by a supervisor", async () => {
        const { route: finalized, session: asAuthor } = await openRoute();
        assert.equal((await asAuthor.patch(`${path("routes")}/${finalized.id}`, { status: "finalizada", km_return: 1100 })).status, 200);
        const { route: closed, session: asClosedAuthor } = await openRoute();
        assert.equal((await asSupervisor.patch(`${path("routes")}/${closed.id}`, { status: "encerrada" })).status, 200);

        for (const [route, author] of [[finalized, asAuthor], [closed, asClosedAuthor]]) {
            const before = await read("routes", route.id);
            for (const session of [author, asSupervisor]) {
                for (const change of [{ status: "aberta" }, { status: "finalizada", km_return: 1200 }, { status: "encerrada" }, { itinerary: "Elsewhere" }, { km_departure: 500 }]) {
                    assertRefused(await session.patch(`${path("routes")}/${route.id}`, change), JSON.stringify(change));
                }
            }
            assert.deepEqual(await read("routes", route.id), before);
        }
    });

    test("a pending complaint changes only by the review, and a reviewed one does not change", async () => {
        const { route, session: asAuthor } = await openRoute();
        const complaint = await make.complaint({ route_current: route.id, km_complaint: 990 });

        for (const session of [asAuthor, asStranger]) {
            assertRefused(await session.patch(`${path("complaints")}/${complaint.id}`, { status: "aprovada" }));
        }
        assertRefused(await asSupervisor.patch(`${path("complaints")}/${complaint.id}`, { km_complaint: 995 }));
        assert.equal((await read("complaints", complaint.id)).status, "pendente");

        assert.equal((await asSupervisor.patch(`${path("complaints")}/${complaint.id}`, { status: "reprovada" })).status, 200);
        for (const session of [asAuthor, asSupervisor]) {
            for (const change of [{ status: "aprovada" }, { status: "pendente" }, { km_complaint: 995 }]) {
                assertRefused(await session.patch(`${path("complaints")}/${complaint.id}`, change), JSON.stringify(change));
            }
        }
        assert.equal((await read("complaints", complaint.id)).status, "reprovada");
    });

    test("no one deletes a route or a complaint", async () => {
        const { route, session: asAuthor } = await openRoute();
        const complaint = await make.complaint({ route_current: route.id, km_complaint: 990 });

        for (const session of [asAuthor, asSupervisor]) {
            assert.equal((await session.delete(`${path("routes")}/${route.id}`)).status, 403);
            assert.equal((await session.delete(`${path("complaints")}/${complaint.id}`)).status, 403);
        }
    });
});
