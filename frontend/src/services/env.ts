/*
 * Expo replaces process.env.EXPO_PUBLIC_* with the .env value at build time, so the access
 * must be literal (no process.env[key]).
 */
const pocketbaseUrl = process.env.EXPO_PUBLIC_POCKETBASE_URL;

if (!pocketbaseUrl) {
    throw new Error('EXPO_PUBLIC_POCKETBASE_URL is not set. Copy .env.example to .env.');
}

/** Validated runtime configuration. pocketbaseUrl has no trailing slash. */
export const env = {
    pocketbaseUrl: pocketbaseUrl.replace(/\/+$/, ''),
};
