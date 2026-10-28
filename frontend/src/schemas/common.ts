import { z } from 'zod';

/**
 * Km or money value typed in a text input (RB16), in the format of formatDecimalInput
 * (123.456,78): up to six integer digits and two decimals, which is 0 to 999.999,99. Yields a
 * number. The server checks the same limits again, so this only gives the feedback before sending.
 */
export function decimalField(requiredMessage: string) {
    return z
        .string()
        .trim()
        .min(1, requiredMessage)
        .transform((value) => value.replace(/\./g, ''))
        .pipe(z.string().regex(/^\d{1,6}(,\d{0,2})?$/, 'Informe um valor válido, como 12.345,67.'))
        .transform((value) => Number(value.replace(',', '.')));
}
