import type { ServiceKind } from './serviceRecords';
import type { Vehicle } from './vehicles';

/** The vehicle data a report line needs. Inactive vehicles are reported too (RB12). */
export type ReportVehicle = Pick<Vehicle, 'id' | 'plate' | 'model' | 'type' | 'active'>;

/** One service record reduced to what the report adds up. */
export type ReportEntry = { kind: ServiceKind; vehicle: ReportVehicle; cost: number };

/** How many records of a service and what they add up to. */
export type ServiceTotal = { count: number; total: number };

/** The totals of one vehicle: each service, and the vehicle's own total. */
export type VehicleTotals = {
    vehicle: ReportVehicle;
    services: Record<ServiceKind, ServiceTotal>;
    count: number;
    total: number;
};

/** The financial report: the totals per vehicle, plus the general total and the total of each service. */
export type Report = {
    vehicles: VehicleTotals[];
    services: Record<ServiceKind, ServiceTotal>;
    count: number;
    total: number;
};

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

/**
 * Groups the records by vehicle (RF22): the total of each service per vehicle, the total of the
 * vehicle and the general total, which is the sum of the vehicles. Costs are added in cents. The
 * vehicles come by plate, so a line can be matched to the history by eye. A vehicle only appears
 * when it has a record, whatever its situation (RB12).
 */
export function buildReport(entries: readonly ReportEntry[]): Report {
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

    return { vehicles, ...toTotals(general) };
}
