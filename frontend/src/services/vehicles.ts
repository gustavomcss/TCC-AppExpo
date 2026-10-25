import type { RecordModel } from 'pocketbase';

import { equivalentPlate } from '../schemas/plates';
import type { VehicleEditValues, VehicleValues } from '../schemas/vehicle';
import { VEHICLE_TYPES } from '../schemas/vehicle';
import { fold, matchesStatus } from './listFilters';
import type { StatusFilter } from './listFilters';
import { pb } from './pocketbase';
import type { MessageOverrides } from './serverErrors';

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

/** Messages of the vehicle forms that are more specific than the default translation of a code. */
export const VEHICLE_MESSAGE_OVERRIDES: MessageOverrides = {
    plate: {
        validation_not_unique:
            'Já existe um veículo com esta placa ou com a equivalente em outro padrão.',
        validation_invalid_format: 'Informe uma placa válida, como ABC-1D23.',
    },
};

/** Label of a vehicle type as the user reads it ("caminhao" is "Caminhão"). */
export function typeLabel(type: Vehicle['type']): string {
    return VEHICLE_TYPES.find((item) => item.value === type)?.label ?? type;
}

/** Maps a `vehicles` record to the vehicle the screens show. */
function toVehicle(record: RecordModel): Vehicle {
    return {
        id: record.id,
        plate: record.plate,
        model: record.model,
        type: record.type,
        odometer: record.odometer,
        active: record.active === true,
    };
}

/**
 * Lists every vehicle, active ones first and then by plate. Inactive vehicles stay in the list
 * because they keep their history (RB12). The order is made by the server: the plates are
 * uppercase ASCII, so the database sorts them the way a reader would.
 */
export async function listVehicles(): Promise<Vehicle[]> {
    const records = await pb.collection('vehicles').getFullList({ sort: '-active,plate' });

    return records.map(toVehicle);
}

/** Loads one vehicle for the detail screen. */
export async function getVehicle(id: string): Promise<Vehicle> {
    return toVehicle(await pb.collection('vehicles').getOne(id));
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
 * When editing, `exceptId` leaves the vehicle itself out, so it can keep its plate or convert it
 * to the equivalent one.
 */
export async function findVehicleByPlate(
    plate: string,
    exceptId?: string,
): Promise<{ plate: string } | null> {
    const equivalent = equivalentPlate(plate);
    const match = equivalent
        ? pb.filter('(plate = {:plate} || plate = {:equivalent})', { plate, equivalent })
        : pb.filter('plate = {:plate}', { plate });
    const filter = exceptId ? `${match} && ${pb.filter('id != {:exceptId}', { exceptId })}` : match;

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

/**
 * Saves plate, type and model of a vehicle (RF06). The odometer is not sent: the update rule
 * refuses a request that changes it (RB09). Returns the vehicle as saved.
 */
export async function updateVehicle(id: string, values: VehicleEditValues): Promise<Vehicle> {
    return toVehicle(await pb.collection('vehicles').update(id, values));
}

/**
 * Inactivates or reactivates a vehicle (RB12). Inactive vehicles leave the selections of new
 * routes and records, and keep their history.
 */
export async function setVehicleActive(id: string, active: boolean): Promise<Vehicle> {
    return toVehicle(await pb.collection('vehicles').update(id, { active }));
}

/**
 * Deletes a vehicle (RF06). The server refuses it with `vehicle_has_records` on `id` while the
 * vehicle has any route, fueling, oil change or repair (RB12); the way out for those is to
 * inactivate the vehicle.
 */
export async function deleteVehicle(id: string): Promise<void> {
    await pb.collection('vehicles').delete(id);
}
