import PocketBase, { AsyncAuthStore } from 'pocketbase';
import * as SecureStore from 'expo-secure-store';

import { env } from '../env';

/* Key under which the session is kept in the device secure storage (Keychain / Keystore). */
const SESSION_KEY = 'trace.session';

/** Reads the stored session, or null when there is none or the secure storage is unavailable. */
async function readStoredSession(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(SESSION_KEY);
    } catch {
        return null;
    }
}

/*
 * The store persists only what PocketBase serializes after a login: the session token and the
 * user record. The password is never written anywhere (RNF04).
 */
const authStore = new AsyncAuthStore({
    save: (serialized) => SecureStore.setItemAsync(SESSION_KEY, serialized),
    clear: () => SecureStore.deleteItemAsync(SESSION_KEY),
});

/** The single PocketBase client of the app. */
export const pb = new PocketBase(env.pocketbaseUrl, authStore);

/** Loads the session saved by a previous run into the client, when there is one. */
export async function restoreStoredSession(): Promise<void> {
    const serialized = await readStoredSession();
    if (!serialized) {
        return;
    }

    try {
        const { token, record } = JSON.parse(serialized);
        pb.authStore.save(token, record);
    } catch {
        pb.authStore.clear();
    }
}
