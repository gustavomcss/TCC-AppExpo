import type { RecordModel } from 'pocketbase';

import type { VehicleType } from '../components/vehicleTypeOptions';
import { formatDay } from '../schemas/masks';
import { buildComplaintReport } from './complaintTotals';
import type { ComplaintEntry, ComplaintReport } from './complaintTotals';
import { periodRange } from './history';
import { vehicleSearchMatches } from './vehicleSearch';
import type { HistoryPeriod } from './history';
import { buildKmReport } from './kmTotals';
import type { KmEntry, KmReport } from './kmTotals';
import { pb } from './pocketbase';
import type { ReportFilters } from './reportDocument';
import { buildReport } from './reportTotals';
import type { Report, ReportEntry } from './reportTotals';
import { COLLECTIONS } from './serviceRecords';
import type { ServiceKind } from './serviceRecords';
import { toVehicle, typeLabel } from './vehicles';

/** The period shortcuts of the history, plus a period with dates typed by the user. No period at all is the whole history. */
export type ReportPeriod = HistoryPeriod | 'custom';

/** Options of the period select, in the order it lists them. */
export const REPORT_PERIODS: readonly { value: ReportPeriod; label: string }[] = [
    { value: 'month', label: 'Este mês' },
    { value: 'previous', label: 'Mês anterior' },
    { value: 'quarter', label: 'Últimos 3 meses' },
    { value: 'semester', label: 'Últimos 6 meses' },
    { value: 'custom', label: 'Personalizado' },
];

/** The three services of the report, in the order they are listed, with the name the user reads. */
export const REPORT_SERVICES: readonly { value: ServiceKind; label: string }[] = [
    { value: 'fuel', label: 'Abastecimento' },
    { value: 'oil', label: 'Troca de óleo' },
    { value: 'repair', label: 'Manutenção' },
];

/** The reports of the module (RF22, RF23), in the order the select lists them. */
export type ReportKind = 'financial' | 'km' | 'complaints';

/** A period as dates: `from` is the first moment included and `to` the first one left out. */
export type ReportRange = { from: Date; to: Date };

/**
 * What the report is about: the period, a search text for the vehicle (model or plate), a vehicle
 * type and a service; `null` in the period, in the type or in the service keeps everything.
 */
export type ReportQuery = {
    range: ReportRange | null;
    query?: string;
    type: VehicleType | null;
    service: ServiceKind | null;
};

/** What the km report is about: the period and a vehicle type; `null` keeps everything. */
export type KmQuery = { range: ReportRange | null; type: VehicleType | null };

/** What the complaints report is about: the same as the km report, the period and a vehicle type. */
export type ComplaintQuery = KmQuery;

/** A range as the user reads it, with the last day included: "01/11/2026 a 30/11/2026". */
export function formatRange(range: ReportRange): string {
    const last = new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate() - 1);

    return `${formatDay(range.from)} a ${formatDay(last)}`;
}

/** The period as the PDF prints it: a shortcut shows its dates too, and no period is the whole history. */
function describePeriod(period: ReportPeriod | null, range: ReportRange | null): string {
    const shortcut = REPORT_PERIODS.find((item) => item.value === period)?.label;

    if (!range) {
        return 'Todo o período';
    }

    return period === 'custom' || !shortcut
        ? formatRange(range)
        : `${shortcut} (${formatRange(range)})`;
}

/**
 * The filters of the financial report as texts, for the PDF: the period, the vehicle type and
 * the service, each saying "all" when nothing is chosen, as the selects do.
 */
export function describeFilters(period: ReportPeriod | null, query: ReportQuery): ReportFilters {
    return [
        { label: 'Período', text: describePeriod(period, query.range), wide: true },
        {
            label: 'Tipo de veículo',
            text: query.type ? typeLabel(query.type) : 'Todos os veículos',
        },
        {
            label: 'Tipo de serviço',
            text:
                REPORT_SERVICES.find((item) => item.value === query.service)?.label ??
                'Todos os serviços',
        },
    ];
}

/** The filters of the km report as texts, for the PDF: the period and the vehicle type. */
export function describeKmFilters(period: ReportPeriod | null, query: KmQuery): ReportFilters {
    return [
        { label: 'Período', text: describePeriod(period, query.range), wide: true },
        {
            label: 'Tipo de veículo',
            text: query.type ? typeLabel(query.type) : 'Todos os veículos',
        },
    ];
}

