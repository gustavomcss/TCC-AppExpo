import type { RecordModel } from 'pocketbase';

import type { DriverValues } from '../schemas/driver';
import { pb } from './pocketbase';
import { photoBody } from './profile';
import type { PickedPhoto } from './profile';

/** A driver as the management list shows it. */
export type Driver = {
    id: string;
    name: string;
    email: string;
    active: boolean;
    /** Address of the profile photo, or null when the driver has none. */
    photoUrl: string | null;
};

/** Maps a `users` record to the driver the screens show. */
function toDriver(record: RecordModel): Driver {
    return {
        id: record.id,
        name: record.name,
        email: record.email,
        active: record.active === true,
        photoUrl: record.photo ? pb.files.getURL(record, record.photo) : null,
    };
}

/** Compares names the way a Brazilian reader sorts them: ignoring case and accents. */
const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

/**
 * Lists every driver in alphabetical order by name. The order is made here and not by the
 * server, because the database sorts text by code point (capitals before lowercase letters, and
 * accented letters after "z"). The list rule lets only a
 * supervisor see other users' records, and the manage rule is what makes their e-mail visible
 * (I-11), so a driver asking gets nothing back.
 */
export async function listDrivers(): Promise<Driver[]> {
    const records = await pb.collection('users').getFullList({
        filter: 'role = "motorista"',
    });

    return records.map(toDriver).sort((a, b) => nameCollator.compare(a.name, b.name));
}

/** Loads one driver for the detail screen. The server answers 404 for a user the caller cannot see. */
export async function getDriver(id: string): Promise<Driver> {
    return toDriver(await pb.collection('users').getOne(id));
}

/** Situation filter of the driver list. */
export type DriverStatusFilter = 'all' | 'active' | 'inactive';

/** Lowercase text without accents, so "jose" finds "José" and "JOSÉ". */
function fold(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/**
 * Narrows the loaded list by situation and by a search text that must appear in the name or in
 * the e-mail, ignoring case and accents. It works on what the list already holds, since the whole
 * list is loaded at once, so typing sends no request.
 */
export function filterDrivers(
    drivers: Driver[],
    query: string,
    status: DriverStatusFilter,
): Driver[] {
    const term = fold(query.trim());

    return drivers.filter((driver) => {
        if (status === 'active' && !driver.active) {
            return false;
        }
        if (status === 'inactive' && driver.active) {
            return false;
        }

        return term === '' || fold(driver.name).includes(term) || fold(driver.email).includes(term);
    });
}

/**
 * Creates a driver (RF03). The role is always "motorista" and the user starts active, since a
 * user created without `active` would be inactive. The server accepts it from a supervisor only
 * and with that role only (I-11); the password is sent twice because PocketBase asks for the
 * confirmation, and the form has a single field for it.
 */
export async function createDriver(values: DriverValues): Promise<void> {
    await pb.collection('users').create({
        ...values,
        passwordConfirm: values.password,
        role: 'motorista',
        active: true,
    });
}

/** Changes the name of a driver (RB19). Returns the driver as saved. */
export async function updateDriverName(id: string, name: string): Promise<Driver> {
    return toDriver(await pb.collection('users').update(id, { name }));
}

/** Sends a new photo for a driver (RB19). Returns the driver as saved, with the new picture. */
export async function updateDriverPhoto(id: string, photo: PickedPhoto): Promise<Driver> {
    return toDriver(await pb.collection('users').update(id, photoBody(photo)));
}

/** Removes the photo of a driver (RB19), so the screens go back to showing initials. */
export async function removeDriverPhoto(id: string): Promise<Driver> {
    return toDriver(await pb.collection('users').update(id, { photo: null }));
}

/**
 * Deactivates or reactivates a driver (RB18). Deactivation keeps the user and every record of
 * theirs; the server refuses it with `user_has_open_route` on `active` while the driver has an
 * open route (I-11).
 */
export async function setDriverActive(id: string, active: boolean): Promise<Driver> {
    return toDriver(await pb.collection('users').update(id, { active }));
}

/**
 * Deletes a driver (RF03). The server accepts it from a supervisor for a driver only (RB19), and
 * refuses it with `user_has_records` on `id` while the driver has any route, fueling, oil change
 * or repair (RB18); the way out for those is to deactivate the driver.
 */
export async function deleteDriver(id: string): Promise<void> {
    await pb.collection('users').delete(id);
}

/**
 * Sets a new password for a driver (RB19). The manage rule of `users` lets a supervisor do it
 * without the old password (I-11); the confirmation is sent equal because PocketBase asks for
 * it. The server then invalidates the driver's tokens, so the driver signs in again with it.
 */
export async function resetDriverPassword(id: string, password: string): Promise<void> {
    await pb.collection('users').update(id, { password, passwordConfirm: password });
}
