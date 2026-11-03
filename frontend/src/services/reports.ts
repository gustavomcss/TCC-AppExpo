import type { RecordModel } from 'pocketbase';

import type { VehicleType } from '../components/vehicleTypeOptions';
import { periodRange, vehicleSearchMatches } from './history';
import type { HistoryPeriod } from './history';
import { pb } from './pocketbase';
import { buildReport } from './reportTotals';
import type { Report, ReportEntry } from './reportTotals';
import { COLLECTIONS } from './serviceRecords';
import type { ServiceKind } from './serviceRecords';
import { toVehicle } from './vehicles';

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

/** What is read of each record: the cost and the vehicle, which is all the report adds up. */
const REPORT_FIELDS = 'id,cost,vehicle,expand.vehicle';

/** Maps a record of `fuels`, `oils` or `repairs`, read with `REPORT_FIELDS`, to an entry of the report. */
function toEntry(kind: ServiceKind, record: RecordModel): ReportEntry {
    const { id, plate, model, type, active } = toVehicle(record.expand?.vehicle);

    return { kind, vehicle: { id, plate, model, type, active }, cost: record.cost };
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
    );
}
