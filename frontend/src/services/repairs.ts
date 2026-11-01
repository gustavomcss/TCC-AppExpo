import type { RepairEditValues, RepairValues } from '../schemas/repair';
import { pb } from './pocketbase';

/**
 * Registers a repair at a workshop (RF13). Author and creation date are set by the server
 * (RNF05), so only the four fields of the form are sent. The km is informative: it does not
 * change the current km of the vehicle (RB04). The server refuses a repair for an inactive
 * vehicle (`vehicle_inactive`).
 */
export async function createRepair(values: RepairValues): Promise<void> {
    await pb.collection('repairs').create({
        vehicle: values.vehicle,
        km_repair: values.km_repair,
        description: values.description,
        cost: values.cost,
    });
}

/**
 * Edits the non-sensitive fields of a repair (RF21): the description and the cost. The vehicle,
 * the km, the author and the date are not sent, and the server refuses a request that changes
 * them (RB17). Only the author is allowed, and the edit does not touch the current km of the
 * vehicle (RB04). A 404 means the record is not the user's.
 */
export async function updateRepair(id: string, values: RepairEditValues): Promise<void> {
    await pb.collection('repairs').update(id, {
        description: values.description,
        cost: values.cost,
    });
}
