import { equivalentPlate } from '../schemas/plates';
import type { VehicleValues } from '../schemas/vehicle';
import { VEHICLE_TYPES } from '../schemas/vehicle';
import { fold, matchesStatus } from './listFilters';
import type { StatusFilter } from './listFilters';
import { pb } from './pocketbase';

/** A vehicle as the management list shows it. */
export type Vehicle = {
    id: string;
    plate: string;
    model: string;
    /** Type as stored (`carro`, `moto`, `caminhao` or `van`). */
    type: (typeof VEHICLE_TYPES)[number]['value'];
    /** Current km, kept by the server after the initial value (RB03). */
    odometer: number;
    active: boolean;
};

/** Label of a vehicle type as the user reads it ("caminhao" is "Caminhão"). */
export function typeLabel(type: Vehicle['type']): string {
    return VEHICLE_TYPES.find((item) => item.value === type)?.label ?? type;
}

/**
 * Lists every vehicle, active ones first and then by plate. Inactive vehicles stay in the list
 * because they keep their history (RB12). The order is made by the server: the plates are
 * uppercase ASCII, so the database sorts them the way a reader would.
 */
export async function listVehicles(): Promise<Vehicle[]> {
    const records = await pb.collection('vehicles').getFullList({ sort: '-active,plate' });

    return records.map((record) => ({
        id: record.id,
        plate: record.plate,
        model: record.model,
        type: record.type,
        odometer: record.odometer,
        active: record.active === true,
    }));
}

/**
 * Narrows the loaded list by situation, by type (`null` keeps every type) and by a search text
 * that must appear in the plate, the model or the type, ignoring case and accents. It works on what the list already holds, so
 * typing sends no request. The hyphen of the plate is optional in the text: "abc1d" finds
 * ABC-1D23.
 */
export function filterVehicles(
    vehicles: Vehicle[],
    query: string,
    status: StatusFilter,
    type: Vehicle['type'] | null = null,
): Vehicle[] {
    const term = fold(query.trim());
    const plateTerm = term.replace('-', '');

    return vehicles.filter((vehicle) => {
        if (!matchesStatus(vehicle.active, status) || (type && vehicle.type !== type)) {
            return false;
        }

        return (
            term === '' ||
            (plateTerm !== '' && fold(vehicle.plate).replace('-', '').includes(plateTerm)) ||
            fold(vehicle.model).includes(term) ||
            fold(typeLabel(vehicle.type)).includes(term)
        );
    });
}

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
