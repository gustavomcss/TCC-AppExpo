import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SearchX, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Input } from '../components/Input';
import { LoadingState } from '../components/LoadingState';
import type { RootNavigation } from '../navigation/types';
import { filterDrivers, listDrivers } from '../services/drivers';
import type { Driver, DriverStatusFilter } from '../services/drivers';
import { parseServerError } from '../services/serverErrors';
import { colors, fontFamily, fontSize, sizes, spacing } from '../theme';

/** What the list is showing: the request in progress, its failure, or the drivers. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; drivers: Driver[] };

/** Options of the situation filter, in the order the chips appear. */
const STATUS_FILTERS: { value: DriverStatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'inactive', label: 'Inativos' },
];

/**
 * Driver management (RF03), a module of the supervisor. Lists every driver in alphabetical order
 * with name, e-mail and situation (active or inactive), and the fixed bar at the bottom opens the
 * registration form. A search field (name or e-mail) and the chips Todos, Ativos and Inativos
 * narrow the list on the device, without a new request.
 * The list is loaded again each time the screen gets focus, so a driver just registered, or one
 * just edited or deactivated, shows up when the form or the detail goes back. A card opens the
 * detail of that driver (I-14).
 */
export default function DriversScreen() {
    const navigation = useNavigation<RootNavigation>();
    const [state, setState] = useState<State>({ status: 'loading' });
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<DriverStatusFilter>('all');
    const drivers = state.status === 'ready' ? state.drivers : null;
    const visible = useMemo(
        () => (drivers ? filterDrivers(drivers, query, status) : []),
        [drivers, query, status],
    );

    const load = useCallback(async () => {
        try {
            setState({ status: 'ready', drivers: await listDrivers() });
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
                    title="Não foi possível carregar os motoristas"
                    message={state.message}
                    onRetry={retry}
                />
            );
        }

        if (state.drivers.length === 0) {
            return (
                <EmptyState
                    title="Nenhum motorista cadastrado"
                    description="Cadastre o primeiro motorista para liberar o acesso ao app."
                />
            );
        }

        return (
            <>
                <View style={styles.filters}>
                    <View>
                        <Input
                            accessibilityLabel="Buscar motorista"
                            placeholder="Buscar por nome ou e-mail"
                            value={query}
                            onChangeText={setQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="search"
                            style={query !== '' && styles.searchWithClear}
                        />
                        {query !== '' && (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Limpar busca"
                                onPress={() => setQuery('')}
                                style={styles.clear}
                            >
                                <X color={colors.mutedForeground} size={20} />
                            </Pressable>
                        )}
                    </View>
                    <View style={styles.chips}>
                        {STATUS_FILTERS.map((filter) => (
                            <Chip
                                key={filter.value}
                                label={filter.label}
                                selected={status === filter.value}
                                onPress={() => setStatus(filter.value)}
                            />
                        ))}
                    </View>
                </View>

                {visible.length === 0 ? (
                    <EmptyState
                        icon={SearchX}
                        title="Nenhum motorista encontrado"
                        description="Ajuste a busca ou o filtro para ver outros motoristas."
                    />
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.list}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {visible.map((driver) => (
                            <Pressable
                                key={driver.id}
                                accessibilityRole="button"
                                accessibilityLabel={driver.name}
                                onPress={() =>
                                    navigation.navigate('DriverDetail', { driverId: driver.id })
                                }
                                style={({ pressed }) => pressed && styles.pressed}
                            >
                                <Card style={styles.card}>
                                    <Avatar
                                        name={driver.name}
                                        size={sizes.iconBox}
                                        uri={driver.photoUrl}
                                    />
                                    <View style={styles.texts}>
                                        <Text style={styles.name}>{driver.name}</Text>
                                        <Text style={styles.email}>{driver.email}</Text>
                                    </View>
                                    <Badge
                                        label={driver.active ? 'Ativo' : 'Inativo'}
                                        variant={driver.active ? 'outline' : 'secondary'}
                                    />
                                </Card>
                            </Pressable>
                        ))}
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
                    title="Cadastrar motorista"
                    onPress={() => navigation.navigate('DriverNew')}
                />
            </ActionBar>
        </View>
    );
}

/** Styles of the driver list: search and chips over cards, on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    filters: {
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    searchWithClear: {
        paddingRight: sizes.control,
    },
    clear: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: sizes.control,
        height: sizes.control,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chips: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    list: {
        padding: spacing.lg,
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
    texts: {
        flex: 1,
    },
    name: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
        lineHeight: 24,
    },
    email: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
});
