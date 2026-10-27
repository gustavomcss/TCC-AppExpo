import { z } from 'zod';

import { decimalField } from './common';
import { formatKm } from './masks';

/** Longest itinerary or observation the `routes` text fields accept. */
export const ROUTE_TEXT_MAX = 500;

/**
 * Route departure form (RF07), with the field names of the `routes` collection. The vehicle is
 * the id picked in the Select. The itinerary and the observation are free text of at most
 * ROUTE_TEXT_MAX characters, the limit of the fields; only the itinerary is required. The
 * departure km is not on the form: it is the current km of the vehicle (RB03) and the app sends
 * it on its own.
 */
export const routeDepartureSchema = z.object({
    vehicle: z.string({ error: 'Selecione o veículo.' }).min(1, 'Selecione o veículo.'),
    itinerary: z
        .string()
        .trim()
        .min(1, 'Informe o itinerário.')
        .max(ROUTE_TEXT_MAX, `O itinerário deve ter no máximo ${ROUTE_TEXT_MAX} caracteres.`),
    obs_departure: z
        .string()
        .trim()
        .max(ROUTE_TEXT_MAX, `A observação deve ter no máximo ${ROUTE_TEXT_MAX} caracteres.`),
});

/** What the route departure form holds while it is being filled in. */
export type RouteDepartureInput = z.input<typeof routeDepartureSchema>;

/** Values of the route departure form once validated and converted. */
export type RouteDepartureValues = z.output<typeof routeDepartureSchema>;

/** Message for a return km that is not greater than the departure km (RB13). */
export function kmNotGreaterMessage(kmDeparture: number): string {
    return `O km de retorno deve ser maior que o km de saída (${formatKm(kmDeparture)}).`;
}

/**
 * Route return form (RF09), with the field names of the `routes` collection. The return km is
 * typed in the km mask and must be greater than the departure km of the route (RB13); the
 * observation is optional free text of at most ROUTE_TEXT_MAX characters. The departure km
 * comes from the open route, so the schema is built for it. The server checks the same rule
 * again (`km_return_not_greater`), which also covers a departure km corrected in the meantime.
 */
export function createRouteReturnSchema(kmDeparture: number) {
    return z.object({
        km_return: decimalField('Informe o km de retorno.').refine(
            (value) => value > kmDeparture,
            kmNotGreaterMessage(kmDeparture),
        ),
        obs_return: z
            .string()
            .trim()
            .max(ROUTE_TEXT_MAX, `A observação deve ter no máximo ${ROUTE_TEXT_MAX} caracteres.`),
    });
}

/** What the route return form holds while it is being filled in. */
export type RouteReturnInput = z.input<ReturnType<typeof createRouteReturnSchema>>;

/** Values of the route return form once validated and converted. */
export type RouteReturnValues = z.output<ReturnType<typeof createRouteReturnSchema>>;
