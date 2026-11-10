import type { RecordModel } from 'pocketbase';

import { toComplaint } from './complaints';
import type { Complaint, ComplaintStatus } from './complaints';
import { pb } from './pocketbase';
import { COLLECTIONS, EXPAND, toServiceRecord } from './serviceRecords';
import type { ServiceKind, ServiceRecord } from './serviceRecords';
import { toVehicle } from './vehicles';
import type { Vehicle } from './vehicles';
import { vehicleSearchMatches } from './vehicleSearch';

/** The five modules of the history tab (RF17), in the order the chips appear. */
export type HistoryModule = 'routes' | 'complaints' | 'fuels' | 'oils' | 'repairs';

/** Period shortcuts of the history filter: this month, last month or the last 3 or 6 months. */
export type HistoryPeriod = 'month' | 'previous' | 'quarter' | 'semester';

/** Options of the period filter, in the order the select lists them. */
export const HISTORY_PERIODS: readonly { value: HistoryPeriod; label: string }[] = [
    { value: 'month', label: 'Este mês' },
    { value: 'previous', label: 'Mês anterior' },
    { value: 'quarter', label: 'Últimos 3 meses' },
    { value: 'semester', label: 'Últimos 6 meses' },
];

/**
 * What narrows a history list: a search text (`byDriver` makes it match the driver's name too), a
 * vehicle type and a period; `null` in the type or in the period keeps everything.
 */
export type HistoryFilters = {
    query: string;
    byDriver: boolean;
    type: Vehicle['type'] | null;
    period: HistoryPeriod | null;
};

/** A finalized route as the history lists it (RB10: open and closed routes never come here). */
export type HistoryRoute = {
    kind: 'route';
    id: string;
    itinerary: string;
    /** Server dates of the departure and of the return, ISO strings. */
    dateDeparture: string;
    dateReturn: string;
    kmDeparture: number;
    kmReturn: number;
    driverName: string;
    vehicle: Vehicle;
    /** Situation of the complaint filed on the route, or null when there is none (RF19). */
    complaintStatus: ComplaintStatus | null;
};

/** A complaint as the history lists it: what was reported on which route and vehicle, and by whom. */
export type HistoryComplaint = Complaint & {
    kind: 'complaint';
    driverName: string;
    vehicle: Vehicle;
    /** Departure km of the reported route, to read next to the km informed. */
    kmDeparture: number;
};

/** Any item of the history. */
export type HistoryItem = HistoryRoute | HistoryComplaint | ServiceRecord;

/** One page of a history list, and whether there are more after it. */
export type HistoryPage = { items: HistoryItem[]; hasMore: boolean };

/** How many items each request brings; the list asks for the next page as it nears the end. */
export const HISTORY_PAGE_SIZE = 10;

/** The service kind behind each service module of the history. */
const SERVICE_KINDS: Partial<Record<HistoryModule, ServiceKind>> = {
    fuels: 'fuel',
    oils: 'oil',
    repairs: 'repair',
};

/** Date that places an item in the period: the return of a route, the creation of anything else. */
const DATE_FIELDS: Record<HistoryModule, string> = {
    routes: 'date_return',
    complaints: 'created',
    fuels: 'created',
    oils: 'created',
    repairs: 'created',
};

/**
 * Bounds of a period in the device's time zone, as dates to give the server: `from` is included
 * and `to` is not, and a missing bound is open. "Últimos 3 meses" and "Últimos 6 meses" count
 * back from today, the others are whole calendar months.
 */
export function periodRange(
    period: HistoryPeriod | null,
    now: Date = new Date(),
): { from?: Date; to?: Date } {
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (period) {
        case 'month':
            return { from: new Date(year, month, 1), to: new Date(year, month + 1, 1) };
        case 'previous':
            return { from: new Date(year, month - 1, 1), to: new Date(year, month, 1) };
        case 'quarter':
            return { from: new Date(year, month - 3, now.getDate()) };
        case 'semester':
            return { from: new Date(year, month - 6, now.getDate()) };
        case null:
            return {};
    }
}

/**
 * Builds the server filter of a history list. The path to the vehicle depends on the module: a
 * complaint reaches it through its route. The search text must appear in the model, in the
 * plate or, when `byDriver` is on, in the name of the driver (see `vehicleSearchMatches`). Routes
 * are always only the finalized ones (RB10). Who may read what is not decided here: the API rules
 * show a driver only their own records (RF17).
 */
