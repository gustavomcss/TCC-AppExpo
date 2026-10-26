import { useFocusEffect } from '@react-navigation/native';
import { Car } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { Select } from '../components/Select';
import { VEHICLE_TYPE_ICONS } from '../components/vehicleTypeOptions';
import { parseServerError } from '../services/serverErrors';
import { listRouteVehicles } from '../services/vehicles';
import type { RouteVehicle } from '../services/vehicles';
import { colors, spacing } from '../theme';

/** What the screen is showing: the request in progress, its failure, or the vehicles. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; vehicles: RouteVehicle[] };

/**
 * Route departure (RF07), the "Rota" module. For now it holds only the "Veículo" field of the
 * form, which the departure form of I-21 completes. The field lists the active vehicles (RB12):
 * the free ones can be chosen, and the ones with an open route are listed with the
 * "Indisponível" badge and cannot be (RB01). The list is loaded again each time the screen gets
 * focus, so it reflects a return or an administrative closure made since the last visit, and the
 * choice is dropped when that vehicle stops being free.
 */
export default function RouteDepartureScreen() {
    const [state, setState] = useState<State>({ status: 'loading' });
    const [vehicleId, setVehicleId] = useState<string | undefined>();
    const vehicles = state.status === 'ready' ? state.vehicles : null;
    const options = useMemo(
        () =>
            (vehicles ?? []).map((vehicle) => ({
                value: vehicle.id,
                label: `${vehicle.plate} · ${vehicle.model}`,
                icon: VEHICLE_TYPE_ICONS[vehicle.type],
                disabled: !vehicle.available,
                badge: vehicle.available ? undefined : 'Indisponível',
            })),
        [vehicles],
    );

    const load = useCallback(async () => {
        try {
            const loaded = await listRouteVehicles();
            setState({ status: 'ready', vehicles: loaded });
            setVehicleId((current) =>
                loaded.some((vehicle) => vehicle.id === current && vehicle.available)
                    ? current
                    : undefined,
            );
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

    if (state.status === 'loading') {
        return <LoadingState />;
    }

    if (state.status === 'error') {
        return (
            <ErrorState
                title="Não foi possível carregar os veículos"
                message={state.message}
                onRetry={retry}
            />
        );
    }

    if (state.vehicles.length === 0) {
        return (
            <View style={styles.screen}>
                <EmptyState
                    icon={Car}
                    title="Nenhum veículo ativo"
                    description="Peça ao supervisor para cadastrar ou reativar um veículo."
                />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar saída</CardTitle>
                        <CardDescription>Informe os dados para iniciar a rota.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Select
                            label="Veículo"
                            options={options}
                            value={vehicleId}
                            onChange={setVehicleId}
                        />
                    </CardContent>
                </Card>
            </ScrollView>
        </View>
    );
}

/** Styles of the departure screen: a card on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        flexGrow: 1,
        padding: spacing.lg,
    },
});
