import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Route, SearchX } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ListFilters } from '../components/ListFilters';
import type { StatusOption } from '../components/ListFilters';
import { LoadingState } from '../components/LoadingState';
import type { RootNavigation } from '../navigation/types';
import { formatDateTime } from '../schemas/masks';
import { filterClosureRoutes, listClosureRoutes } from '../services/routes';
import type { ClosureRoute, ClosureStatusFilter } from '../services/routes';
import { parseServerError } from '../services/serverErrors';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';

/** What the list is showing: the request in progress, its failure, or the routes. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; routes: ClosureRoute[] };

/** Options of the situation filter, in the order the chips appear. */
const STATUS_OPTIONS: readonly StatusOption<ClosureStatusFilter>[] = [
    { value: 'all', label: 'Todas' },
    { value: 'aberta', label: 'Abertas' },
    { value: 'encerrada', label: 'Encerradas' },
];

/**
 * Route closure (RF10), a module of the supervisor. Lists the open routes, oldest first, and then
 * the ones already closed (RB10: finalized routes belong to the history, not here), each with its
 * situation badge: "Aberta" outline and "Encerrada" muted, like "Ativo" and "Inativo".
 * A search field (driver, plate or model) and the chips Todas, Abertas and Encerradas narrow the
 * list on the device, without a new request. An open route opens its detail, where it can be
 * closed; a closed one is only shown. The list is loaded again each time the screen gets focus,
 * so a route just closed, or one the driver finalized in the meantime, is up to date when the
 * detail goes back.
 */
export default function RouteClosureScreen() {
    const navigation = useNavigation<RootNavigation>();
    const [state, setState] = useState<State>({ status: 'loading' });
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<ClosureStatusFilter>('all');
    const routes = state.status === 'ready' ? state.routes : null;
    const visible = useMemo(
        () => (routes ? filterClosureRoutes(routes, query, status) : []),
        [routes, query, status],
    );

    const load = useCallback(async () => {
        try {
            setState({ status: 'ready', routes: await listClosureRoutes() });
        } catch (error) {
            setState({ status: 'error', message: parseServerError(error).form ?? '' });
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    function retry() {
        setState({ status: 'loading' });
        load();
    }

    function renderRoute(route: ClosureRoute) {
        const open = route.status === 'aberta';
        const card = (
            <Card style={styles.card}>
                <View style={styles.iconBox}>
                    <Route color={palette.g20} size={sizes.icon} />
                </View>
                <View style={styles.texts}>
                    <Text style={styles.name}>{route.driverName}</Text>
                    <Text style={styles.detail}>
                        {route.vehicle.plate} · {route.vehicle.model}
                    </Text>
                    <Text style={styles.detail}>Saiu {formatDateTime(route.dateDeparture)}</Text>
                </View>
                <Badge
                    label={open ? 'Aberta' : 'Encerrada'}
                    variant={open ? 'outline' : 'secondary'}
                />
            </Card>
        );

        if (!open) {
            return <View key={route.id}>{card}</View>;
        }

        return (
            <Pressable
                key={route.id}
                accessibilityRole="button"
                accessibilityLabel={`Rota aberta de ${route.driverName}`}
                onPress={() => navigation.navigate('RouteClosureDetail', { routeId: route.id })}
                style={({ pressed }) => pressed && styles.pressed}
            >
                {card}
            </Pressable>
        );
    }

    function renderBody() {
        if (state.status === 'loading') {
            return <LoadingState />;
        }

        if (state.status === 'error') {
            return (
                <ErrorState
                    title="Não foi possível carregar as rotas"
                    message={state.message}
                    onRetry={retry}
                />
            );
        }

        if (state.routes.length === 0) {
            return (
                <EmptyState
                    icon={Route}
                    title="Nenhuma rota aberta ou encerrada"
                    description="Quando um motorista sair com um veículo, a rota aparece aqui."
                />
            );
        }

        return (
            <>
                <ListFilters
                    searchLabel="Buscar rota"
                    searchPlaceholder="Buscar por motorista, placa ou modelo"
                    query={query}
                    onQueryChange={setQuery}
                    status={status}
                    onStatusChange={setStatus}
                    statusOptions={STATUS_OPTIONS}
                />

                {visible.length === 0 ? (
                    <EmptyState
                        icon={SearchX}
                        title="Nenhuma rota encontrada"
                        description="Ajuste a busca ou o filtro para ver outras rotas."
                    />
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.list}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {visible.map(renderRoute)}
                    </ScrollView>
                )}
            </>
        );
    }

    return <View style={styles.screen}>{renderBody()}</View>;
}

/** Styles of the closure list: search and chips over cards, on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    list: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        gap: spacing.md,
    },
    pressed: {
        opacity: 0.6,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        padding: spacing.md,
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
