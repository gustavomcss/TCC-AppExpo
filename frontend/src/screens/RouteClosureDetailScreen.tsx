import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState } from '../components/ErrorState';
import { CollapsibleFact, Fact } from '../components/Fact';
import { LoadingState } from '../components/LoadingState';
import { NoticeCard } from '../components/NoticeCard';
import { NoticeDialog } from '../components/NoticeDialog';
import { useToast } from '../contexts/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { formatDateTime, formatKm } from '../schemas/masks';
import { closeRoute, getClosureRoute } from '../services/routes';
import type { ClosureRoute } from '../services/routes';
import { isNotFoundError, isRuleError, parseServerError } from '../services/serverErrors';
import { colors, spacing } from '../theme';

/** What closing a route does, said in the notice on the screen and in the confirmation. */
const CLOSE_MESSAGE =
    'Isso libera o veículo e o motorista para novas rotas. Nenhum km é pedido nem alterado.';

/** What the screen is showing: the request in progress, its failure, or the route. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; route: ClosureRoute };

/**
 * Route closure detail (RF10), opened from the closure list. Shows the route in the same card as
 * the return screen (driver as the title) and, when it is still open, a notice card and the fixed bar
 * "Encerrar rota". Closing asks for a confirmation and sends no km: the
 * route becomes `encerrada`, the current km of the vehicle stays and the vehicle and the driver
 * are free again (RB15). The server is the rule: only a supervisor closes, and only an open
 * route, so a route the driver finalized while the screen was open answers 404 and the app says
 * so and goes back. On success it shows a toast and goes back to the list. What follows the
 * dialog waits for it to be gone (onHidden), because iOS cannot present a Modal or change screen
 * under one that is still closing.
 */
export default function RouteClosureDetailScreen({
    route,
    navigation,
}: NativeStackScreenProps<RootStackParamList, 'RouteClosureDetail'>) {
    const { routeId } = route.params;
    const toast = useToast();
    const [state, setState] = useState<State>({ status: 'loading' });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const [goneNotice, setGoneNotice] = useState(false);
    const afterConfirm = useRef<(() => void) | null>(null);

    const load = useCallback(async () => {
        try {
            setState({ status: 'ready', route: await getClosureRoute(routeId) });
        } catch (error) {
            setState({ status: 'error', message: parseServerError(error).form ?? '' });
        }
    }, [routeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    function retry() {
        setState({ status: 'loading' });
        load();
    }

    async function confirmClose() {
        setClosing(true);
        try {
            await closeRoute(routeId);
            afterConfirm.current = () => {
                toast.show('success', 'Rota encerrada. Veículo e motorista foram liberados.');
                navigation.goBack();
            };
        } catch (error) {
            if (isNotFoundError(error)) {
                afterConfirm.current = () => setGoneNotice(true);
            } else {
                const { form, fields } = parseServerError(error);
                afterConfirm.current = () =>
                    setFailure({
                        visible: true,
                        title:
                            isRuleError(error) || Object.keys(fields).length > 0
                                ? 'Ação não permitida'
                                : 'Não foi possível salvar',
                        message:
                            form ??
                            Object.values(fields)[0] ??
                            'Não foi possível salvar. Tente novamente.',
                    });
            }
        } finally {
            setClosing(false);
            setConfirmOpen(false);
        }
    }

    function afterConfirmHidden() {
        const next = afterConfirm.current;
        afterConfirm.current = null;
        next?.();
    }

    if (state.status === 'loading') {
        return (
            <View style={styles.screen}>
                <LoadingState />
            </View>
        );
    }

    if (state.status === 'error') {
        return (
            <View style={styles.screen}>
                <ErrorState
                    title="Não foi possível carregar a rota"
                    message={state.message}
                    onRetry={retry}
                />
            </View>
        );
    }

    const { route: loaded } = state;
    const open = loaded.status === 'aberta';

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                <Card>
                    <View style={styles.top}>
                        <CardHeader style={styles.title}>
                            <CardTitle>{loaded.driverName}</CardTitle>
                            <CardDescription>
                                {loaded.vehicle.plate} · {loaded.vehicle.model}
                            </CardDescription>
                        </CardHeader>
                        <Badge
                            label={open ? 'Aberta' : 'Encerrada'}
                            variant={open ? 'outline' : 'secondary'}
                        />
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.grid}>
                        <Fact label="Km de saída" value={formatKm(loaded.kmDeparture)} />
                        <Fact label="Saída" value={formatDateTime(loaded.dateDeparture)} />
                        <Fact label="Itinerário" value={loaded.itinerary} wide />
                        <CollapsibleFact
                            label="Observação"
                            value={loaded.obsDeparture}
                            emptyText="Nenhuma observação"
                        />
                    </View>
                </Card>

                {open && <NoticeCard title="Encerrar sem retorno" message={CLOSE_MESSAGE} />}
            </ScrollView>

            {open && (
                <ActionBar>
                    <Button
                        variant="destructive"
                        title="Encerrar rota"
                        onPress={() => setConfirmOpen(true)}
                    />
                </ActionBar>
            )}

            <ConfirmDialog
                visible={confirmOpen}
                title="Encerrar rota?"
                message={CLOSE_MESSAGE}
                confirmLabel="Encerrar rota"
                onConfirm={confirmClose}
                onCancel={() => setConfirmOpen(false)}
                onHidden={afterConfirmHidden}
                loading={closing}
            />
            <NoticeDialog
                visible={failure.visible}
                title={failure.title}
                message={failure.message}
                onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
            />
            <NoticeDialog
                visible={goneNotice}
                title="Rota já finalizada"
                message="Esta rota não está mais aberta. O motorista pode ter registrado o retorno."
                onClose={() => setGoneNotice(false)}
                onHidden={() => navigation.goBack()}
            />
        </View>
    );
}

/** Styles of the closure detail: the route card and the warning, on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        flexGrow: 1,
        padding: spacing.lg,
        gap: spacing.lg,
    },
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
