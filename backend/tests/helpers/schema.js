import assert from "node:assert/strict";

/**
 * Runs `run` while every vehicle is invalid for the server, so that saving the odometer fails, and
 * puts the schema back afterwards, so the test does not have to be the last of its file. A new
 * required field makes every existing vehicle fail validation. `admin` is a superuser client.
 */
export async function withUnsavableVehicles(admin, run) {
    const collection = (await admin.get("/api/collections/vehicles")).body;
    const patched = await admin.patch(`/api/collections/${collection.id}`, { fields: [...collection.fields, { type: "text", name: "must_have", required: true }] });
    assert.equal(patched.status, 200);

    try {
        return await run();
    } finally {
        const restored = await admin.patch(`/api/collections/${collection.id}`, { fields: collection.fields });
        assert.equal(restored.status, 200, "the schema was restored");
    }
}
