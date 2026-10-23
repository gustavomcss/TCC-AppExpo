import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createClient, login } from "./helpers/client.js";
import { createFactories, fakePhoto } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the rules of user creation and editing (I-11, RB18, RB19): who can create whom and
 * who can edit which field of whom. The tests send plain requests, without the app, to prove that
 * the backend holds the rules by itself. Enum values (motorista, supervisor...) are data of the
 * model, so they stay in Portuguese.
 */

const AUTH_PATH = "/api/collections/users/auth-with-password";
const NEW_PASSWORD = "novasenha123";

/* State shared by the file: one disposable instance and a few users, each with a session. */
let pb;
let admin;
let make;
let driverA;
let driverB;
let supervisorA;
let supervisorB;
let asDriverA;
let asDriverB;
let asSupervisorA;
let asSupervisorB;

/** Starts the instance and signs in the users the scenarios use. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    make = createFactories(admin);
    driverA = await make.user();
    driverB = await make.user();
    supervisorA = await make.user({ role: "supervisor" });
    supervisorB = await make.user({ role: "supervisor" });
    asDriverA = await signIn(driverA);
    asDriverB = await signIn(driverB);
    asSupervisorA = await signIn(supervisorA);
    asSupervisorB = await signIn(supervisorB);
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

/** Signs a user in and returns a client holding the session token, as the app does. */
const signIn = (user) => login(pb.url, "users", user.email, user.password);

/** Reads a user as superuser, to check what was stored. */
async function stored(user) {
    return (await admin.get(`/api/collections/users/records/${user.id}`)).body;
}

/** The status of a refused write: a rule that fails answers 400 on create and 404 or 403 on edit. */
function assertRefused(response, label) {
    assert.ok([400, 403, 404].includes(response.status), `${label}: status ${response.status}`);
}

/** Checks that the stored user still has the values of the record read before the attempt. */
async function assertUnchanged(user, before, fields) {
    const after = await stored(user);
    for (const field of fields) {
        assert.deepEqual(after[field], before[field], `${field} changed`);
    }
}

/** Whether the user can still sign in with the password. */
async function canSignIn(user, password) {
    const response = await createClient(pb.url).post(AUTH_PATH, { identity: user.email, password });
    return response.status === 200;
}

/** Body that changes a password the way the app sends it. */
const passwordBody = (extra = {}) => ({ password: NEW_PASSWORD, passwordConfirm: NEW_PASSWORD, ...extra });

/** Multipart body with a new photo. */
function photoBody() {
    const form = new FormData();
    form.append("photo", fakePhoto(), "photo.jpg");
    return form;
}

/** Fields a plain edit must leave alone, for every kind of record. */
const FIXED_FIELDS = ["email", "emailVisibility", "verified", "role"];

describe("creating users (RB19)", () => {
    const form = (overrides = {}) => {
        const n = Math.random().toString(36).slice(2, 10);
        return { email: `new${n}@test.local`, password: "senha12345", passwordConfirm: "senha12345", name: "New driver", role: "motorista", active: true, ...overrides };
    };

    test("a supervisor creates a driver, who signs in with the initial password", async () => {
        const body = form();
        const response = await asSupervisorA.post("/api/collections/users/records", body);
        assert.equal(response.status, 200);
        assert.equal(response.body.role, "motorista");
        assert.equal(response.body.active, true);
        assert.equal(await canSignIn({ email: body.email }, body.password), true);
    });

    test("a supervisor cannot create a supervisor", async () => {
        const body = form({ role: "supervisor" });
        assertRefused(await asSupervisorA.post("/api/collections/users/records", body), "create supervisor");
        assert.equal((await admin.get(`/api/collections/users/records?filter=email='${body.email}'`)).body.totalItems, 0);
    });

    test("a supervisor cannot create a user without a role", async () => {
        const { role, ...body } = form();
        assertRefused(await asSupervisorA.post("/api/collections/users/records", body), "create without role");
        assert.equal((await admin.get(`/api/collections/users/records?filter=email='${body.email}'`)).body.totalItems, 0);
    });

    test("a supervisor cannot create a pre-verified user", async () => {
        const body = form({ verified: true });
        assertRefused(await asSupervisorA.post("/api/collections/users/records", body), "create verified");
        assert.equal((await admin.get(`/api/collections/users/records?filter=email='${body.email}'`)).body.totalItems, 0);
    });

    for (const role of ["motorista", "supervisor"]) {
        test(`a driver cannot create a ${role}`, async () => {
            const body = form({ role });
            assertRefused(await asDriverA.post("/api/collections/users/records", body), `create ${role}`);
            assert.equal((await admin.get(`/api/collections/users/records?filter=email='${body.email}'`)).body.totalItems, 0);
        });
    }

    test("nobody signs up without being signed in", async () => {
        const body = form();
        assertRefused(await pb.anonymous.post("/api/collections/users/records", body), "anonymous sign-up");
        assert.equal((await admin.get(`/api/collections/users/records?filter=email='${body.email}'`)).body.totalItems, 0);
    });

    test("an inactive supervisor with an open session cannot create users", async () => {
        const supervisor = await make.user({ role: "supervisor" });
        const session = await signIn(supervisor);
        await admin.patch(`/api/collections/users/records/${supervisor.id}`, { active: false });

        const body = form();
        assertRefused(await session.post("/api/collections/users/records", body), "create as inactive");
        assert.equal((await admin.get(`/api/collections/users/records?filter=email='${body.email}'`)).body.totalItems, 0);
    });
});

