import type { FuelValues } from '../schemas/fuel';
import { pb } from './pocketbase';

/**
 * Registers a fueling (RF11). Author and creation date are set by the server (RNF05), so only the
 * five fields of the form are sent. The km is informative: it does not change the current km of
 * the vehicle (RB04). The server refuses a fueling for an inactive vehicle (`vehicle_inactive`).
 */
export async function createFuel(values: FuelValues): Promise<void> {
    await pb.collection('fuels').create({
        vehicle: values.vehicle,
        km_fuel: values.km_fuel,
        type: values.type,
        liters: values.liters,
        cost: values.cost,
    });
}
