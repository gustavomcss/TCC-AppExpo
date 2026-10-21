import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { login } from "./helpers/client.js";
import { createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for registering a vehicle the way the example form of the app does (I-08, RNF06):
 * the app validates first, and the server must refuse on its own whatever gets past it. Each
 * refusal is checked by the `code` of the field, because the app translates the code into the
 * message shown on the form (src/services/serverErrors.ts); a changed code breaks that
 * translation. The tests send plain requests, without the app.
 */

const PATH = "/api/collections/vehicles/records";

/** Code of a plate that does not match AAA-0A00. */
const PLATE_FORMAT_CODE = "validation_invalid_format";

/* State shared by the file: one disposable instance, a supervisor and a driver. */
let pb;
let admin;
let supervisor;
let driver;
let anonymous;
let counter = 0;

/** Starts the instance and signs in a supervisor and a driver. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    anonymous = pb.anonymous;

    const make = createFactories(admin);
    const supervisorUser = await make.user({ role: "supervisor" });
    const driverUser = await make.user();
    supervisor = await login(pb.url, "users", supervisorUser.email, supervisorUser.password);
    driver = await login(pb.url, "users", driverUser.email, driverUser.password);
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

/** A valid vehicle with a plate not used before in this file; `overrides` replace its fields. */
function vehicle(overrides = {}) {
    return { plate: `FRM-${String(++counter).padStart(4, "0")}`, type: "moto", model: "Biz", odometer: 10, active: true, ...overrides };
}

/** Total number of vehicles, read as superuser. */
const count = async () => (await admin.get(`${PATH}?perPage=1`)).body.totalItems;

/**
 * Sends a vehicle the server must refuse and checks that it answers 400 with the expected code on
 * each field named in `expected` ({ field: code }), and that nothing was stored.
 */
async function assertRefused(client, body, expected) {
    const total = await count();
    const response = await client.post(PATH, body);

    assert.equal(response.status, 400);
    for (const [field, code] of Object.entries(expected)) {
        assert.equal(response.body.data[field]?.code, code, `${field}: ${JSON.stringify(response.body.data)}`);
    }
    assert.equal(await count(), total);
}

describe("the server refuses what the form would also refuse, with a code per field (RNF06)", () => {
    test("required fields: plate, type and model", async () => {
        await assertRefused(supervisor, { odometer: 10, active: true }, {
            plate: "validation_required",
            type: "validation_required",
            model: "validation_required",
        });
    });

    test("plate: at most 8 characters", async () => {
        await assertRefused(supervisor, vehicle({ plate: "ABCD-1234" }), { plate: "validation_max_text_constraint" });
    });

    test("plate: unique", async () => {
        const first = await supervisor.post(PATH, vehicle({ plate: "ABC-1D23" }));
        assert.equal(first.status, 200);

        await assertRefused(supervisor, vehicle({ plate: "ABC-1D23" }), { plate: "validation_not_unique" });
    });

    test("type: only carro, moto, caminhao or van", async () => {
        await assertRefused(supervisor, vehicle({ type: "bike" }), { type: "validation_invalid_value" });
        await assertRefused(supervisor, vehicle({ type: "" }), { type: "validation_required" });
    });

    test("model: required, at most 100 characters", async () => {
        await assertRefused(supervisor, vehicle({ model: "" }), { model: "validation_required" });
        await assertRefused(supervisor, vehicle({ model: "M".repeat(101) }), { model: "validation_max_text_constraint" });

        const limit = await supervisor.post(PATH, vehicle({ model: "M".repeat(100) }));
        assert.equal(limit.status, 200);
    });

    test("odometer: not negative, up to 999,999.99, two decimal places at most (RB16)", async () => {
        await assertRefused(supervisor, vehicle({ odometer: -1 }), { odometer: "validation_min_number_constraint" });
        await assertRefused(supervisor, vehicle({ odometer: 1000000 }), { odometer: "validation_max_number_constraint" });
        await assertRefused(supervisor, vehicle({ odometer: 1.234 }), { odometer: "validation_too_many_decimals" });
        await assertRefused(supervisor, vehicle({ odometer: 0.005 }), { odometer: "validation_too_many_decimals" });
    });

    test("several invalid fields are all reported in one answer", async () => {
        await assertRefused(supervisor, vehicle({ type: "bike", model: "", odometer: -5 }), {
            type: "validation_invalid_value",
            model: "validation_required",
            odometer: "validation_min_number_constraint",
        });
    });
});

describe("the plate is AAA-0A00: uppercase, 8 characters, with the hyphen (DER)", () => {
    for (const plate of ["ABC-1234", "DEF-1D23", "XYZ-9Z99"]) {
        test(`${plate} is accepted (old and Mercosul formats)`, async () => {
            const response = await supervisor.post(PATH, vehicle({ plate }));
            assert.equal(response.status, 200);
            assert.equal(response.body.plate, plate);
        });
    }

    const invalid = {
        "without the hyphen": "ABC1D23",
        "in lowercase": "abc-1d23",
        "with a space instead of the hyphen": "ABC 1D23",
        "too short": "ABC-123",
        "letters where the digit goes": "ABC-DD23",
        "a letter in the last digits": "ABC-1D2E",
        "digits in the letters": "123-1D23",
        "two letters only": "AB-1D234",
        "symbols": "!!!",
    };
    for (const [name, plate] of Object.entries(invalid)) {
        test(`${name} (${JSON.stringify(plate)}) is refused`, async () => {
            await assertRefused(supervisor, vehicle({ plate }), { plate: PLATE_FORMAT_CODE });
        });
    }

    test("a plate with a bad format is refused for a superuser too", async () => {
        const response = await admin.post(PATH, vehicle({ plate: "ABC1D23" }));
        assert.equal(response.status, 400);
        assert.equal(response.body.data.plate.code, PLATE_FORMAT_CODE);
    });
});

/** The Mercosul letter that stands for each digit of an old plate, from 0 to 9. */
const MERCOSUL_LETTERS = "ABCDEFGHIJ";

describe("an old plate and its Mercosul equivalent are the same plate (RB20)", () => {
    for (const [digit, letter] of [...MERCOSUL_LETTERS].entries()) {
        test(`1${digit}23 and 1${letter}23 at the end of a plate cannot both exist, in either order`, async () => {
            const old = (suffix) => `R${letter}${suffix}-1${digit}23`;
            const mercosul = (suffix) => `R${letter}${suffix}-1${letter}23`;

            assert.equal((await supervisor.post(PATH, vehicle({ plate: old("A") }))).status, 200);
            await assertRefused(supervisor, vehicle({ plate: mercosul("A") }), { plate: "validation_not_unique" });

            assert.equal((await supervisor.post(PATH, vehicle({ plate: mercosul("B") }))).status, 200);
            await assertRefused(supervisor, vehicle({ plate: old("B") }), { plate: "validation_not_unique" });
        });
    }

    test("a letter after J has no old equivalent, so it does not clash with other plates", async () => {
        assert.equal((await supervisor.post(PATH, vehicle({ plate: "KLM-1K23" }))).status, 200);
        assert.equal((await supervisor.post(PATH, vehicle({ plate: "KLM-1A23" }))).status, 200);
        assert.equal((await supervisor.post(PATH, vehicle({ plate: "KLM-1K24" }))).status, 200);
    });

    test("the check also applies to a superuser", async () => {
        assert.equal((await supervisor.post(PATH, vehicle({ plate: "MNO-1323" }))).status, 200);

        const response = await admin.post(PATH, vehicle({ plate: "MNO-1D23" }));
        assert.equal(response.status, 400);
        assert.equal(response.body.data.plate.code, "validation_not_unique");
    });

    test("a vehicle changes to the equivalent of its own plate, keeping its record (conversion)", async () => {
        const created = await supervisor.post(PATH, vehicle({ plate: "STU-1323" }));
        assert.equal(created.status, 200);

        const converted = await supervisor.patch(`${PATH}/${created.body.id}`, { plate: "STU-1D23" });
        assert.equal(converted.status, 200);
        assert.equal(converted.body.id, created.body.id);
        assert.equal(converted.body.plate, "STU-1D23");
    });

    test("a plate cannot be edited into the equivalent of another vehicle's plate", async () => {
        assert.equal((await supervisor.post(PATH, vehicle({ plate: "VWX-1323" }))).status, 200);
        const other = await supervisor.post(PATH, vehicle({ plate: "VWX-1A99" }));
        assert.equal(other.status, 200);

        const response = await supervisor.patch(`${PATH}/${other.body.id}`, { plate: "VWX-1D23" });
        assert.equal(response.status, 400);
        assert.equal(response.body.data.plate.code, "validation_not_unique");
        assert.equal((await admin.get(`${PATH}/${other.body.id}`)).body.plate, "VWX-1A99");
    });

    test("two requests for equivalent plates at the same time leave only one vehicle (the database backs the hook)", async () => {
        const total = await count();
        const responses = await Promise.all([
            supervisor.post(PATH, vehicle({ plate: "BCD-1323" })),
            supervisor.post(PATH, vehicle({ plate: "BCD-1D23" })),
        ]);

        assert.equal(responses.filter((response) => response.status === 200).length, 1);
        assert.equal(await count(), total + 1);
    });

    test("saving a vehicle without changing its plate is not blocked", async () => {
        const created = await supervisor.post(PATH, vehicle({ plate: "YZA-1323" }));
        const response = await supervisor.patch(`${PATH}/${created.body.id}`, { model: "Other" });
        assert.equal(response.status, 200);
    });
});

describe("a vehicle registered by a user starts active (RB12)", () => {
    test("active omitted is stored as true", async () => {
        const { active, ...body } = vehicle();
        const response = await supervisor.post(PATH, body);
        assert.equal(response.status, 200);
        assert.equal(response.body.active, true);
    });

    test("active false in the body is ignored", async () => {
        const response = await supervisor.post(PATH, vehicle({ active: false }));
        assert.equal(response.status, 200);
        assert.equal(response.body.active, true);
    });
});

describe("the initial odometer must be sent, as a number (RB03)", () => {
    test("omitted, null or empty is refused as required", async () => {
        const { odometer, ...omitted } = vehicle();
        await assertRefused(supervisor, omitted, { odometer: "validation_required" });
        await assertRefused(supervisor, vehicle({ odometer: null }), { odometer: "validation_required" });
        await assertRefused(supervisor, vehicle({ odometer: "" }), { odometer: "validation_required" });
    });

    test("text that is not a number is refused, not stored as 0", async () => {
        await assertRefused(supervisor, vehicle({ odometer: "abc" }), { odometer: "validation_invalid_value" });
        await assertRefused(supervisor, vehicle({ odometer: true }), { odometer: "validation_invalid_value" });
    });

    test("the same holds for form data, where PocketBase also turns text into 0", async () => {
        /** Builds a multipart body of a valid vehicle, with the odometer only when given. */
        const form = (odometer) => {
            const { odometer: ignored, ...fields } = vehicle();
            const data = new FormData();
            Object.entries(fields).forEach(([key, value]) => data.set(key, String(value)));
            if (odometer !== undefined) {
                data.set("odometer", odometer);
            }
            return data;
        };

        await assertRefused(supervisor, form(undefined), { odometer: "validation_required" });
        await assertRefused(supervisor, form(""), { odometer: "validation_required" });
        await assertRefused(supervisor, form("abc"), { odometer: "validation_invalid_value" });

        const accepted = await supervisor.post(PATH, form("12.5"));
        assert.equal(accepted.status, 200);
        assert.equal(accepted.body.odometer, 12.5);
    });

    test("zero is accepted when sent", async () => {
        const response = await supervisor.post(PATH, vehicle({ odometer: 0 }));
        assert.equal(response.status, 200);
        assert.equal(response.body.odometer, 0);
    });
});

describe("values at the edge of the limits are accepted (RB03, RB16)", () => {
    for (const odometer of [0, 12.3, 999999.99]) {
        test(`odometer ${odometer}`, async () => {
            const response = await supervisor.post(PATH, vehicle({ odometer }));
            assert.equal(response.status, 200);
            assert.equal(response.body.odometer, odometer);
        });
    }

});

describe("the date of creation belongs to the server (RNF05)", () => {
    test("a created date sent in the body is ignored", async () => {
        const response = await supervisor.post(PATH, vehicle({ created: "2000-01-01 00:00:00.000Z" }));
        assert.equal(response.status, 200);
        assert.ok(new Date(response.body.created).getFullYear() >= 2026, response.body.created);
    });
});

describe("a refused rule answers 400 without field data, which the form shows as no permission (RB19)", () => {
    test("a driver cannot register a vehicle", async () => {
        const total = await count();
        const response = await driver.post(PATH, vehicle());

        assert.equal(response.status, 400);
        assert.deepEqual(response.body.data, {});
        assert.equal(await count(), total);
    });

    test("an anonymous request cannot register a vehicle", async () => {
        const total = await count();
        const response = await anonymous.post(PATH, vehicle());

        assert.equal(response.status, 400);
        assert.deepEqual(response.body.data, {});
        assert.equal(await count(), total);
    });
});
