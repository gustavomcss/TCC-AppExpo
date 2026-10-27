import type { RouteDepartureValues } from '../schemas/route';
import { pb } from './pocketbase';

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
