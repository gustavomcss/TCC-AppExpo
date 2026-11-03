import { TriangleAlert } from 'lucide-react-native';

import { formatDateTime, formatKm } from '../schemas/masks';
import type { HistoryComplaint } from '../services/history';
import { Fact } from './Fact';
import {
    HistoryCard,
    HistoryCardFacts,
    HistoryCardFooter,
    HistoryCardSeparator,
    HistoryCardTop,
    HistoryComplaintNote,
} from './HistoryCardParts';

/**
 * Card of a complaint in the history (RF15): the alert icon and "placa · modelo" with the driver
 * under it, then the date it was registered and the date it was reviewed ("—" while pending), the
 * departure km of the route and the km informed, and, in the footer, its situation like the route
 * card does. The departure km are the stored ones, so after an approval they already equal the km
 * informed.
 */
export function ComplaintHistoryCard({ complaint }: { complaint: HistoryComplaint }) {
    return (
        <HistoryCard>
            <HistoryCardTop
                icon={TriangleAlert}
                title={`${complaint.vehicle.plate} · ${complaint.vehicle.model}`}
                subtitle={complaint.driverName}
            />

            <HistoryCardSeparator />

            <HistoryCardFacts>
                <Fact label="Registrado" value={formatDateTime(complaint.created)} />
                <Fact
                    label="Revisado"
                    value={complaint.reviewed ? formatDateTime(complaint.reviewed) : '—'}
                />
                <Fact label="Km de saída" value={formatKm(complaint.kmDeparture)} />
                <Fact label="Km informado" value={formatKm(complaint.kmComplaint)} />
            </HistoryCardFacts>

            <HistoryCardFooter>
                <HistoryComplaintNote status={complaint.status} />
            </HistoryCardFooter>
        </HistoryCard>
    );
}