export function buildHistoryFilter(
    module: HistoryModule,
    { query, byDriver, type, period }: HistoryFilters,
    now: Date = new Date(),
): string {
    const vehicle = module === 'complaints' ? 'route_current.vehicle' : 'vehicle';
    const driver = module === 'complaints' ? 'route_current.user' : 'user';
    const parts: string[] = [];

    if (module === 'routes') {
        parts.push('status = "finalizada"');
    }

    const term = query.trim();
    if (term !== '') {
        const matches = vehicleSearchMatches(vehicle, term);

        if (byDriver) {
            matches.push(pb.filter(`${driver}.name ~ {:term}`, { term }));
        }
        parts.push(`(${matches.join(' || ')})`);
    }

    if (type) {
        parts.push(pb.filter(`${vehicle}.type = {:type}`, { type }));
    }

    const { from, to } = periodRange(period, now);
    if (from) {
        parts.push(pb.filter(`${DATE_FIELDS[module]} >= {:from}`, { from }));
    }
    if (to) {
        parts.push(pb.filter(`${DATE_FIELDS[module]} < {:to}`, { to }));
    }

    return parts.join(' && ');
}

/**
 * Relations read with a route: the driver, the vehicle and the complaint filed on it. The last is
 * a back-relation of `complaints.route_current`, which is unique, so it comes as one record.
 */
const ROUTE_EXPAND = 'user,vehicle,complaints_via_route_current';

/** Maps a `routes` record, read with `ROUTE_EXPAND`, to the route the history shows. */
function toHistoryRoute(record: RecordModel): HistoryRoute {
    return {
        kind: 'route',
        id: record.id,
        itinerary: record.itinerary,
        dateDeparture: record.date_departure,
        dateReturn: record.date_return,
        kmDeparture: record.km_departure,
        kmReturn: record.km_return,
        driverName: record.expand?.user?.name ?? '',
        vehicle: toVehicle(record.expand?.vehicle),
        complaintStatus: record.expand?.complaints_via_route_current?.status ?? null,
    };
}

/** Relations read with a complaint: the route, with the driver and the vehicle of it. */
const COMPLAINT_EXPAND = 'route_current.user,route_current.vehicle';

/** Maps a `complaints` record, read with `COMPLAINT_EXPAND`, to the complaint the history shows. */
function toHistoryComplaint(record: RecordModel): HistoryComplaint {
    const route = record.expand?.route_current;

    return {
        ...toComplaint(record),
        kind: 'complaint',
        driverName: route?.expand?.user?.name ?? '',
        vehicle: toVehicle(route?.expand?.vehicle),
        kmDeparture: route?.km_departure ?? 0,
    };
}

/**
 * Loads one page of a history module (RF17), the latest first, narrowed by the filters. The
 * filtering, the order and the paging are the server's, so a long history is never read whole.
 * A driver gets only their own records and a supervisor everyone's, by the API rules.
 */
export async function listHistory(
    module: HistoryModule,
    filters: HistoryFilters,
    page: number,
): Promise<HistoryPage> {
    const filter = buildHistoryFilter(module, filters);
    const kind = SERVICE_KINDS[module];

    if (kind) {
        const result = await pb
            .collection(COLLECTIONS[kind].name)
            .getList(page, HISTORY_PAGE_SIZE, { filter, sort: '-created', expand: EXPAND });

        return {
            items: result.items.map((record) => toServiceRecord(kind, record)),
            hasMore: page < result.totalPages,
        };
    }

    if (module === 'routes') {
        const result = await pb.collection('routes').getList(page, HISTORY_PAGE_SIZE, {
            filter,
            sort: '-date_return',
            expand: ROUTE_EXPAND,
        });

        return { items: result.items.map(toHistoryRoute), hasMore: page < result.totalPages };
    }

    const result = await pb.collection('complaints').getList(page, HISTORY_PAGE_SIZE, {
        filter,
        sort: '-created',
        expand: COMPLAINT_EXPAND,
    });

    return { items: result.items.map(toHistoryComplaint), hasMore: page < result.totalPages };
}
