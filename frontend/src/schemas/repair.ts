import { z } from 'zod';

import { decimalField } from './common';

/** Longest description the server accepts (`repairs.description`), in characters. */
export const REPAIR_DESCRIPTION_MAX = 500;

/**
 * Repair form (RF13), with the field names of the `repairs` collection. The vehicle is the id
 * picked in the Select. The description is free text. Km and cost are typed in the decimal mask
 * (RB16) and must be greater than zero: the server refuses a zero in these required fields too.
 * The km is only informative and never changes the km of the vehicle (RB04). Author and date are
 * set by the server (RNF05), so they are not on the form.
 */
export const repairSchema = z.object({
    vehicle: z.string({ error: 'Selecione o veículo.' }).min(1, 'Selecione o veículo.'),
    km_repair: decimalField('Informe o km.').refine(
        (value) => value > 0,
        'O km deve ser maior que zero.',
    ),
    description: z
        .string()
        .trim()
        .min(1, 'Informe a descrição.')
        .max(
            REPAIR_DESCRIPTION_MAX,
            `A descrição deve ter no máximo ${REPAIR_DESCRIPTION_MAX} caracteres.`,
        ),
    cost: decimalField('Informe o valor.').refine(
        (value) => value > 0,
        'O valor deve ser maior que zero.',
    ),
});

/** What the repair form holds while it is being filled in. */
export type RepairInput = z.input<typeof repairSchema>;

/** Values of the repair form once validated and converted. */
export type RepairValues = z.output<typeof repairSchema>;