describe("a user edits only their own photo and password (RB19)", () => {
    /** Each field a user must not change in their own record, with a value that differs from the stored one. */
    const FORBIDDEN = {
        name: "Another name",
        email: "another@test.local",
        role: "supervisor",
        active: false,
        emailVisibility: true,
        verified: true,
    };

    for (const [label, getUser, getSession] of [
        ["driver", () => driverA, () => asDriverA],
        ["supervisor", () => supervisorA, () => asSupervisorA],
    ]) {
        for (const [field, value] of Object.entries(FORBIDDEN)) {
            test(`${label}: cannot change their own ${field}`, async () => {
                const user = getUser();
                const before = await stored(user);
                /* The role sent must differ from the stored one, or the change would not be a change. */
                const newValue = field === "role" && label === "supervisor" ? "motorista" : value;
                assertRefused(await getSession().patch(`/api/collections/users/records/${user.id}`, { [field]: newValue }), field);
                await assertUnchanged(user, before, [field]);
            });
        }

        test(`${label}: changes their own photo`, async () => {
            const user = getUser();
            const response = await getSession().patch(`/api/collections/users/records/${user.id}`, photoBody());
            assert.equal(response.status, 200);
            assert.ok((await stored(user)).photo);
        });

        test(`${label}: removes their own photo, back to the initials`, async () => {
            const user = getUser();
            const session = getSession();
            assert.equal((await session.patch(`/api/collections/users/records/${user.id}`, photoBody())).status, 200);
            assert.ok((await stored(user)).photo);

            const response = await session.patch(`/api/collections/users/records/${user.id}`, { photo: null });
            assert.equal(response.status, 200);
            assert.equal((await stored(user)).photo, "");
        });

        test(`${label}: sending the unchanged fields back along with the photo is accepted`, async () => {
            const user = getUser();
            const current = await stored(user);
            const form = photoBody();
            for (const field of ["name", "email", "role", "active"]) {
                form.append(field, String(current[field]));
            }
            assert.equal((await getSession().patch(`/api/collections/users/records/${user.id}`, form)).status, 200);
        });

        test(`${label}: changes their own password only with the old one`, async () => {
            const user = await make.user({ role: label === "driver" ? "motorista" : "supervisor" });
            const session = await signIn(user);

            assertRefused(await session.patch(`/api/collections/users/records/${user.id}`, passwordBody()), "without old password");
            assertRefused(await session.patch(`/api/collections/users/records/${user.id}`, passwordBody({ oldPassword: "wrong-password" })), "wrong old password");
            assert.equal(await canSignIn(user, user.password), true);

            const response = await session.patch(`/api/collections/users/records/${user.id}`, passwordBody({ oldPassword: user.password }));
            assert.equal(response.status, 200);
            assert.equal(await canSignIn(user, NEW_PASSWORD), true);
            assert.equal(await canSignIn(user, user.password), false);
        });
    }

    test("a driver cannot edit another driver", async () => {
        const before = await stored(driverB);
        for (const body of [{ name: "Hacked" }, passwordBody({ oldPassword: driverB.password }), photoBody()]) {
            assertRefused(await asDriverA.patch(`/api/collections/users/records/${driverB.id}`, body), "edit another driver");
        }
        await assertUnchanged(driverB, before, ["name", "photo", ...FIXED_FIELDS]);
        assert.equal(await canSignIn(driverB, driverB.password), true);
    });

    test("a driver cannot edit a supervisor", async () => {
        const before = await stored(supervisorB);
        assertRefused(await asDriverA.patch(`/api/collections/users/records/${supervisorB.id}`, { name: "Hacked" }), "edit supervisor");
        assertRefused(await asDriverA.patch(`/api/collections/users/records/${supervisorB.id}`, passwordBody()), "password of supervisor");
        await assertUnchanged(supervisorB, before, ["name"]);
        assert.equal(await canSignIn(supervisorB, supervisorB.password), true);
    });

    test("an inactive user with an open session cannot edit their own photo", async () => {
        const user = await make.user();
        const session = await signIn(user);
        await admin.patch(`/api/collections/users/records/${user.id}`, { active: false });
        assertRefused(await session.patch(`/api/collections/users/records/${user.id}`, photoBody()), "edit as inactive");
        assert.equal((await stored(user)).photo, "");
    });
});

