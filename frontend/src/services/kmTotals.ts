import type { ReportVehicle } from './reportTotals';

/** One finalized route reduced to what the km report adds up: the vehicle and the two odometer readings. */
export type KmEntry = {
    vehicle: ReportVehicle;
    kmDeparture: number;
    kmReturn: number;
};

/** The km driven by one vehicle in the period, and in how many finalized routes. */
export type VehicleKm = { vehicle: ReportVehicle; routes: number; km: number };

/** The km report: the km driven per vehicle, plus the general total and the number of routes. */
export type KmReport = { vehicles: VehicleKm[]; routes: number; km: number };

/** "Nenhuma rota", "1 rota" or "N rotas". */
export function routesLabel(count: number): string {
    if (count === 0) {
        return 'Nenhuma rota';
    }

    return count === 1 ? '1 rota' : `${count} rotas`;
}

/**
 * Groups the finalized routes by vehicle (RF23): the km of a route is its return minus its
 * departure, the same "X km rodados" the history shows on the route card, so the totals match it.
 * Km are added in hundredths, so many routes never drift by a fraction. The vehicles come by
 * plate, as in the financial report, and a vehicle only appears when it has a route, whatever its
 * situation (RB12).
 */
export function buildKmReport(entries: readonly KmEntry[]): KmReport {
    const byVehicle = new Map<
        string,
        { vehicle: ReportVehicle; routes: number; hundredths: number }
    >();
    let routes = 0;
    let hundredths = 0;

    for (const { vehicle, kmDeparture, kmReturn } of entries) {
        const driven = Math.round(kmReturn * 100) - Math.round(kmDeparture * 100);
        const line = byVehicle.get(vehicle.id) ?? { vehicle, routes: 0, hundredths: 0 };

        line.routes += 1;
        line.hundredths += driven;
        routes += 1;
        hundredths += driven;
        byVehicle.set(vehicle.id, line);
    }

    const vehicles = [...byVehicle.values()]
        .map(({ vehicle, routes: count, hundredths: sum }) => ({
            vehicle,
            routes: count,
            km: sum / 100,
        }))
        .sort((a, b) =>
            a.vehicle.plate < b.vehicle.plate ? -1 : a.vehicle.plate > b.vehicle.plate ? 1 : 0,
        );

    return { vehicles, routes, km: hundredths / 100 };
}
