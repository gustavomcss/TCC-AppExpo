import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import {
    describeSessionEnd,
    refreshSession,
    signIn as signInRequest,
    signOut as signOutRequest,
} from '../services/auth';
import { onSessionRejected, pb, restoreStoredSession } from '../services/pocketbase';

/** Fields of the signed-in user that the app reads. */
export type SessionUser = {
    id: string;
    email: string;
    name: string;
    role: 'motorista' | 'supervisor';
    /** Address of the profile photo, or null when the user has none. */
    photoUrl: string | null;
};

type AuthContextValue = {
    /** True until the session saved by a previous run has been loaded and checked. */
    loading: boolean;
    /** The signed-in user, or null when signed out. */
    user: SessionUser | null;
    /** Why the server ended the last session, or null. Shown on the login screen. */
    notice: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Reads the user of the current session from the PocketBase client. */
function currentUser(): SessionUser | null {
    const record = pb.authStore.isValid ? pb.authStore.record : null;
    if (!record) {
        return null;
    }

    return {
        id: record.id,
        email: record.email,
        name: record.name,
        role: record.role,
        photoUrl: record.photo ? pb.files.getURL(record, record.photo) : null,
    };
}

/**
 * Keeps the session state for the whole app. It restores the saved session on start and follows
 * every change of the PocketBase auth store, so a login, a logout or a session cleared elsewhere
 * all end up here. When the server refuses the session (401/403, I-07) it keeps the notice for
 * the login screen, and each time the app returns to the foreground it checks the session
 * again, because a deactivated user's ordinary requests do not always answer 401/403.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<SessionUser | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = pb.authStore.onChange(() => setUser(currentUser()));
        const unsubscribeRejection = onSessionRejected((status) => {
            setNotice(describeSessionEnd(status));
        });

        async function restore() {
            await restoreStoredSession();
            if (pb.authStore.isValid && !(await refreshSession())) {
                pb.authStore.clear();
            }
            setUser(currentUser());
            setLoading(false);
        }
        restore();

        return () => {
            unsubscribe();
            unsubscribeRejection();
        };
    }, []);

    const signedIn = user !== null;
    useEffect(() => {
        if (!signedIn) {
            return;
        }

        const subscription = AppState.addEventListener('change', async (state) => {
            if (state === 'active' && !(await refreshSession())) {
                pb.authStore.clear();
            }
        });

        return () => subscription.remove();
    }, [signedIn]);

    const signIn = useCallback(async (email: string, password: string) => {
        await signInRequest(email, password);
        setNotice(null);
    }, []);

    const value = useMemo(
        () => ({ loading, user, notice, signIn, signOut: signOutRequest }),
        [loading, user, notice, signIn],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Returns the session state. Must be used inside AuthProvider. */
export function useAuth(): AuthContextValue {
    const value = useContext(AuthContext);
    if (!value) {
        throw new Error('useAuth must be used inside AuthProvider.');
    }

    return value;
}
