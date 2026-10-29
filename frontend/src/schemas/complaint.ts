import { z } from 'zod';

import { decimalField } from './common';
import { formatKm } from './masks';

/** Message for a complaint km equal to the departure km of the route (RB11). */
export function kmEqualsDepartureMessage(kmDeparture: number): string {
    return `O km informado deve ser diferente do km de saída (${formatKm(kmDeparture)}).`;
}

/** The photo of the odometer as picked on the device, with what the form shows about it. */
export type ComplaintPhoto = {
    uri: string;
    /** Name of the file, shown in the field. */
    name: string;
    /** Size in bytes, when the device tells it. */
    size?: number;
    source: 'camera' | 'library';
};

/**
 * Km complaint form (RF14), with the field names of the `complaints` collection. The km is the
 * real one on the odometer, typed in the km mask, greater than zero (the server refuses a zero in
 * a required number) and different from the departure km of the route (RB11). The photo of the
 * odometer is required and is the file picked on the device. The departure km comes from the open
 * route, so the schema is built for it; the server checks the same rule again
 * (`km_equals_departure`). The route and the status are not on the form: the app sends them.
 */
export function createComplaintSchema(kmDeparture: number) {
    return z.object({
        km_complaint: decimalField('Informe o km real do veículo.')
            .refine((value) => value > 0, 'O km deve ser maior que zero.')
            .refine((value) => value !== kmDeparture, kmEqualsDepartureMessage(kmDeparture)),
        photo: z.object(
            {
                uri: z.string().min(1),
                name: z.string(),
                size: z.number().optional(),
                source: z.enum(['camera', 'library']),
            },
            { error: 'Anexe uma foto do painel.' },
        ),
    });
}

/** What the complaint form holds while it is being filled in. */
export type ComplaintInput = z.input<ReturnType<typeof createComplaintSchema>>;

/** Values of the complaint form once validated and converted. */
export type ComplaintValues = z.output<ReturnType<typeof createComplaintSchema>>;
