import { formatDistance } from '../schemas/masks';
import type { KmReport } from '../services/kmTotals';
import { Card, CardSeparator } from './Card';
import {
    InactiveNote,
    ReportFact,
    ReportGroup,
    ReportLines,
    TotalBox,
    VehicleHead,
} from './ReportParts';

/**
 * The km report (RF23) as the screen shows it: the km driven and the finalized routes of the
 * period, then a card per vehicle with its own km and routes. A vehicle appears whenever it has
 * a route in the period, active or not (RB12). The same numbers go to the PDF.
 */
export function KmReportView({ report }: { report: KmReport }) {
    return (
        <>
            <Card>
                <TotalBox label="Km rodados no período" value={formatDistance(report.km)} />
                <ReportLines>
                    <ReportFact label="Rotas finalizadas" value={String(report.routes)} />
                    <ReportFact label="Veículos" value={String(report.vehicles.length)} />
                </ReportLines>
            </Card>

            <ReportGroup title="Por veículo">
                {report.vehicles.map(({ vehicle, routes, km }) => (
                    <Card key={vehicle.id}>
                        <VehicleHead vehicle={vehicle} value={formatDistance(km)} />
                        <CardSeparator />
                        <ReportFact label="Rotas finalizadas" value={String(routes)} />
                        {!vehicle.active && <InactiveNote />}
                    </Card>
                ))}
            </ReportGroup>
        </>
    );
}