describe("a supervisor edits a driver's name, photo, active flag and password (RB19)", () => {
    test("changes the name and the photo", async () => {
        const driver = await make.user();
        const response = await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { name: "Renamed driver" });
        assert.equal(response.status, 200);
        assert.equal(response.body.name, "Renamed driver");

        assert.equal((await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, photoBody())).status, 200);
        assert.ok((await stored(driver)).photo);
    });

    test("deactivates and reactivates, and the records of the driver stay", async () => {
        const driver = await make.user();
        const vehicle = await make.vehicle();
        const fuel = await make.fuel({ user: driver, vehicle });
        const route = await make.route({ user: driver, vehicle, status: "finalizada", km_return: 1100 });

        assert.equal((await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { active: false })).status, 200);
        assert.equal((await stored(driver)).active, false);
        assert.equal(await canSignIn(driver, driver.password), false);
        assert.equal((await admin.get(`/api/collections/fuels/records/${fuel.id}`)).body.user, driver.id);
        assert.equal((await admin.get(`/api/collections/routes/records/${route.id}`)).body.user, driver.id);

        assert.equal((await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { active: true })).status, 200);
        assert.equal(await canSignIn(driver, driver.password), true);
    });

    test("sets a new password without the old one, and the driver signs in with it", async () => {
        const driver = await make.user();
        const session = await signIn(driver);
        const response = await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, passwordBody());
        assert.equal(response.status, 200);

        assert.equal(await canSignIn(driver, NEW_PASSWORD), true);
        assert.equal(await canSignIn(driver, driver.password), false);
        assert.notEqual((await session.get(`/api/collections/users/records/${driver.id}`)).status, 200, "the old session should stop working");
    });

    test("sending the unchanged e-mail and role back is accepted", async () => {
        const driver = await make.user();
        const response = await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { name: "Same fields", email: driver.email, role: "motorista" });
        assert.equal(response.status, 200);
    });

    /** Fields a supervisor must not change in a driver, with a value that differs from the stored one. */
    const FORBIDDEN = {
        email: "another@test.local",
        role: "supervisor",
        emailVisibility: true,
        verified: true,
    };

    for (const [field, value] of Object.entries(FORBIDDEN)) {
        test(`cannot change the ${field} of a driver`, async () => {
            const driver = await make.user();
            const before = await stored(driver);
            assertRefused(await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { [field]: value }), field);
            await assertUnchanged(driver, before, [field]);
        });
    }

    test("cannot slip a forbidden field in along with an allowed one", async () => {
        const driver = await make.user();
        const before = await stored(driver);
        assertRefused(await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { name: "Promoted", role: "supervisor" }), "name and role");
        await assertUnchanged(driver, before, ["name", "role"]);
    });
});