/** The day after the given one, at midnight, in the device's time zone. */
function dayAfter(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/**
 * Dates of a shortcut period, with the same bounds the history uses. The periods counted back from
 * today end with today, which is why the end is the start of tomorrow.
 */
export function shortcutRange(period: HistoryPeriod, now: Date = new Date()): ReportRange {
    const { from, to } = periodRange(period, now);

    return { from: from as Date, to: to ?? dayAfter(now) };
}

/** Dates of a custom period: both days typed are included, so the end is the start of the day after. */
export function customRange(from: Date, to: Date): ReportRange {
    return { from, to: dayAfter(to) };
}

/**
 * Builds the server filter of the report for one service: the records created in the period, of
 * the vehicles that match the search text and the type (no period keeps all dates). The search is the same as the history's.
 * Who may read what is not decided here: the API rules show a driver only their own records.
 */
export function buildReportFilter({ range, query, type }: ReportQuery): string {
    const parts: string[] = [];

    if (range) {
        parts.push(
            pb.filter('created >= {:from} && created < {:to}', { from: range.from, to: range.to }),
        );
    }

    const term = (query ?? '').trim();
    if (term !== '') {
        parts.push(`(${vehicleSearchMatches('vehicle', term).join(' || ')})`);
    }

    if (type) {
        parts.push(pb.filter('vehicle.type = {:type}', { type }));
    }

    return parts.join(' && ');
}

/** What is read of each record: the cost, the vehicle and when it was created, which is all the report adds up. */
const REPORT_FIELDS = 'id,cost,created,vehicle,expand.vehicle';

/** Maps a record of `fuels`, `oils` or `repairs`, read with `REPORT_FIELDS`, to an entry of the report. */
function toEntry(kind: ServiceKind, record: RecordModel): ReportEntry {
    const { id, plate, model, type, active } = toVehicle(record.expand?.vehicle);

    return {
        kind,
        vehicle: { id, plate, model, type, active },
        cost: record.cost,
        created: record.created,
    };
}

/**
 * Loads the financial report (RF22): reads the records of each service in the filter, as many as
 * there are, and groups them by vehicle in the app. The filtering is the server's, so only the
 * records of the period and of the vehicles asked for are read, but the sum is made here: the
 * totals come from the same records the history lists. A supervisor reads everyone's records and
 * a driver only their own, by the API rules.
 */
export async function loadReport(query: ReportQuery): Promise<Report> {
    const filter = buildReportFilter(query);
    const kinds = REPORT_SERVICES.map((service) => service.value).filter(
        (kind) => query.service === null || kind === query.service,
    );

    const lists = await Promise.all(
        kinds.map((kind) =>
            pb
                .collection(COLLECTIONS[kind].name)
                .getFullList({ filter, expand: 'vehicle', fields: REPORT_FIELDS }),
        ),
    );

    return buildReport(
        lists.flatMap((records, index) => records.map((record) => toEntry(kinds[index], record))),
        query.range,
    );
}

/**
 * Builds the server filter of the km report: the finalized routes (RB10) that returned in the
 * period, as the history places them, of the vehicles of the type (no period keeps all dates).
 * Who may read what is not decided here: the API rules show a driver only their own routes.
 */
export function buildKmFilter({ range, type }: KmQuery): string {
    const parts = ['status = "finalizada"'];

    if (range) {
        parts.push(
            pb.filter('date_return >= {:from} && date_return < {:to}', {
                from: range.from,
                to: range.to,
            }),
        );
    }

    if (type) {
        parts.push(pb.filter('vehicle.type = {:type}', { type }));
    }

    return parts.join(' && ');
}

/** What is read of each route: the two readings of the odometer and the vehicle, which is all the km report adds up. */
const KM_FIELDS = 'id,km_departure,km_return,vehicle,expand.vehicle';

/** Maps a `routes` record, read with `KM_FIELDS`, to an entry of the km report. */
function toKmEntry(record: RecordModel): KmEntry {
    const { id, plate, model, type, active } = toVehicle(record.expand?.vehicle);

    return {
        vehicle: { id, plate, model, type, active },
        kmDeparture: record.km_departure,
        kmReturn: record.km_return,
    };
}

/**
 * Loads the km report (RF23): reads the finalized routes of the filter, as many as there are, and
 * adds the km of each vehicle in the app. The filtering is the server's, and the km of a route
 * are the ones the history shows on its card, so the totals match it.
 */
export async function loadKmReport(query: KmQuery): Promise<KmReport> {
    const records = await pb.collection('routes').getFullList({
        filter: buildKmFilter(query),
        expand: 'vehicle',
        fields: KM_FIELDS,
    });

    return buildKmReport(records.map(toKmEntry));
}

/**
 * Builds the server filter of the complaints report: the complaints created in the period, of the
 * vehicles of the type (reached through the route of the complaint); no period or no type keeps
 * everything. Who may read what is not decided here: the API rules show a driver only the
 * complaints of their own routes.
 */
export function buildComplaintFilter({ range, type }: ComplaintQuery): string {
    const parts: string[] = [];

    if (range) {
        parts.push(
            pb.filter('created >= {:from} && created < {:to}', { from: range.from, to: range.to }),
        );
    }

    if (type) {
        parts.push(pb.filter('route_current.vehicle.type = {:type}', { type }));
    }

    return parts.join(' && ');
}

/** What is read of each complaint: the situation and the route it was filed on, with the driver and the vehicle of it. */
const COMPLAINT_FIELDS = 'id,status,expand.route_current';

/** Maps a `complaints` record, read with `COMPLAINT_FIELDS`, to an entry of the complaints report. */
function toComplaintEntry(record: RecordModel): ComplaintEntry {
    const route = record.expand?.route_current;
    const { id, plate, model, type, active } = toVehicle(route?.expand?.vehicle);

    return {
        status: record.status,
        vehicle: { id, plate, model, type, active },
        driver: {
            id: route?.expand?.user?.id ?? '',
            name: route?.expand?.user?.name ?? '',
            role: route?.expand?.user?.role ?? 'motorista',
        },
    };
}

/**
 * Loads the complaints report (RF23): reads the complaints of the filter, as many as there are,
 * with the route of each one expanded to its driver and vehicle, and counts them in the app. The
 * filtering is the server's, and the driver of a complaint is the user of its route, as in the
 * history.
 */
export async function loadComplaintReport(query: ComplaintQuery): Promise<ComplaintReport> {
    const records = await pb.collection('complaints').getFullList({
        filter: buildComplaintFilter(query),
        expand: 'route_current.user,route_current.vehicle',
        fields: COMPLAINT_FIELDS,
    });

    return buildComplaintReport(records.map(toComplaintEntry));
}
