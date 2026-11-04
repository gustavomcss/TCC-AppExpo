import type { ComplaintStatus } from './complaints';
import type { ReportVehicle } from './reportTotals';

/** The three situations of a complaint, in the order the report lists them, with the name the user reads. */
export const COMPLAINT_STATUSES: readonly { value: ComplaintStatus; label: string }[] = [
    { value: 'pendente', label: 'Pendentes' },
    { value: 'aprovada', label: 'Aprovadas' },
    { value: 'reprovada', label: 'Reprovadas' },
];

/** Role names as the user reads them. */
const ROLE_LABELS: Record<ReportDriver['role'], string> = {
    motorista: 'Motorista',
    supervisor: 'Supervisor',
};

/** "Motorista" or "Supervisor". */
export function roleLabel(role: ReportDriver['role']): string {
    return ROLE_LABELS[role];
}

/** The driver of a complaint: the user of the route it was filed on (a complaint has no author of its own). */
export type ReportDriver = { id: string; name: string; role: 'motorista' | 'supervisor' };

/** One complaint reduced to what the report counts. */
export type ComplaintEntry = {
    status: ComplaintStatus;
    vehicle: ReportVehicle;
    driver: ReportDriver;
};

/** How many complaints are in each situation. */
export type StatusCounts = Record<ComplaintStatus, number>;

/** The complaints on the routes of one vehicle. */
export type VehicleComplaints = { vehicle: ReportVehicle; counts: StatusCounts; total: number };

/** The complaints filed by one driver. */
export type DriverComplaints = { driver: ReportDriver; counts: StatusCounts; total: number };

/** The complaints report: the counts per situation, per vehicle and per driver, and the general total. */
export type ComplaintReport = {
    vehicles: VehicleComplaints[];
    drivers: DriverComplaints[];
    counts: StatusCounts;
    total: number;
};

/** "Nenhuma denúncia", "1 denúncia" or "N denúncias". */
export function complaintsLabel(count: number): string {
    if (count === 0) {
        return 'Nenhuma denúncia';
    }

    return count === 1 ? '1 denúncia' : `${count} denúncias`;
}

/** Starts the counters of the three situations. */
function emptyCounts(): StatusCounts {
    return { pendente: 0, aprovada: 0, reprovada: 0 };
}

/** The total of a set of counters. */
function sum(counts: StatusCounts): number {
    return counts.pendente + counts.aprovada + counts.reprovada;
}

/**
 * Counts the complaints (RF23) by situation, by vehicle and by driver. Every complaint is counted
 * once in each of the three views, so the totals of the vehicles and of the drivers both add up to
 * the general total. The vehicles come by plate and the drivers by name, in the order of the
 * Portuguese alphabet (the database orders by character code), and a vehicle or a driver only
 * appears when it has a complaint, whatever its situation (RB12, RB18).
 */
export function buildComplaintReport(entries: readonly ComplaintEntry[]): ComplaintReport {
    const byVehicle = new Map<string, { vehicle: ReportVehicle; counts: StatusCounts }>();
    const byDriver = new Map<string, { driver: ReportDriver; counts: StatusCounts }>();
    const general = emptyCounts();

    for (const { status, vehicle, driver } of entries) {
        const vehicleLine = byVehicle.get(vehicle.id) ?? { vehicle, counts: emptyCounts() };
        const driverLine = byDriver.get(driver.id) ?? { driver, counts: emptyCounts() };

        vehicleLine.counts[status] += 1;
        driverLine.counts[status] += 1;
        general[status] += 1;
        byVehicle.set(vehicle.id, vehicleLine);
        byDriver.set(driver.id, driverLine);
    }

    const collator = new Intl.Collator('pt-BR');

    return {
        vehicles: [...byVehicle.values()]
            .map(({ vehicle, counts }) => ({ vehicle, counts, total: sum(counts) }))
            .sort((a, b) =>
                a.vehicle.plate < b.vehicle.plate ? -1 : a.vehicle.plate > b.vehicle.plate ? 1 : 0,
            ),
        drivers: [...byDriver.values()]
            .map(({ driver, counts }) => ({ driver, counts, total: sum(counts) }))
            .sort((a, b) => collator.compare(a.driver.name, b.driver.name)),
        counts: general,
        total: sum(general),
    };
}