describe("a supervisor does not edit another supervisor (RB19)", () => {
    test("name, photo, active flag, password, e-mail and role are all refused", async () => {
        const target = await make.user({ role: "supervisor" });
        const before = await stored(target);

        const attempts = {
            name: { name: "Hacked" },
            photo: photoBody(),
            deactivation: { active: false },
            password: passwordBody(),
            email: { email: "hacked@test.local" },
            demotion: { role: "motorista" },
        };
        for (const [label, body] of Object.entries(attempts)) {
            assertRefused(await asSupervisorA.patch(`/api/collections/users/records/${target.id}`, body), label);
        }

        await assertUnchanged(target, before, ["name", "photo", "active", "email", "role"]);
        assert.equal(await canSignIn(target, target.password), true);
    });

    test("a supervisor cannot deactivate or demote themself", async () => {
        const supervisor = await make.user({ role: "supervisor" });
        const session = await signIn(supervisor);
        assertRefused(await session.patch(`/api/collections/users/records/${supervisor.id}`, { active: false }), "deactivate self");
        assertRefused(await session.patch(`/api/collections/users/records/${supervisor.id}`, { role: "motorista" }), "demote self");
        const after = await stored(supervisor);
        assert.equal(after.active, true);
        assert.equal(after.role, "supervisor");
    });

    test("an inactive supervisor with an open session cannot edit a driver", async () => {
        const supervisor = await make.user({ role: "supervisor" });
        const session = await signIn(supervisor);
        const driver = await make.user();
        await admin.patch(`/api/collections/users/records/${supervisor.id}`, { active: false });

        assertRefused(await session.patch(`/api/collections/users/records/${driver.id}`, { name: "Hacked" }), "edit as inactive supervisor");
        assertRefused(await session.patch(`/api/collections/users/records/${driver.id}`, passwordBody()), "password as inactive supervisor");
        assert.equal(await canSignIn(driver, driver.password), true);
    });
});

describe("nothing is deleted or re-mailed by a user", () => {
    for (const [label, getSession] of [["driver", () => asDriverA], ["supervisor", () => asSupervisorA]]) {
        test(`${label}: cannot delete a user, not even themself`, async () => {
            const target = await make.user();
            for (const user of [target, label === "driver" ? driverA : supervisorA]) {
                const response = await getSession().delete(`/api/collections/users/records/${user.id}`);
                assert.ok([403, 404].includes(response.status), `delete status ${response.status}`);
                assert.equal((await admin.get(`/api/collections/users/records/${user.id}`)).status, 200);
            }
        });

        test(`${label}: cannot start the e-mail change flow`, async () => {
            const user = await make.user({ role: label === "driver" ? "motorista" : "supervisor" });
            const session = await signIn(user);
            const response = await session.post("/api/collections/users/request-email-change", { newEmail: "changed@test.local" });
            assert.equal(response.status, 403);
            assert.equal((await stored(user)).email, user.email);
        });
    }
});

describe("a user with an open route is not deactivated (RB18)", () => {
    /** A driver with an open route on a vehicle of their own. */
    async function driverWithOpenRoute() {
        const driver = await make.user();
        const vehicle = await make.vehicle();
        const route = await make.route({ user: driver, vehicle, status: "aberta" });
        return { driver, vehicle, route };
    }

    test("the supervisor's deactivation is refused with a code on the active field", async () => {
        const { driver } = await driverWithOpenRoute();
        const response = await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { active: false });
        assert.equal(response.status, 400);
        assert.equal(response.body.data.active.code, "user_has_open_route");
        assert.equal((await stored(driver)).active, true);
        assert.equal(await canSignIn(driver, driver.password), true);
    });

    test("the superuser's deactivation is refused as well", async () => {
        const { driver } = await driverWithOpenRoute();
        const response = await admin.patch(`/api/collections/users/records/${driver.id}`, { active: false });
        assert.equal(response.status, 400);
        assert.equal((await stored(driver)).active, true);
    });

    test("it works once the route is no longer open", async () => {
        for (const status of ["finalizada", "encerrada"]) {
            const { driver, route } = await driverWithOpenRoute();
            await admin.patch(`/api/collections/routes/records/${route.id}`, { status, km_return: 1100 });
            assert.equal((await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { active: false })).status, 200, status);
            assert.equal((await stored(driver)).active, false);
        }
    });

    test("the open route of another driver does not block", async () => {
        await driverWithOpenRoute();
        const other = await make.user();
        assert.equal((await asSupervisorA.patch(`/api/collections/users/records/${other.id}`, { active: false })).status, 200);
    });

    test("other edits of a driver with an open route are not blocked", async () => {
        const { driver } = await driverWithOpenRoute();
        assert.equal((await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { name: "Still working" })).status, 200);
        assert.equal((await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, passwordBody())).status, 200);
    });

    test("saving an already inactive user, or reactivating, is not blocked", async () => {
        const { driver, route } = await driverWithOpenRoute();
        await admin.patch(`/api/collections/routes/records/${route.id}`, { status: "encerrada", km_return: 1100 });
        await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { active: false });
        await admin.patch(`/api/collections/routes/records/${route.id}`, { status: "aberta" });

        assert.equal((await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { name: "Inactive, renamed" })).status, 200);
        assert.equal((await asSupervisorA.patch(`/api/collections/users/records/${driver.id}`, { active: true })).status, 200);
    });
});
