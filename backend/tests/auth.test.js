import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createClient } from "./helpers/client.js";
import { createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the sign-in contract the app relies on (I-06): a valid login returns the session
 * token and the user, a wrong credential is a 400 that does not reveal which part was wrong, and
 * a stored token stops working once the password changes. The block on inactive users is I-07,
 * and there is no self sign-up test here because collections.test.js already covers it.
 */

const AUTH_PATH = "/api/collections/users/auth-with-password";

let pb;
let admin;
let make;
let driver;

/* Starts the instance and creates one driver. */
before(async () => {
    pb = await startPocketBase();
    admin = pb.admin;
    make = createFactories(admin);
    driver = await make.user();
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

describe("sign-in with e-mail and password (RF01)", () => {
    test("valid credentials return the token and the user, without any password field", async () => {
        const response = await pb.anonymous.post(AUTH_PATH, { identity: driver.email, password: driver.password });
        assert.equal(response.status, 200);
        assert.ok(response.body.token);
        assert.equal(response.body.record.id, driver.id);
        assert.equal(response.body.record.role, "motorista");
        assert.equal(response.body.record.password, undefined);
        assert.equal(response.body.record.tokenKey, undefined);
    });

    test("a wrong password and an unknown e-mail both answer 400 with the same message", async () => {
        const wrongPassword = await pb.anonymous.post(AUTH_PATH, { identity: driver.email, password: "wrong-password" });
        const unknownEmail = await pb.anonymous.post(AUTH_PATH, { identity: "nobody@test.local", password: driver.password });
        assert.equal(wrongPassword.status, 400);
        assert.equal(unknownEmail.status, 400);
        assert.equal(wrongPassword.body.message, unknownEmail.body.message);
    });

    test("empty credentials are rejected", async () => {
        const response = await pb.anonymous.post(AUTH_PATH, { identity: "", password: "" });
        assert.equal(response.status, 400);
    });
});

describe("a stored session", () => {
    test("is renewed with the token", async () => {
        const { body } = await pb.anonymous.post(AUTH_PATH, { identity: driver.email, password: driver.password });
        const response = await createClient(pb.url, body.token).post("/api/collections/users/auth-refresh");
        assert.equal(response.status, 200);
        assert.equal(response.body.record.id, driver.id);
    });

    test("is rejected after the password changes", async () => {
        const user = await make.user();
        const { body } = await pb.anonymous.post(AUTH_PATH, { identity: user.email, password: user.password });
        const newPassword = "nova-senha-123";
        const change = await admin.patch(`/api/collections/users/records/${user.id}`, { password: newPassword, passwordConfirm: newPassword });
        assert.equal(change.status, 200);

        const response = await createClient(pb.url, body.token).post("/api/collections/users/auth-refresh");
        assert.ok([401, 403].includes(response.status), `status ${response.status}`);
    });

    test("is rejected when the token is invalid or missing", async () => {
        assert.equal((await createClient(pb.url, "not-a-token").post("/api/collections/users/auth-refresh")).status, 401);
        assert.equal((await pb.anonymous.post("/api/collections/users/auth-refresh")).status, 401);
    });
});
