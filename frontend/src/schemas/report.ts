import { z } from 'zod';

/**
 * Reads "DD/MM/AAAA" as a date at the start of that day in the device's time zone, or null when
 * the text is not a real date (31/02/2026 has the right shape but is not one).
 */
export function parseDate(text: string): Date | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);

    if (!match) {
        return null;
    }

    const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        ? date
        : null;
}

/** One date of the custom period, typed with the mask of `formatDateInput`. Yields a Date. */
const dateField = z
    .string()
    .trim()
    .transform((value, context) => {
        const date = parseDate(value);

        if (!date) {
            context.addIssue({ code: 'custom', message: 'Informe uma data válida.' });
            return z.NEVER;
        }

        return date;
    });

/**
 * Custom period of the report: both dates must be real and the end cannot come before the start
 * (a single day is a valid period). The end date is the last day included.
 */
export const reportPeriodSchema = z
    .object({ from: dateField, to: dateField })
    .refine(({ from, to }) => from <= to, {
        message: 'A data final deve ser igual ou posterior à inicial.',
        path: ['to'],
    });

/** The custom period as the user types it, and as it is read once valid. */
export type ReportPeriodInput = z.input<typeof reportPeriodSchema>;
export type ReportPeriodValues = z.output<typeof reportPeriodSchema>;
