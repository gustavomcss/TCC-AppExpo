import type { OilValues } from '../schemas/oil';
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
