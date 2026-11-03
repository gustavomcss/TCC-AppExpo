import { StyleSheet } from 'react-native';

import { formatDateTime, formatDecimal, formatKm } from '../schemas/masks';
import type { HistoryRoute } from '../services/history';
import { Fact } from './Fact';
import {
    HistoryCard,
    HistoryCardFacts,
    HistoryCardFooter,
    HistoryCardNote,
    HistoryCardSeparator,
    HistoryCardTop,
    HistoryComplaintNote,
} from './HistoryCardParts';
import { VEHICLE_TYPE_ICONS } from './vehicleTypeOptions';

/**
 * Card of a finalized route in the history (RF18): the icon of the vehicle type, "placa · modelo"
 * with the driver under it (also for the driver's own routes), then the departure and return
 * dates, the departure and return km and the itinerary, and the km driven. When the route has a
 * complaint (RF19) the footer names its situation next to an alert icon, in gray whatever the
 * situation; without one nothing is written. The km are the ones stored, so after an approved
 * complaint they are the corrected ones (RB06).
 */
export function RouteHistoryCard({ route }: { route: HistoryRoute }) {
    const driven = Math.round((route.kmReturn - route.kmDeparture) * 100) / 100;

    return (
        <HistoryCard>
            <HistoryCardTop
                icon={VEHICLE_TYPE_ICONS[route.vehicle.type]}
                title={`${route.vehicle.plate} · ${route.vehicle.model}`}
                subtitle={route.driverName}
            />

            <HistoryCardSeparator />

            <HistoryCardFacts>
                <Fact label="Saída" value={formatDateTime(route.dateDeparture)} />
                <Fact label="Retorno" value={formatDateTime(route.dateReturn)} />
                <Fact label="Km de saída" value={formatKm(route.kmDeparture)} />
                <Fact label="Km de retorno" value={formatKm(route.kmReturn)} />
                <Fact label="Itinerário" value={route.itinerary} wide />
            </HistoryCardFacts>

            <HistoryCardFooter>
                {route.complaintStatus && <HistoryComplaintNote status={route.complaintStatus} />}
                <HistoryCardNote style={styles.driven}>
                    {formatDecimal(driven)} km rodados
                </HistoryCardNote>
            </HistoryCardFooter>
        </HistoryCard>
    );
}

/** Styles of the route card. */
const styles = StyleSheet.create({
    driven: {
        marginLeft: 'auto',
    },
});
