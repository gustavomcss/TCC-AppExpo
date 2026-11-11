import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/*
 * Loads modules of the app (frontend/src) into the tests, so a test runs the app's own code
 * instead of a copy of it. Node strips the TypeScript types by itself, but it wants the file
 * extension in an import, which the app's sources leave out (Metro and tsc do not need it). The
 * resolver below adds `.ts` to a relative import that has none. Only modules that do not touch
 * React Native or the PocketBase client can be loaded this way (the totals and the paging).
 */

const frontendSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "frontend", "src");

/* The resolve hook, as a data URL because `register` runs it in its own thread. */
register(
    "data:text/javascript," +
        encodeURIComponent(`
export async function resolve(specifier, context, nextResolve) {
    try {
        return await nextResolve(specifier, context);
    } catch (error) {
        if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) {
            return nextResolve(specifier + ".ts", context);
        }
        throw error;
    }
}`),
);

/**
 * Imports a module of the app by its path under frontend/src, such as "services/kmTotals.ts". It
 * must be called with `await` at run time (in `before`, for instance), not as a static import,
 * because the resolver above is registered when this file runs.
 */
export const loadAppModule = (path) => import(pathToFileURL(join(frontendSrc, path)).href);
