import { StyleSheet, View } from 'react-native';

import { formatDateTime, formatKm } from '../schemas/masks';
import type { OpenRoute } from '../services/routes';
import { colors, spacing } from '../theme';
import { Badge } from './Badge';
import { Card, CardDescription, CardHeader, CardTitle } from './Card';
import { CollapsibleFact, Fact } from './Fact';

/**
 * Summary of the open route of the driver, shared by every screen that works on it (the return
 * and the km complaint): the title "Rota aberta" with "placa · modelo" under it and the badge,
 * a separator, the departure km and date side by side, the itinerary and the observation of the
 * departure, which opens and closes. Everything comes from the route and cannot be changed.
 */
export function OpenRouteCard({ route }: { route: OpenRoute }) {
    return (
        <Card>
            <View style={styles.top}>
                <CardHeader style={styles.title}>
                    <CardTitle>Rota aberta</CardTitle>
                    <CardDescription>
                        {route.vehicle.plate} · {route.vehicle.model}
                    </CardDescription>
                </CardHeader>
                <Badge label="Aberta" variant="outline" />
            </View>

            <View style={styles.separator} />

            <View style={styles.grid}>
                <Fact label="Km de saída" value={formatKm(route.kmDeparture)} />
                <Fact label="Saída" value={formatDateTime(route.dateDeparture)} />
                <Fact label="Itinerário" value={route.itinerary} wide />
                <CollapsibleFact
                    label="Observação"
                    value={route.obsDeparture}
                    emptyText="Nenhuma observação"
                />
            </View>
        </Card>
    );
}

/** Styles of the route summary. */
const styles = StyleSheet.create({
    top: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    title: {
        flex: 1,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.lg,
    },
});
