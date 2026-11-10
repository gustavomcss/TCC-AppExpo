import type { RecordModel } from 'pocketbase';

import type { RouteDepartureValues, RouteReturnValues } from '../schemas/route';
import type { ComplaintStatus } from './complaints';
import { pb } from './pocketbase';
import { LIST_PAGE_SIZE, readSegmentedPage } from './segmentedList';
import type { Segment, SegmentedPage } from './segmentedList';
import { isNotFoundError } from './serverErrors';
import { toVehicle } from './vehicles';
import type { Vehicle } from './vehicles';
import { supervisorSearchFilter } from './vehicleSearch';

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
    /** Situation of the complaint of the route, or null when it has none (RF19). */
    complaintStatus: ComplaintStatus | null;
};

/** Maps a `routes` record, read with `user` and `vehicle` expanded (and, in the list, its complaint), to the route the closure screens show. */
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
        complaintStatus: record.expand?.complaints_via_route_current?.status ?? null,
    };
}

/** Situation filter of the closure list: every route, only the open ones or only the closed ones. */
export type ClosureStatusFilter = 'all' | ClosureRoute['status'];

/** What narrows the closure list: a search text (driver, plate or model) and the situation. */
export type ClosureFilters = { query: string; status: ClosureStatusFilter };

/**
 * The queries behind the closure list (RF10, RB10), in the order they are shown: the open routes,
 * oldest first because those are the ones forgotten, and then the closed ones, newest first. A
 * situation chip keeps only its query. Finalized routes belong to the history and are left out.
 * The search text must appear in the name of the driver, the plate or the model of the vehicle
 * (see `supervisorSearchFilter`); the server does not ignore accents, only case. Ties are broken
 * by `id`, so pages never repeat or skip a route.
 */
export function closureSegments({ query, status }: ClosureFilters): Segment[] {
    const search = supervisorSearchFilter('vehicle', 'user', query);
    const withSearch = (filter: string) => (search === '' ? filter : `${filter} && ${search}`);
    const open: Segment = { filter: withSearch('status = "aberta"'), sort: 'date_departure,id' };
    const closed: Segment = {
        filter: withSearch('status = "encerrada"'),
        sort: '-date_departure,-id',
    };

    if (status === 'aberta') {
        return [open];
    }

    return status === 'encerrada' ? [closed] : [open, closed];
}

/**
 * Loads one page of the closure list (RF10): the filtering, the order and the paging are the
 * server's, so a long history of closed routes is never read whole. Only a supervisor sees every
 * driver's routes.
 */
export function listClosureRoutes(
    filters: ClosureFilters,
    page: number,
): Promise<SegmentedPage<ClosureRoute>> {
    return readSegmentedPage(
        closureSegments(filters),
        page,
        LIST_PAGE_SIZE,
        async (segment, p, perPage) => {
            const result = await pb.collection('routes').getList(p, perPage, {
                filter: segment.filter,
                sort: segment.sort,
                expand: 'user,vehicle,complaints_via_route_current',
            });

            return { items: result.items.map(toClosureRoute), totalItems: result.totalItems };
        },
    );
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
