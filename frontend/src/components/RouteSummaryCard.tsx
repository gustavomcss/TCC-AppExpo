import { StyleSheet, View } from 'react-native';

import { formatDateTime, formatKm } from '../schemas/masks';
import type { OpenRoute } from '../services/routes';
import { spacing } from '../theme';
import { Badge } from './Badge';
import { Card, CardDescription, CardHeader, CardSeparator, CardTitle } from './Card';
import { CollapsibleFact, Fact } from './Fact';

/**
 * A route that has not been finalized: the data the card shows. An open route has no `status`
 * here (the return screens) and a route of the closure module brings its own, with the driver.
 */
export type RouteSummary = Pick<
    OpenRoute,
    'dateDeparture' | 'kmDeparture' | 'itinerary' | 'obsDeparture' | 'vehicle'
> & { status?: 'aberta' | 'encerrada'; driverName?: string };

/** What a fact shows when it has no value yet, such as the return of a route that did not come back. */
const EMPTY = '-';

/**
 * Summary of a route that was not finalized, shared by every screen that works on one (the
 * return, the km complaint and the closure): the title "Rota aberta" or "Rota encerrada" (the
 * name of the driver on the supervisor's screen) with "placa · modelo" under it and the badge, a
 * separator, the departure and the return (date and km, side by side, the return still empty),
 * the itinerary and the observation of the departure, which opens and closes. Everything comes from
 * the route and cannot be changed.
 */
export function RouteSummaryCard({ route }: { route: RouteSummary }) {
    const open = route.status !== 'encerrada';

    return (
        <Card>
            <View style={styles.top}>
                <CardHeader style={styles.title}>
                    <CardTitle>
                        {route.driverName ?? (open ? 'Rota aberta' : 'Rota encerrada')}
                    </CardTitle>
                    <CardDescription>
                        {route.vehicle.plate} · {route.vehicle.model}
                    </CardDescription>
                </CardHeader>
                <Badge
                    label={open ? 'Aberta' : 'Encerrada'}
                    variant={open ? 'outline' : 'secondary'}
                />
            </View>

            <CardSeparator />

            <View style={styles.grid}>
                <Fact label="Saída" value={formatDateTime(route.dateDeparture)} />
                <Fact label="Retorno" value={EMPTY} />
                <Fact label="Km de saída" value={formatKm(route.kmDeparture)} />
                <Fact label="Km de retorno" value={EMPTY} />
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
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.lg,
    },
});
