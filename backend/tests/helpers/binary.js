import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Same PocketBase version as production (backend/README.md). Update both together. */
export const POCKETBASE_VERSION = "0.40.5";

/** Absolute path of the backend/ folder. */
export const backendDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Node platform and architecture names mapped to the PocketBase release file names. */
const OS = { linux: "linux", darwin: "darwin" };
const ARCH = { x64: "amd64", arm64: "arm64" };

/** Downloads a URL into memory and fails on a non-2xx response. */
async function download(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

/*
 * Returns the path of the PocketBase binary. On the first run it downloads the release zip
 * and checks its SHA-256 against the release checksums.txt. The binary is kept in
 * backend/.pocketbase (ignored by git).
 */
export async function ensureBinary() {
    const target = join(backendDir, ".pocketbase", POCKETBASE_VERSION, "pocketbase");
    if (existsSync(target)) {
        return target;
    }

    const os = OS[process.platform];
    const arch = ARCH[process.arch];
    if (!os || !arch) {
        throw new Error(`Platform not supported by the tests: ${process.platform}/${process.arch}`);
    }

    const base = `https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}`;
    const zipName = `pocketbase_${POCKETBASE_VERSION}_${os}_${arch}.zip`;
    const [zip, checksums] = await Promise.all([download(`${base}/${zipName}`), download(`${base}/checksums.txt`)]);

    const expected = checksums.toString().split("\n").find((line) => line.endsWith(zipName))?.split(/\s+/)[0];
    const actual = createHash("sha256").update(zip).digest("hex");
    if (!expected || expected !== actual) {
        throw new Error(`SHA-256 of ${zipName} does not match (expected ${expected}, got ${actual}).`);
    }

    const workDir = mkdtempSync(join(tmpdir(), "trace-pb-download-"));
    try {
        const zipPath = join(workDir, zipName);
        writeFileSync(zipPath, zip);
        execFileSync("unzip", ["-o", "-q", zipPath, "pocketbase", "-d", workDir]);

        /* Copy then rename: test files run in parallel and may download at the same time. */
        mkdirSync(dirname(target), { recursive: true });
        const partial = `${target}.${process.pid}`;
        copyFileSync(join(workDir, "pocketbase"), partial);
        chmodSync(partial, 0o755);
        renameSync(partial, target);
    } finally {
        rmSync(workDir, { recursive: true, force: true });
    }

    return target;
}
