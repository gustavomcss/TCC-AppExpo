import type { RepairValues } from '../schemas/repair';
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
