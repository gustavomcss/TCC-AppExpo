import type { FuelEditValues, FuelValues } from '../schemas/fuel';
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

/**
 * Edits the non-sensitive fields of a fueling (RF21): the fuel type, the liters and the cost. The
 * vehicle, the km, the author and the date are not sent, and the server refuses a request that
 * changes them (RB17). Only the author is allowed, and the edit does not touch the current km of
 * the vehicle (RB04). A 404 means the record is not the user's.
 */
export async function updateFuel(id: string, values: FuelEditValues): Promise<void> {
    await pb.collection('fuels').update(id, {
        type: values.type,
        liters: values.liters,
        cost: values.cost,
    });
}
