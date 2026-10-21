import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { backendDir, ensureBinary } from "./helpers/binary.js";

/*
 * Tests for the I-04 migration flow, run through the PocketBase CLI against an empty data
 * folder. They use copies of backend/pb_migrations and backend/pb_hooks, never the originals,
 * and no server is started, so nothing here touches production.
 */

/** Migration files versioned in the repository, in application order. */
const migrationFiles = readdirSync(join(backendDir, "pb_migrations"))
    .filter((file) => file.endsWith(".js"))
    .sort();

let binary;
let dir;
let flags;

/** Runs `pocketbase migrate <args>` on the temp instance; `input` answers the confirmation prompt. */
const migrate = (args, input = "") =>
    execFileSync(binary, ["migrate", ...args, ...flags], { input, encoding: "utf8", stdio: "pipe" });

/* Copies the repository migrations into a fresh temp folder with an empty pb_data. */
before(async () => {
    binary = await ensureBinary();
    dir = mkdtempSync(join(tmpdir(), "trace-pb-migrations-"));
    cpSync(join(backendDir, "pb_migrations"), join(dir, "pb_migrations"), { recursive: true });
    cpSync(join(backendDir, "pb_hooks"), join(dir, "pb_hooks"), { recursive: true });
    flags = [`--dir=${dir}/pb_data`, `--migrationsDir=${dir}/pb_migrations`, `--hooksDir=${dir}/pb_hooks`];
});

/* Removes the temp folder. */
after(() => rmSync(dir, { recursive: true, force: true }));

describe("an empty instance reproduces the schema by applying the migrations", () => {
    test("pb_migrations has at least the initial migration", () => {
        assert.ok(migrationFiles.length >= 1);
    });

    test("migrate up applies every versioned file, in order", () => {
        const output = migrate(["up"]);
        const applied = [...output.matchAll(/Applied (\S+\.js)/g)].map((match) => match[1]);
        assert.deepEqual(applied, migrationFiles);
    });

    test("migrate up again applies nothing", () => {
        assert.match(migrate(["up"]), /No new migrations to apply/);
    });

    test("the last migration can be reverted and applied again", () => {
        const last = migrationFiles.at(-1);
        assert.match(migrate(["down", "1"], "y\n"), new RegExp(`Reverted ${last}`));
        assert.match(migrate(["up"]), new RegExp(`Applied ${last}`));
    });
});
