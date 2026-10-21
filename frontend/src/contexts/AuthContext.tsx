import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
    refreshSession,
    signIn as signInRequest,
    signOut as signOutRequest,
} from '../services/auth';
import { pb, restoreStoredSession } from '../services/pocketbase';

/** Fields of the signed-in user that the app reads. */
export type SessionUser = {
    id: string;
    email: string;
    name: string;
    role: 'motorista' | 'supervisor';
};

type AuthContextValue = {
    /** True until the session saved by a previous run has been loaded and checked. */
    loading: boolean;
    /** The signed-in user, or null when signed out. */
    user: SessionUser | null;
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
    };
}

/**
 * Keeps the session state for the whole app. It restores the saved session on start and follows
 * every change of the PocketBase auth store, so a login, a logout or a session cleared elsewhere
 * (such as the 401/403 handling of I-07) all end up here.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<SessionUser | null>(null);

    useEffect(() => {
        const unsubscribe = pb.authStore.onChange(() => setUser(currentUser()));

        async function restore() {
            await restoreStoredSession();
            if (pb.authStore.isValid && !(await refreshSession())) {
                pb.authStore.clear();
            }
            setUser(currentUser());
            setLoading(false);
        }
        restore();

        return unsubscribe;
    }, []);

    const signIn = useCallback((email: string, password: string) => {
        return signInRequest(email, password);
    }, []);

    const value = useMemo(
        () => ({ loading, user, signIn, signOut: signOutRequest }),
        [loading, user, signIn],
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
