import { z } from 'zod';

import { decimalField } from './common';

/** Fuel types as stored by the server (model data) and as the user sees them. */
export const FUEL_TYPES = [
    { value: 'gasolina', label: 'Gasolina' },
    { value: 'aditivada', label: 'Aditivada' },
    { value: 'etanol', label: 'Etanol' },
    { value: 'diesel', label: 'Diesel' },
] as const;

/**
 * Fueling form (RF11), with the field names of the `fuels` collection. The vehicle is the id
 * picked in the Select. Km, liters and cost are typed in the decimal mask (RB16) and must be
 * greater than zero: the server refuses a zero in these required fields too. The km is only
 * informative and never changes the km of the vehicle (RB04). Author and date are set by the
 * server (RNF05), so they are not on the form.
 */
export const fuelSchema = z.object({
    vehicle: z.string({ error: 'Selecione o veículo.' }).min(1, 'Selecione o veículo.'),
    km_fuel: decimalField('Informe o km.').refine(
        (value) => value > 0,
        'O km deve ser maior que zero.',
    ),
    type: z.enum(
        FUEL_TYPES.map((type) => type.value),
        { error: 'Selecione o combustível.' },
    ),
    liters: decimalField('Informe os litros.').refine(
        (value) => value > 0,
        'Os litros devem ser maiores que zero.',
    ),
    cost: decimalField('Informe o valor.').refine(
        (value) => value > 0,
        'O valor deve ser maior que zero.',
    ),
});

/** What the fueling form holds while it is being filled in. */
export type FuelInput = z.input<typeof fuelSchema>;

/** Values of the fueling form once validated and converted. */
export type FuelValues = z.output<typeof fuelSchema>;
