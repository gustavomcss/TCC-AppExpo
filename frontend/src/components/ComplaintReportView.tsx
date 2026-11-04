import { COMPLAINT_STATUSES, complaintsLabel, roleLabel } from '../services/complaintTotals';
import type { ComplaintReport, StatusCounts } from '../services/complaintTotals';
import { STATUS_COLORS } from '../services/reportCharts';
import { Card, CardSeparator } from './Card';
import {
    DriverHead,
    InactiveNote,
    ProportionBar,
    ReportGroup,
    ReportLine,
    ReportLines,
    TotalBox,
    VehicleHead,
} from './ReportParts';

/** The three lines of a card, one per situation of the complaints, with their count. */
function StatusLines({ counts }: { counts: StatusCounts }) {
    return (
        <ReportLines>
            {COMPLAINT_STATUSES.map(({ value, label }) => (
                <ReportLine
                    key={value}
                    color={STATUS_COLORS[value]}
                    name={label}
                    value={String(counts[value])}
                />
            ))}
        </ReportLines>
    );
}

/**
 * The complaints report (RF23) as the screen shows it: the total of the period and how it splits
 * among pending, approved and rejected, then a card per vehicle and a card per driver, each with
 * its own count of each situation. A vehicle appears whenever it has a complaint, active or not
 * (RB12). The same numbers go to the PDF.
 */
export function ComplaintReportView({ report }: { report: ComplaintReport }) {
    return (
        <>
            <Card>
                <TotalBox label="Denúncias no período" value={String(report.total)} />
                <ProportionBar
                    parts={COMPLAINT_STATUSES.map(({ value }) => ({
                        key: value,
                        color: STATUS_COLORS[value],
                        weight: report.counts[value],
                    }))}
                />
                <StatusLines counts={report.counts} />
            </Card>

            <ReportGroup title="Por veículo">
                {report.vehicles.map(({ vehicle, counts, total }) => (
                    <Card key={vehicle.id}>
                        <VehicleHead vehicle={vehicle} value={complaintsLabel(total)} />
                        <CardSeparator />
                        <StatusLines counts={counts} />
                        {!vehicle.active && <InactiveNote />}
                    </Card>
                ))}
            </ReportGroup>

            <ReportGroup title="Por motorista">
                {report.drivers.map(({ driver, counts, total }) => (
                    <Card key={driver.id}>
                        <DriverHead
                            name={driver.name}
                            role={roleLabel(driver.role)}
                            value={complaintsLabel(total)}
                        />
                        <CardSeparator />
                        <StatusLines counts={counts} />
                    </Card>
                ))}
            </ReportGroup>
        </>
    );
}
