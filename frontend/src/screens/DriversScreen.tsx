import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import type { RootNavigation } from '../navigation/types';
import { listDrivers } from '../services/drivers';
import type { Driver } from '../services/drivers';
import { parseServerError } from '../services/serverErrors';
import { colors, fontFamily, fontSize, sizes, spacing } from '../theme';

/** What the list is showing: the request in progress, its failure, or the drivers. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; drivers: Driver[] };

/**
 * Driver management (RF03), a module of the supervisor. Lists every driver with name, e-mail and
 * situation (active or inactive), and the fixed bar at the bottom opens the registration form.
 * The list is loaded again each time the screen gets focus, so a driver just registered shows up
 * when the form goes back. Opening a driver to edit them comes with the edit issue (I-14).
 */
export default function DriversScreen() {
    const navigation = useNavigation<RootNavigation>();
    const [state, setState] = useState<State>({ status: 'loading' });

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
            <ScrollView contentContainerStyle={styles.list}>
                {state.drivers.map((driver) => (
                    <Card key={driver.id} style={styles.card}>
                        <Avatar name={driver.name} size={sizes.iconBox} uri={driver.photoUrl} />
                        <View style={styles.texts}>
                            <Text style={styles.name}>{driver.name}</Text>
                            <Text style={styles.email}>{driver.email}</Text>
                        </View>
                        <Badge
                            label={driver.active ? 'Ativo' : 'Inativo'}
                            variant={driver.active ? 'outline' : 'secondary'}
                        />
                    </Card>
                ))}
            </ScrollView>
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

/** Styles of the driver list: cards on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    list: {
        padding: spacing.lg,
        gap: spacing.md,
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
