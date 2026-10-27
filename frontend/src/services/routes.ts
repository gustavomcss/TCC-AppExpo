import type { RecordModel } from 'pocketbase';

import type { RouteDepartureValues, RouteReturnValues } from '../schemas/route';
import { fold } from './listFilters';
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

/** A route as the closure module lists it (RF10): open or already closed, with its driver and vehicle. */
export type ClosureRoute = {
    id: string;
    /** `aberta` can be closed; `encerrada` is only shown. `finalizada` routes never come here (RB10). */
    status: 'aberta' | 'encerrada';
    itinerary: string;
    /** Server date of the departure, an ISO string. */
    dateDeparture: string;
    kmDeparture: number;
    obsDeparture: string;
    driverName: string;
    vehicle: Vehicle;
};

/** Maps a `routes` record, read with `user` and `vehicle` expanded, to the route the closure screens show. */
function toClosureRoute(record: RecordModel): ClosureRoute {
    return {
        id: record.id,
        status: record.status,
        itinerary: record.itinerary,
        dateDeparture: record.date_departure,
        kmDeparture: record.km_departure,
        obsDeparture: record.obs_departure,
        driverName: record.expand?.user?.name ?? '',
        vehicle: toVehicle(record.expand?.vehicle),
    };
}

/**
 * Lists the routes of the closure module (RF10, RB10): the open ones, oldest first because those
 * are the ones forgotten, and then the closed ones, newest first. Finalized routes belong to the
 * history and are left out. Only a supervisor sees every driver's routes.
 */
export async function listClosureRoutes(): Promise<ClosureRoute[]> {
    const records = await pb.collection('routes').getFullList({
        filter: 'status != "finalizada"',
        sort: '-date_departure',
        expand: 'user,vehicle',
    });
    const routes = records.map(toClosureRoute);

    return [
        ...routes.filter((route) => route.status === 'aberta').reverse(),
        ...routes.filter((route) => route.status !== 'aberta'),
    ];
}

/** Situation filter of the closure list: every route, only the open ones or only the closed ones. */
export type ClosureStatusFilter = 'all' | ClosureRoute['status'];

/**
 * Narrows the loaded list by situation and by a search text that must appear in the driver's
 * name, the plate or the model of the vehicle, ignoring case and accents. It works on what the
 * list already holds, so typing sends no request. The hyphen of the plate is optional in the
 * text: "abc1d" finds ABC-1D23.
 */
export function filterClosureRoutes(
    routes: ClosureRoute[],
    query: string,
    status: ClosureStatusFilter,
): ClosureRoute[] {
    const term = fold(query.trim());
    const plateTerm = term.replace('-', '');

    return routes.filter((route) => {
        if (status !== 'all' && route.status !== status) {
            return false;
        }

        return (
            term === '' ||
            fold(route.driverName).includes(term) ||
            (plateTerm !== '' && fold(route.vehicle.plate).replace('-', '').includes(plateTerm)) ||
            fold(route.vehicle.model).includes(term)
        );
    });
}

/** Counts the open routes of every driver, for the badge of the closure card (supervisor only). */
export async function countOpenRoutes(): Promise<number> {
    const { totalItems } = await pb.collection('routes').getList(1, 1, {
        filter: 'status = "aberta"',
    });

    return totalItems;
}

/** Loads one route for the closure detail. The server answers 404 for a route the caller cannot see. */
export async function getClosureRoute(id: string): Promise<ClosureRoute> {
    const record = await pb.collection('routes').getOne(id, { expand: 'user,vehicle' });

    return toClosureRoute(record);
}

/**
 * Closes an open route administratively (RF10, RB15). Only the status is sent: no return km, so
 * the current km of the vehicle does not change, and the vehicle and the driver are free again
 * (RB01, RB02). The update rule lets only a supervisor do it, and only on an `aberta` route, so a
 * route the driver finalized in the meantime answers 404.
 */
export async function closeRoute(routeId: string): Promise<void> {
    await pb.collection('routes').update(routeId, { status: 'encerrada' });
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
