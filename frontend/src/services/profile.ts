import { File } from 'expo-file-system';

import type { ChangePasswordValues } from '../schemas/auth';
import { pb } from './pocketbase';

/** A picture chosen on the device: only the address of its file is needed. */
export type PickedPhoto = { uri: string };

/**
 * Sends a new photo for the signed-in user (RB19). The PocketBase client then refreshes the
 * stored user record, so the new picture reaches every screen that shows it. The server accepts
 * the change only for the user's own record and only for this field.
 */
export async function updatePhoto(userId: string, photo: PickedPhoto): Promise<void> {
    /*
     * The fetch of Expo does not read the `{ uri, name, type }` object of React Native's
     * FormData ("Unsupported FormDataPart implementation"); it reads a Blob or a File of
     * expo-file-system, which brings its own name and type.
     */
    const body = new FormData();
    body.append('photo', new File(photo.uri) as unknown as Blob);

    await pb.collection('users').update(userId, body);
}

/** Removes the photo of the signed-in user (RB19), so the screens go back to showing initials. */
export async function removePhoto(userId: string): Promise<void> {
    await pb.collection('users').update(userId, { photo: null });
}

/**
 * Changes the password of the signed-in user (RB19). The server asks for the old one and
 * invalidates every token of the user, including the one in use, so the app signs in again with
 * the new password to keep the session. If that sign-in fails the session is ended and the user
 * enters again by hand.
 */
export async function changePassword(
    userId: string,
    email: string,
    values: ChangePasswordValues,
): Promise<void> {
    await pb.collection('users').update(userId, values);

    try {
        await pb.collection('users').authWithPassword(email, values.password);
    } catch {
        pb.authStore.clear();
    }
}
