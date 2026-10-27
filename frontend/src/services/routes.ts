import type { RouteDepartureValues, RouteReturnValues } from '../schemas/route';
import { pb } from './pocketbase';
import { isNotFoundError } from './serverErrors';
import { toVehicle } from './vehicles';
import type { Vehicle } from './vehicles';

/**
 * Tells whether the driver has an open route (RB02). The list rule only shows a driver their own
 * routes, but a supervisor sees everyone's, so the filter names the user. The server refuses a
 * second open route anyway (`user_in_open_route`); this lets the screen warn before the form.
 */
export async function hasOpenRoute(userId: string): Promise<boolean> {
    const { totalItems } = await pb.collection('routes').getList(1, 1, {
        filter: pb.filter('user = {:userId} && status = "aberta"', { userId }),
    });

    return totalItems > 0;
}

/**
 * Starts a route (RF07). `kmDeparture` is the current km of the vehicle (RB03). The server sets
 * the author and the departure date; the create rule demands the `aberta` status, so it is sent.
 */
export async function createRoute(
    values: RouteDepartureValues,
    kmDeparture: number,
): Promise<void> {
    await pb.collection('routes').create({
        vehicle: values.vehicle,
        itinerary: values.itinerary,
        obs_departure: values.obs_departure,
        km_departure: kmDeparture,
        status: 'aberta',
    });
}

/** The open route of the driver, with the vehicle it took. */
export type OpenRoute = {
    id: string;
    itinerary: string;
    /** Server date of the departure, an ISO string. */
    dateDeparture: string;
    kmDeparture: number;
    obsDeparture: string;
    vehicle: Vehicle;
};

/**
 * Reads the open route of the driver, or null when there is none (RB02 allows at most one). The
 * filter names the user because a supervisor sees every route. The vehicle comes expanded, so the
 * return form can show it without another request.
 */
export async function getOpenRoute(userId: string): Promise<OpenRoute | null> {
    try {
        const record = await pb
            .collection('routes')
            .getFirstListItem(pb.filter('user = {:userId} && status = "aberta"', { userId }), {
                expand: 'vehicle',
            });

        return {
            id: record.id,
            itinerary: record.itinerary,
            dateDeparture: record.date_departure,
            kmDeparture: record.km_departure,
            obsDeparture: record.obs_departure,
            vehicle: toVehicle(record.expand?.vehicle),
        };
    } catch (error) {
        if (isNotFoundError(error)) {
            return null;
        }
        throw error;
    }
}

/**
 * Finalizes a route (RF09). The server sets `date_return` and makes the return km the current km
 * of the vehicle (RB03) in the same transaction; the update rule only lets the author do it, once.
 */
export async function finalizeRoute(routeId: string, values: RouteReturnValues): Promise<void> {
    await pb.collection('routes').update(routeId, {
        status: 'finalizada',
        km_return: values.km_return,
        obs_return: values.obs_return,
    });
}
