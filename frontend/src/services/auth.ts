import { ClientResponseError } from 'pocketbase';

import { pb } from './pocketbase';
import type { RejectionStatus } from './pocketbase';

/** Signs in with e-mail and password. The session token is persisted by the PocketBase client. */
export async function signIn(email: string, password: string): Promise<void> {
    await pb.collection('users').authWithPassword(email, password);
}

/** Ends the session and removes the token from the device. */
export function signOut(): void {
    pb.authStore.clear();
}

/**
 * Refreshes the stored session against the server. Resolves to false when the server rejects it
 * (expired token, user removed) and to true otherwise, including when the server is unreachable,
 * so that opening the app offline does not log the user out.
 */
export async function refreshSession(): Promise<boolean> {
    try {
        await pb.collection('users').authRefresh();
        return true;
    } catch (error) {
        return !(error instanceof ClientResponseError) || error.status === 0;
    }
}

/** Translates a login failure into the message shown on the login form. */
export function describeLoginError(error: unknown): string {
    if (error instanceof ClientResponseError) {
        if (error.status === 400) {
            return 'E-mail ou senha incorretos.';
        }
        if (error.status === 403) {
            return 'Sua conta está desativada.\nFale com o supervisor.';
        }
        if (error.status === 0) {
            return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
        }
    }

    return 'Não foi possível entrar. Tente novamente.';
}

/** Notice shown on the login screen when the server ends the session (I-07). */
export function describeSessionEnd(status: RejectionStatus): string {
    if (status === 403) {
        return 'Sua conta foi desativada ou perdeu o acesso.\nFale com o supervisor.';
    }

    return 'Sua sessão expirou. Entre novamente.';
}
