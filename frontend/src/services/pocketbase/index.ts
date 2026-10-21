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

/** Statuses with which the server refuses a session. */
export type RejectionStatus = 401 | 403;

const rejectionListeners = new Set<(status: RejectionStatus) => void>();

/** Subscribes to sessions refused by the server (I-07). Returns the function that unsubscribes. */
export function onSessionRejected(listener: (status: RejectionStatus) => void): () => void {
    rejectionListeners.add(listener);

    return () => {
        rejectionListeners.delete(listener);
    };
}

/*
 * Any 401 or 403 on a request made with a session ends it: the token expired or the user was
 * deactivated (RB18). The login request is left out, because there a 403 means an inactive user
 * and the form shows it. Other denials of a deactivated user (empty list, 404, 400) cannot be
 * told apart from ordinary ones, so AuthContext also re-checks the session when the app returns
 * to the foreground.
 */
pb.afterSend = (response, data) => {
    const status = response.status;
    const isLogin = response.url.includes('/auth-with-password');

    if ((status === 401 || status === 403) && !isLogin && pb.authStore.token) {
        pb.authStore.clear();
        rejectionListeners.forEach((listener) => listener(status));
    }

    return data;
};

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
