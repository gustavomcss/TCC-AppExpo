import { TriangleAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { formatDateTime, formatDecimal, formatKm } from '../schemas/masks';
import type { ComplaintStatus } from '../services/complaints';
import type { HistoryRoute } from '../services/history';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';
import { Card } from './Card';
import { Fact } from './Fact';
import { VEHICLE_TYPE_ICONS } from './vehicleTypeOptions';

/** How the indicator names the situation of the complaint of a route. */
const COMPLAINT_LABELS: Record<ComplaintStatus, string> = {
    pendente: 'Denúncia pendente',
    aprovada: 'Denúncia aprovada',
    reprovada: 'Denúncia reprovada',
};

/**
 * Color of the alert icon by the situation of the complaint: blue while pending, green once
 * approved and red once rejected, the colors of the complaint notices.
 */
const COMPLAINT_COLORS: Record<ComplaintStatus, string> = {
    pendente: colors.warning,
    aprovada: colors.success,
    reprovada: colors.destructive,
};

/**
 * Card of a finalized route in the history (RF18): the icon of the vehicle type, "placa · modelo"
 * with the driver under it (also for the driver's own routes), then the departure and return
 * dates, the departure and return km and the itinerary, and the km driven. When the route has a
 * complaint (RF19) the footer names its situation next to an alert icon colored by it; without
 * one nothing is written. The km are the ones stored, so after an approved complaint they are
 * the corrected ones (RB06).
 */
export function RouteHistoryCard({ route }: { route: HistoryRoute }) {
    const Icon = VEHICLE_TYPE_ICONS[route.vehicle.type];
    const driven = Math.round((route.kmReturn - route.kmDeparture) * 100) / 100;

    return (
        <Card style={styles.card}>
            <View style={styles.top}>
                <View style={styles.iconBox}>
                    <Icon color={palette.g20} size={sizes.icon} />
                </View>
                <View style={styles.texts}>
                    <Text style={styles.name}>
                        {route.vehicle.plate} · {route.vehicle.model}
                    </Text>
                    <Text style={styles.detail}>{route.driverName}</Text>
                </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.facts}>
                <Fact label="Saída" value={formatDateTime(route.dateDeparture)} />
                <Fact label="Retorno" value={formatDateTime(route.dateReturn)} />
                <Fact label="Km de saída" value={formatKm(route.kmDeparture)} />
                <Fact label="Km de retorno" value={formatKm(route.kmReturn)} />
                <Fact label="Itinerário" value={route.itinerary} wide />
            </View>

            <View style={styles.footer}>
                {route.complaintStatus && (
                    <View style={styles.complaint}>
                        <TriangleAlert color={COMPLAINT_COLORS[route.complaintStatus]} size={16} />
                        <Text style={styles.small}>{COMPLAINT_LABELS[route.complaintStatus]}</Text>
                    </View>
                )}
                <Text style={[styles.small, styles.driven]}>
                    {formatDecimal(driven)} km rodados
                </Text>
            </View>
        </Card>
    );
}

/** Styles of the route card. */
const styles = StyleSheet.create({
    card: {
        gap: spacing.md,
    },
    top: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    iconBox: {
        width: sizes.iconBox,
        height: sizes.iconBox,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: palette.gE0,
    },
    texts: {
        flex: 1,
    },
    name: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
        lineHeight: 24,
    },
    detail: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    separator: {
        height: 1,
        backgroundColor: palette.gE0,
    },
    facts: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginTop: spacing.md / 2,
    },
    complaint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    small: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.xs,
        lineHeight: 16,
    },
    driven: {
        marginLeft: 'auto',
    },
});
