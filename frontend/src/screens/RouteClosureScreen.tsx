import { useNavigation } from '@react-navigation/native';
import { Route, SearchX } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { HistoryCardFooter, HistoryComplaintNote } from '../components/HistoryCardParts';
import { ListFilters } from '../components/ListFilters';
import type { StatusOption } from '../components/ListFilters';
import { PagedList } from '../components/PagedList';
import type { RootNavigation } from '../navigation/types';
import { formatDateTime } from '../schemas/masks';
import { listClosureRoutes } from '../services/routes';
import type { ClosureRoute, ClosureStatusFilter } from '../services/routes';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';

/** Options of the situation filter, in the order the chips appear. */
const STATUS_OPTIONS: readonly StatusOption<ClosureStatusFilter>[] = [
    { value: 'all', label: 'Todas' },
    { value: 'aberta', label: 'Abertas' },
    { value: 'encerrada', label: 'Encerradas' },
];

/** How long the search text rests before the list asks the server, in ms. */
const SEARCH_DELAY = 400;

/** Key of a route in the list. */
function routeKey(route: ClosureRoute): string {
    return route.id;
}

/**
 * Route closure (RF10), a module of the supervisor. Lists the open routes, oldest first, and then
 * the ones already closed, newest first (RB10: finalized routes belong to the history, not here),
 * each with its situation badge: "Aberta" outline and "Encerrada" muted, like "Ativo" and
 * "Inativo". A search field (driver, plate or model) and the chips Todas, Abertas and Encerradas
 * narrow the list. The filtering, the order and the paging are the server's and the list loads
 * ten routes at a time as it is scrolled (`PagedList`), so a long history is never read whole.
 * Every route opens its detail: an open one can be closed there, a closed one is only shown. A
 * route with a complaint names its situation in the footer, like the history card (so the
 * supervisor knows, before trying to close it, that a pending complaint blocks the closure,
 * RB21). The pages loaded are read again each time the screen gets focus, so a route just closed,
 * or one the driver finalized in the meantime, is up to date when the detail goes back.
 */
export default function RouteClosureScreen() {
    const navigation = useNavigation<RootNavigation>();
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<ClosureStatusFilter>('all');
    const filtered = search.trim() !== '' || status !== 'all';

    useEffect(() => {
        const timer = setTimeout(() => setSearch(query), SEARCH_DELAY);
        return () => clearTimeout(timer);
    }, [query]);

    function renderRoute(route: ClosureRoute) {
        const open = route.status === 'aberta';
        const card = (
            <Card style={styles.card}>
                <View style={styles.top}>
                    <View style={styles.iconBox}>
                        <Route color={palette.g20} size={sizes.icon} />
                    </View>
                    <View style={styles.texts}>
                        <Text style={styles.name}>{route.driverName}</Text>
                        <Text style={styles.detail}>
                            {route.vehicle.plate} · {route.vehicle.model}
                        </Text>
                        <Text style={styles.detail}>
                            Saiu {formatDateTime(route.dateDeparture)}
                        </Text>
                    </View>
                    <Badge
                        label={open ? 'Aberta' : 'Encerrada'}
                        variant={open ? 'outline' : 'secondary'}
                    />
                </View>
                {route.complaintStatus && (
                    <HistoryCardFooter>
                        <HistoryComplaintNote status={route.complaintStatus} />
                    </HistoryCardFooter>
                )}
            </Card>
        );

        return (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Rota ${open ? 'aberta' : 'encerrada'} de ${route.driverName}`}
                onPress={() => navigation.navigate('RouteClosureDetail', { routeId: route.id })}
                style={({ pressed }) => pressed && styles.pressed}
            >
                {card}
            </Pressable>
        );
    }

    return (
        <View style={styles.screen}>
            <ListFilters
                searchLabel="Buscar rota"
                searchPlaceholder="Buscar por motorista, placa ou modelo"
                query={query}
                onQueryChange={setQuery}
                status={status}
                onStatusChange={setStatus}
                statusOptions={STATUS_OPTIONS}
            />

            <PagedList<ClosureRoute>
                queryKey={`${search.trim()}|${status}`}
                loadPage={(page) => listClosureRoutes({ query: search, status }, page)}
                keyExtractor={routeKey}
                renderItem={renderRoute}
                errorTitle="Não foi possível carregar as rotas"
                emptyState={
                    filtered ? (
                        <EmptyState
                            icon={SearchX}
                            top
                            title="Nenhuma rota encontrada"
                            description="Ajuste a busca ou o filtro para ver outras rotas."
                        />
                    ) : (
                        <EmptyState
                            icon={Route}
                            title="Nenhuma rota aberta ou encerrada"
                            description="Quando um motorista sair com um veículo, a rota aparece aqui."
                        />
                    )
                }
            />
        </View>
    );
}

/** Styles of the closure list: search and chips over a list of cards, on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    pressed: {
        opacity: 0.6,
    },
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
});
