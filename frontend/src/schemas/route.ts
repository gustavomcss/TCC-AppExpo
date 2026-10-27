import { z } from 'zod';

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
