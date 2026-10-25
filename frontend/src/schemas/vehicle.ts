import { z } from 'zod';

import { decimalField } from './common';
import { capitalizeWords } from './masks';

/** Vehicle types as stored by the server (model data) and as the user sees them. */
export const VEHICLE_TYPES = [
    { value: 'moto', label: 'Moto' },
    { value: 'carro', label: 'Carro' },
    { value: 'van', label: 'Van' },
    { value: 'caminhao', label: 'Caminhão' },
] as const;

/**
 * Vehicle form, with the field names of the `vehicles` collection. The plate is AAA-0A00,
 * uppercase and 8 characters with the hyphen, the format that formatPlate produces. The model
 * has every word capitalized, and the odometer is the starting km of the vehicle (RB03), which
 * the app never edits afterwards (RB09).
 */
export const vehicleSchema = z.object({
    plate: z
        .string()
        .trim()
        .toUpperCase()
        .min(1, 'Informe a placa.')
        .regex(/^[A-Z]{3}-\d[A-Z0-9]\d{2}$/, 'Informe uma placa válida, como ABC-1D23.'),
    type: z.enum(
        VEHICLE_TYPES.map((type) => type.value),
        { error: 'Selecione o tipo.' },
    ),
    model: z
        .string()
        .trim()
        .min(1, 'Informe o modelo.')
        .max(100, 'O modelo deve ter no máximo 100 caracteres.')
        .transform(capitalizeWords),
    odometer: decimalField('Informe o km atual.'),
});

/**
 * Vehicle edit form (RF06): the registration form without the odometer, which is read-only after
 * registration (RB09).
 */
export const vehicleEditSchema = vehicleSchema.omit({ odometer: true });

/** What the vehicle form holds while it is being filled in. */
export type VehicleInput = z.input<typeof vehicleSchema>;

/** Values of the vehicle form once validated and converted. */
export type VehicleValues = z.output<typeof vehicleSchema>;

/** What the vehicle edit form holds while it is being filled in. */
export type VehicleEditInput = z.input<typeof vehicleEditSchema>;

/** Values of the vehicle edit form once validated and converted. */
export type VehicleEditValues = z.output<typeof vehicleEditSchema>;
