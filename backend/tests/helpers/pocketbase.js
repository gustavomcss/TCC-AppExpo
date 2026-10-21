import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backendDir, ensureBinary } from "./binary.js";
import { createClient, login } from "./client.js";

/** Asks the OS for a free TCP port on 127.0.0.1. */
function freePort() {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
    });
}

/** Polls /api/health until the server answers; fails if the process exits or 15 s pass. */
async function waitForHealth(url, hasExited, readLog) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        if (hasExited()) {
            throw new Error(`PocketBase exited on startup:\n${readLog()}`);
        }
        try {
            if ((await fetch(`${url}/api/health`)).ok) {
                return;
            }
        } catch {
            /* Still starting. */
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`PocketBase did not respond within 15 s:\n${readLog()}`);
}

/*
 * Starts a disposable PocketBase instance: data in a temp folder, a free port and its own
 * superuser. It loads copies of backend/pb_migrations and backend/pb_hooks, never the original
 * folders, because collection changes made through the API would write migration files into
 * the repository. Returns { url, anonymous, admin, stop }, where admin is a superuser client.
 */
export async function startPocketBase() {
    const binary = await ensureBinary();
    const dir = mkdtempSync(join(tmpdir(), "trace-pb-"));
    cpSync(join(backendDir, "pb_migrations"), join(dir, "pb_migrations"), { recursive: true });
    cpSync(join(backendDir, "pb_hooks"), join(dir, "pb_hooks"), { recursive: true });

    const flags = [`--dir=${dir}/pb_data`, `--migrationsDir=${dir}/pb_migrations`, `--hooksDir=${dir}/pb_hooks`];
    const email = "superadmin@test.local";
    const password = randomUUID();
    execFileSync(binary, ["superuser", "upsert", email, password, ...flags], { stdio: "pipe" });

    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    const child = spawn(binary, ["serve", `--http=127.0.0.1:${port}`, ...flags], { stdio: ["ignore", "pipe", "pipe"] });

    let log = "";
    child.stdout.on("data", (chunk) => (log += chunk));
    child.stderr.on("data", (chunk) => (log += chunk));
    let exited = false;
    const exit = new Promise((resolve) =>
        child.once("exit", () => {
            exited = true;
            resolve();
        }),
    );
    process.once("exit", () => child.kill());

    /** Stops the server and removes its temp folder. */
    async function stop() {
        if (!exited) {
            child.kill("SIGTERM");
        }
        await exit;
        rmSync(dir, { recursive: true, force: true });
    }

    try {
        await waitForHealth(url, () => exited, () => log);
        const admin = await login(url, "_superusers", email, password);
        return { url, anonymous: createClient(url), admin, stop };
    } catch (error) {
        await stop();
        throw error;
    }
}
