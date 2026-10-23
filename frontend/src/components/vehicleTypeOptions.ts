import { Car, Motorbike, Truck, Van } from 'lucide-react-native';

import { VEHICLE_TYPES } from '../schemas/vehicle';
import type { SelectOption } from './Select';

/** Vehicle type choices of a Select, in the order of VEHICLE_TYPES, each with its icon. */
export const VEHICLE_TYPE_OPTIONS: readonly SelectOption<
    (typeof VEHICLE_TYPES)[number]['value']
>[] = VEHICLE_TYPES.map((type) => ({
    ...type,
    icon: { moto: Motorbike, carro: Car, van: Van, caminhao: Truck }[type.value],
}));
