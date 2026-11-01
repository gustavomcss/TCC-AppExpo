import type { OilEditValues, OilValues } from '../schemas/oil';
import { pb } from './pocketbase';

/**
 * Registers an oil change (RF12). Author and creation date are set by the server (RNF05), so only
 * the four fields of the form are sent. The km is informative: it does not change the current km
 * of the vehicle (RB04). The server refuses an oil change for an inactive vehicle
 * (`vehicle_inactive`).
 */
export async function createOil(values: OilValues): Promise<void> {
    await pb.collection('oils').create({
        vehicle: values.vehicle,
        km_oil: values.km_oil,
        type: values.type,
        cost: values.cost,
    });
}

/**
 * Edits the non-sensitive fields of an oil change (RF21): the oil type and the cost. The vehicle,
 * the km, the author and the date are not sent, and the server refuses a request that changes them
 * (RB17). Only the author is allowed, and the edit does not touch the current km of the vehicle
 * (RB04). A 404 means the record is not the user's.
 */
export async function updateOil(id: string, values: OilEditValues): Promise<void> {
    await pb.collection('oils').update(id, { type: values.type, cost: values.cost });
}
