import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Car, SearchX } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { VEHICLE_TYPE_ICONS } from '../components/vehicleTypeOptions';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ListFilters } from '../components/ListFilters';
import { LoadingState } from '../components/LoadingState';
import type { RootNavigation } from '../navigation/types';
import { formatKm } from '../schemas/masks';
import { VEHICLE_TYPES } from '../schemas/vehicle';
import { parseServerError } from '../services/serverErrors';
import type { StatusFilter } from '../services/listFilters';
import { filterVehicles, listVehicles, typeLabel } from '../services/vehicles';
import type { Vehicle } from '../services/vehicles';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';

/** What the list is showing: the request in progress, its failure, or the vehicles. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; vehicles: Vehicle[] };

/**
 * Vehicle management (RF05), a module of the supervisor. Lists every vehicle, active ones first,
 * with the icon of its type, the plate in evidence, then model and type, the current km and the
 * situation (active or inactive); the fixed bar at the bottom opens the registration form. A
 * search field (plate, model or type), the situation chips (Todos, Ativos and Inativos) and the
 * type chips after them (Moto, Carro, Van and Caminhão; pressing the one in use clears it) narrow
 * the list on the device, without a new request. The situation and the type combine. The list is
 * loaded again each time the screen gets focus, so a vehicle just registered shows up when the
 * form goes back or the detail screen is left. Pressing a vehicle opens its detail (I-17).
 */
export default function VehiclesScreen() {
    const navigation = useNavigation<RootNavigation>();
    const [state, setState] = useState<State>({ status: 'loading' });
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [type, setType] = useState<Vehicle['type'] | null>(null);
    const vehicles = state.status === 'ready' ? state.vehicles : null;
    const visible = useMemo(
        () => (vehicles ? filterVehicles(vehicles, query, status, type) : []),
        [vehicles, query, status, type],
    );

    const load = useCallback(async () => {
        try {
            setState({ status: 'ready', vehicles: await listVehicles() });
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

    function renderBody() {
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
                <EmptyState
                    icon={Car}
                    title="Nenhum veículo cadastrado"
                    description="Cadastre os veículos da frota para registrar rotas e gastos."
                />
            );
        }

        return (
            <>
                <ListFilters
                    searchLabel="Buscar veículo"
                    searchPlaceholder="Buscar por placa, modelo ou tipo"
                    query={query}
                    onQueryChange={setQuery}
                    status={status}
                    onStatusChange={setStatus}
                    extraChips={VEHICLE_TYPES.map((item) => (
                        <Chip
                            key={item.value}
                            label={item.label}
                            selected={type === item.value}
                            onPress={() => setType(type === item.value ? null : item.value)}
                        />
                    ))}
                />

                {visible.length === 0 ? (
                    <EmptyState
                        icon={SearchX}
                        title="Nenhum veículo encontrado"
                        description="Ajuste a busca ou o filtro para ver outros veículos."
                    />
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.list}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {visible.map((vehicle) => {
                            const TypeIcon = VEHICLE_TYPE_ICONS[vehicle.type];

                            return (
                                <Pressable
                                    key={vehicle.id}
                                    accessibilityRole="button"
                                    accessibilityLabel={vehicle.plate}
                                    onPress={() =>
                                        navigation.navigate('VehicleDetail', {
                                            vehicleId: vehicle.id,
                                        })
                                    }
                                    style={({ pressed }) => pressed && styles.pressed}
                                >
                                    <Card style={styles.card}>
                                        <View style={styles.iconBox}>
                                            <TypeIcon color={palette.g20} size={sizes.icon} />
                                        </View>
                                        <View style={styles.texts}>
                                            <Text style={styles.plate}>{vehicle.plate}</Text>
                                            <Text style={styles.detail}>
                                                {vehicle.model} · {typeLabel(vehicle.type)}
                                            </Text>
                                            <Text style={styles.detail}>
                                                {formatKm(vehicle.odometer)} km
                                            </Text>
                                        </View>
                                        <Badge
                                            label={vehicle.active ? 'Ativo' : 'Inativo'}
                                            variant={vehicle.active ? 'outline' : 'secondary'}
                                        />
                                    </Card>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                )}
            </>
        );
    }

    return (
        <View style={styles.screen}>
            {renderBody()}

            <ActionBar>
                <Button
                    title="Cadastrar veículo"
                    onPress={() => navigation.navigate('VehicleNew')}
                />
            </ActionBar>
        </View>
    );
}

/** Styles of the vehicle list: cards on the same gray background as the other screens. */
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
    plate: {
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
