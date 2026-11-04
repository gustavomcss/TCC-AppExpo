import { parseServerDate } from '../schemas/masks';
import type { ServiceKind } from './serviceRecords';
import type { Vehicle } from './vehicles';

/** The vehicle data a report line needs. Inactive vehicles are reported too (RB12). */
export type ReportVehicle = Pick<Vehicle, 'id' | 'plate' | 'model' | 'type' | 'active'>;

/** One service record reduced to what the report adds up. */
export type ReportEntry = {
    kind: ServiceKind;
    vehicle: ReportVehicle;
    cost: number;
    /** When the record was created, as the server sends it. */
    created: string;
};

/** How many records of a service and what they add up to. */
export type ServiceTotal = { count: number; total: number };

/** The totals of one vehicle: each service, and the vehicle's own total. */
export type VehicleTotals = {
    vehicle: ReportVehicle;
    services: Record<ServiceKind, ServiceTotal>;
    count: number;
    total: number;
};

/**
 * What the records of one calendar month add up to, in all and per service; `month` is 0 for
 * January, as in `Date`.
 */
export type MonthTotal = {
    year: number;
    month: number;
    total: number;
    services: Record<ServiceKind, number>;
};

/**
 * The financial report: the totals per vehicle, plus the general total, the total of each service
 * and the total of each month of the period.
 */
export type Report = {
    vehicles: VehicleTotals[];
    months: MonthTotal[];
    services: Record<ServiceKind, ServiceTotal>;
    count: number;
    total: number;
};

/** "Nenhum registro", "1 registro" or "N registros". */
export function countLabel(count: number): string {
    if (count === 0) {
        return 'Nenhum registro';
    }

    return count === 1 ? '1 registro' : `${count} registros`;
}

/** A total still in cents, so that adding many records never drifts by a fraction of a cent. */
type Cents = { count: number; cents: number };

const KINDS: readonly ServiceKind[] = ['fuel', 'oil', 'repair'];

/** Starts the counters of the three services. */
function emptyServices(): Record<ServiceKind, Cents> {
    return {
        fuel: { count: 0, cents: 0 },
        oil: { count: 0, cents: 0 },
        repair: { count: 0, cents: 0 },
    };
}

/** Turns the counters of the three services into totals in reais, and adds them up. */
function toTotals(services: Record<ServiceKind, Cents>) {
    const result = {} as Record<ServiceKind, ServiceTotal>;
    let count = 0;
    let cents = 0;

    for (const kind of KINDS) {
        result[kind] = { count: services[kind].count, total: services[kind].cents / 100 };
        count += services[kind].count;
        cents += services[kind].cents;
    }

    return { services: result, count, total: cents / 100 };
}

/** The month of a date as one number, so that months can be counted and compared: year * 12 + month. */
function monthIndex(date: Date): number {
    return date.getFullYear() * 12 + date.getMonth();
}

/**
 * Adds up the records by calendar month, in the device's time zone, from the first month of the
 * period to the last, with 0 for a month that has no record (so a line drawn from it does not
 * skip a month), each month split by service. Without a period, it goes from the first month with records to the last.
 */
function monthlyTotals(
    entries: readonly ReportEntry[],
    range: { from: Date; to: Date } | null,
): MonthTotal[] {
    const cents = new Map<number, Record<ServiceKind, number>>();

    for (const { kind, created, cost } of entries) {
        const index = monthIndex(parseServerDate(created));
        const month = cents.get(index) ?? { fuel: 0, oil: 0, repair: 0 };

        month[kind] += Math.round(cost * 100);
        cents.set(index, month);
    }

    if (cents.size === 0) {
        return [];
    }

    const indexes = [...cents.keys()];
    const first = range ? monthIndex(range.from) : Math.min(...indexes);
    const last = range ? monthIndex(new Date(range.to.getTime() - 1)) : Math.max(...indexes);
    const months: MonthTotal[] = [];

    for (let index = first; index <= last; index += 1) {
        const month = cents.get(index) ?? { fuel: 0, oil: 0, repair: 0 };

        months.push({
            year: Math.floor(index / 12),
            month: index % 12,
            total: (month.fuel + month.oil + month.repair) / 100,
            services: { fuel: month.fuel / 100, oil: month.oil / 100, repair: month.repair / 100 },
        });
    }

    return months;
}

/**
 * Groups the records by vehicle (RF22): the total of each service per vehicle, the total of the
 * vehicle and the general total, which is the sum of the vehicles. Costs are added in cents. The
 * vehicles come by plate, so a line can be matched to the history by eye. A vehicle only appears
 * when it has a record, whatever its situation (RB12). The months follow the period given, or the
 * records when there is none.
 */
export function buildReport(
    entries: readonly ReportEntry[],
    range: { from: Date; to: Date } | null = null,
): Report {
    const byVehicle = new Map<
        string,
        { vehicle: ReportVehicle; services: Record<ServiceKind, Cents> }
    >();
    const general = emptyServices();

    for (const { kind, vehicle, cost } of entries) {
        const cents = Math.round(cost * 100);
        const line = byVehicle.get(vehicle.id) ?? { vehicle, services: emptyServices() };

        line.services[kind].count += 1;
        line.services[kind].cents += cents;
        general[kind].count += 1;
        general[kind].cents += cents;
        byVehicle.set(vehicle.id, line);
    }

    const vehicles = [...byVehicle.values()]
        .map(({ vehicle, services }) => ({ vehicle, ...toTotals(services) }))
        .sort((a, b) =>
            a.vehicle.plate < b.vehicle.plate ? -1 : a.vehicle.plate > b.vehicle.plate ? 1 : 0,
        );

    return { vehicles, months: monthlyTotals(entries, range), ...toTotals(general) };
}
