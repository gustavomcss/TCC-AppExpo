import { equivalentPlate } from '../schemas/plates';
import type { VehicleValues } from '../schemas/vehicle';
import { pb } from './pocketbase';

/**
 * Looks for a registered vehicle with this plate or with its equivalent in the other format
 * (RB20). The server refuses the duplicate anyway; this lets the form say which plate is taken.
 */
export async function findVehicleByPlate(plate: string): Promise<{ plate: string } | null> {
    const equivalent = equivalentPlate(plate);
    const filter = equivalent
        ? pb.filter('plate = {:plate} || plate = {:equivalent}', { plate, equivalent })
        : pb.filter('plate = {:plate}', { plate });

    const { items } = await pb.collection('vehicles').getList(1, 1, { filter });
    return items[0] ? { plate: items[0].plate as string } : null;
}

/**
 * Creates a vehicle. The server makes it active and decides whether the signed-in user may create
 * it (supervisor only, I-05), so neither is sent.
 */
export async function createVehicle(values: VehicleValues): Promise<void> {
    await pb.collection('vehicles').create(values);
}
