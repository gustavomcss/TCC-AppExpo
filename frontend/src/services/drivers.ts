import type { DriverValues } from '../schemas/driver';
import { pb } from './pocketbase';

/** A driver as the management list shows it. */
export type Driver = {
    id: string;
    name: string;
    email: string;
    active: boolean;
    /** Address of the profile photo, or null when the driver has none. */
    photoUrl: string | null;
};

/**
 * Lists every driver, the active ones first and each group by name. The list rule lets only a
 * supervisor see other users' records, and the manage rule is what makes their e-mail visible
 * (I-11), so a driver asking gets nothing back.
 */
export async function listDrivers(): Promise<Driver[]> {
    const records = await pb.collection('users').getFullList({
        filter: 'role = "motorista"',
        sort: '-active,name',
    });

    return records.map((record) => ({
        id: record.id,
        name: record.name,
        email: record.email,
        active: record.active === true,
        photoUrl: record.photo ? pb.files.getURL(record, record.photo) : null,
    }));
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
