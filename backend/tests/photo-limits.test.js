import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { login } from "./helpers/client.js";
import { complaintForm, createFactories } from "./helpers/factories.js";
import { startPocketBase } from "./helpers/pocketbase.js";

/*
 * API tests for the limits of the two photo fields (RF04, RF14): the complaint photo takes up to
 * 10 MB and the profile photo up to 5 MB, both only JPEG, PNG or WebP. The limits live in the
 * collection schema (`maxSize` and `mimeTypes`, migration create_trace_collections), so these
 * tests send plain requests, without the app, to prove the server refuses what the app also
 * checks. A refusal is checked by status and by `code`, as src/services/serverErrors.ts
 * translates it.
 */

const COMPLAINTS = "/api/collections/complaints/records";
const USERS = "/api/collections/users/records";

const MB = 1024 * 1024;

/* State shared by the file: one disposable instance and factories. */
let pb;
let make;

/** Starts the instance. */
before(async () => {
    pb = await startPocketBase();
    make = createFactories(pb.admin);
});

/* Stops the instance and removes its temp folder. */
after(() => pb?.stop());

/** Signs in a user created by the factory. */
const signIn = (user) => login(pb.url, "users", user.email, user.password);

/* The first bytes that identify each accepted type; PocketBase reads the type from the content. */
const SIGNATURES = {
    jpeg: [0xff, 0xd8, 0xff, 0xe0],
    png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    webp: [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20],
};

/** A fake image of the given type and size in bytes (at least the signature). */
function image(type, size = 64) {
    const bytes = new Uint8Array(Math.max(size, SIGNATURES[type].length));
    bytes.set(SIGNATURES[type]);
    return new Blob([bytes], { type: `image/${type}` });
}

/** A text file posing as a photo. */
const textFile = () => new Blob(["not a picture, just text"], { type: "text/plain" });

/** A driver with an open route, and the session. Each complaint needs a route of its own (RB11). */
async function driverWithRoute() {
    const user = await make.user();
    const vehicle = await make.vehicle({ odometer: 1000 });
    const route = await make.route({ user, vehicle, km_departure: 1000 });
    return { user, route, session: await signIn(user) };
}

/** Files a complaint with the given photo. */
const file = (session, route, photo) => session.post(COMPLAINTS, complaintForm({ route_current: route.id, km_complaint: 990, photo }));

/** Changes the user's own photo. */
function setPhoto(session, user, photo) {
    const form = new FormData();
    form.append("photo", photo, "photo.img");
    return session.patch(`${USERS}/${user.id}`, form);
}

describe("the complaint photo (RF14)", () => {
    test("a photo of exactly 10 MB is accepted", async () => {
        const { route, session } = await driverWithRoute();
        const response = await file(session, route, image("jpeg", 10 * MB));
        assert.equal(response.status, 200, JSON.stringify(response.body));
    });

    test("a photo above 10 MB is refused with validation_file_size_limit, and no complaint is created", async () => {
        const { route, session } = await driverWithRoute();
        const response = await file(session, route, image("jpeg", 10 * MB + 1));

        assert.equal(response.status, 400);
        assert.equal(response.body.data.photo.code, "validation_file_size_limit");

        const stored = await pb.admin.get(`${COMPLAINTS}?filter=${encodeURIComponent(`route_current = "${route.id}"`)}`);
        assert.equal(stored.body.totalItems, 0);
    });

    for (const type of ["jpeg", "png", "webp"]) {
        test(`a ${type} photo is accepted`, async () => {
            const { route, session } = await driverWithRoute();
            const response = await file(session, route, image(type));
            assert.equal(response.status, 200, JSON.stringify(response.body));
        });
    }

    test("a file that is not an accepted image is refused with validation_invalid_mime_type", async () => {
        const { route, session } = await driverWithRoute();
        const response = await file(session, route, textFile());

        assert.equal(response.status, 400);
        assert.equal(response.body.data.photo.code, "validation_invalid_mime_type");
    });
});

describe("the profile photo (RF04)", () => {
    test("a photo of exactly 5 MB is accepted", async () => {
        const user = await make.user();
        const response = await setPhoto(await signIn(user), user, image("png", 5 * MB));
        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.ok(response.body.photo);
    });

    test("a photo above 5 MB is refused with validation_file_size_limit, and the user keeps no photo", async () => {
        const user = await make.user();
        const response = await setPhoto(await signIn(user), user, image("jpeg", 5 * MB + 1));

        assert.equal(response.status, 400);
        assert.equal(response.body.data.photo.code, "validation_file_size_limit");
        assert.equal((await pb.admin.get(`${USERS}/${user.id}`)).body.photo, "");
    });

    test("a file that is not an accepted image is refused with validation_invalid_mime_type", async () => {
        const user = await make.user();
        const response = await setPhoto(await signIn(user), user, textFile());

        assert.equal(response.status, 400);
        assert.equal(response.body.data.photo.code, "validation_invalid_mime_type");
        assert.equal((await pb.admin.get(`${USERS}/${user.id}`)).body.photo, "");
    });
});
