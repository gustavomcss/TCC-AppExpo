import { Car, Motorbike, Truck, Van } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { VEHICLE_TYPES } from '../schemas/vehicle';
import type { SelectOption } from './Select';

/** A vehicle type as stored by the server. */
export type VehicleType = (typeof VEHICLE_TYPES)[number]['value'];

/** Icon that describes each vehicle type, used by the type Select and by the vehicle list. */
export const VEHICLE_TYPE_ICONS: Record<VehicleType, LucideIcon> = {
    moto: Motorbike,
    carro: Car,
    van: Van,
    caminhao: Truck,
};

/** Vehicle type choices of a Select, in the order of VEHICLE_TYPES, each with its icon. */
export const VEHICLE_TYPE_OPTIONS: readonly SelectOption<VehicleType>[] = VEHICLE_TYPES.map(
    (type) => ({ ...type, icon: VEHICLE_TYPE_ICONS[type.value] }),
);
