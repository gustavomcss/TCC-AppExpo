import { z } from 'zod';

import { decimalField } from './common';

/** Longest oil type the server accepts (`oils.type`), in characters. */
export const OIL_TYPE_MAX = 100;

/**
 * Oil change form (RF12), with the field names of the `oils` collection. The vehicle is the id
 * picked in the Select. The oil type is free text. Km and cost are typed in the decimal mask
 * (RB16) and must be greater than zero: the server refuses a zero in these required fields too.
 * The km is only informative and never changes the km of the vehicle (RB04). Author and date are
 * set by the server (RNF05), so they are not on the form.
 */
export const oilSchema = z.object({
    vehicle: z.string({ error: 'Selecione o veículo.' }).min(1, 'Selecione o veículo.'),
    km_oil: decimalField('Informe o km.').refine(
        (value) => value > 0,
        'O km deve ser maior que zero.',
    ),
    type: z
        .string()
        .trim()
        .min(1, 'Informe o tipo do óleo.')
        .max(OIL_TYPE_MAX, `O tipo do óleo deve ter no máximo ${OIL_TYPE_MAX} caracteres.`),
    cost: decimalField('Informe o valor.').refine(
        (value) => value > 0,
        'O valor deve ser maior que zero.',
    ),
});

/** What the oil change form holds while it is being filled in. */
export type OilInput = z.input<typeof oilSchema>;

/** Values of the oil change form once validated and converted. */
export type OilValues = z.output<typeof oilSchema>;
