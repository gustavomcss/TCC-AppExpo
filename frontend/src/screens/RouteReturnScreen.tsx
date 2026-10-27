import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CollapsibleFact, Fact } from '../components/Fact';
import { FormScrollView } from '../components/FormScrollView';
import { NoticeDialog } from '../components/NoticeDialog';
import { TextField } from '../components/TextField';
import { useToast } from '../contexts/ToastContext';
import type { RootNavigation } from '../navigation/types';
import { formatDateTime, formatDecimalInput, formatKm } from '../schemas/masks';
import { ROUTE_TEXT_MAX, createRouteReturnSchema, kmNotGreaterMessage } from '../schemas/route';
import type { RouteReturnInput, RouteReturnValues } from '../schemas/route';
import { finalizeRoute } from '../services/routes';
import type { OpenRoute } from '../services/routes';
import { applyServerError, isNotFoundError, isRuleError } from '../services/serverErrors';
import { colors, spacing } from '../theme';

/** Fields of the form, in the names the server uses, so its field errors can be matched. */
const FIELDS = ['km_return', 'obs_return'] as const;

/** Props of RouteReturnScreen: the open route the driver is finalizing. */
export type RouteReturnScreenProps = {
    route: OpenRoute;
};

/**
 * Route return (RF09), the "Rota" module when the driver has an open route. A card summarizes the
 * route, vehicle included, which comes from the route and cannot be changed. The form asks for the
 * return km, which must be greater than the departure km (RB13), and an optional observation,
 * validated with Zod before sending; the valid form then asks for a confirmation (a reminder to
 * check what was filled in), and only the confirmed values are sent. Finalizing is one update of the route: the server stamps
 * the return date and makes the return km the current km of the vehicle (RB03), and a pending
 * complaint does not stop it (RB05). The app only gives feedback; the server refuses a return km
 * that is not greater, and a route that is no longer open (closed by the supervisor, RB15) opens
 * a notice and goes back. On success it shows a toast and goes back.
 */
export default function RouteReturnScreen({ route }: RouteReturnScreenProps) {
    const navigation = useNavigation<RootNavigation>();
    const toast = useToast();
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmed, setConfirmed] = useState<RouteReturnValues | null>(null);
    const [closedNotice, setClosedNotice] = useState(false);
    const schema = useMemo(() => createRouteReturnSchema(route.kmDeparture), [route.kmDeparture]);
    const {
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<RouteReturnInput, unknown, RouteReturnValues>({
        resolver: zodResolver(schema),
        defaultValues: { km_return: '', obs_return: '' },
    });

    /*
     * The form is validated first; the valid values wait for the driver to confirm, and are sent
     * once the dialog is gone (onHidden), because a failure opens another dialog and iOS cannot
     * present one over a Modal that is still on its way out.
     */
    const review = handleSubmit((values) => {
        setConfirmed(values);
        setConfirmOpen(true);
    });

    async function perform(values: RouteReturnValues) {
        setSaving(true);
        try {
            await finalizeRoute(route.id, values);
            toast.show('success', 'Retorno registrado.');
            navigation.goBack();
        } catch (error) {
            if (isNotFoundError(error)) {
                setClosedNotice(true);
                return;
            }

            const message = applyServerError(error, setError, FIELDS, {
                km_return: {
                    km_return_not_greater: kmNotGreaterMessage(route.kmDeparture),
                },
            });
            if (!message) {
                return;
            }
            setFailure({
                visible: true,
                title: isRuleError(error) ? 'Ação não permitida' : 'Não foi possível salvar',
                message,
            });
        } finally {
            setSaving(false);
        }
    }

    function cancelConfirm() {
        setConfirmed(null);
        setConfirmOpen(false);
    }

    function sendConfirmed() {
        if (confirmed) {
            setConfirmed(null);
            perform(confirmed);
        }
    }

    return (
        <View style={styles.screen}>
            <FormScrollView contentContainerStyle={styles.content}>
                <Card>
                    <View style={styles.summaryTop}>
                        <CardHeader style={styles.summaryTitle}>
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

                <Card>
                    <CardHeader>
                        <CardTitle>Registrar retorno</CardTitle>
                        <CardDescription>Informe o km do veículo ao voltar.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Controller
                            control={control}
                            name="km_return"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Km de retorno"
                                    placeholder="000.000,00"
                                    value={value}
                                    onChangeText={(text) =>
                                        onChange(formatDecimalInput(text, value))
                                    }
                                    onBlur={onBlur}
                                    error={errors.km_return?.message}
                                    keyboardType="number-pad"
                                    suffix="km"
                                    editable={!saving}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="obs_return"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Observação (opcional)"
                                    placeholder="Alguma informação para o supervisor"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.obs_return?.message}
                                    multiline
                                    maxLength={ROUTE_TEXT_MAX}
                                    showCount
                                    editable={!saving}
                                />
                            )}
                        />
                    </CardContent>
                </Card>
            </FormScrollView>

            <ActionBar>
                <Button title="Registrar retorno" onPress={() => review()} loading={saving} />
            </ActionBar>

            <ConfirmDialog
                visible={confirmOpen}
                title="Registrar retorno?"
                message="Confira o km de retorno e a observação antes de finalizar a rota. Depois de registrado, o retorno não poderá ser alterado."
                confirmLabel="Registrar retorno"
                destructive={false}
                onConfirm={() => setConfirmOpen(false)}
                onCancel={cancelConfirm}
                onHidden={sendConfirmed}
            />
            <NoticeDialog
                visible={failure.visible}
                title={failure.title}
                message={failure.message}
                onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
            />
            <NoticeDialog
                visible={closedNotice}
                title="Rota já encerrada"
                message="Esta rota não está mais aberta. O supervisor pode ter encerrado a rota."
                onClose={() => setClosedNotice(false)}
                onHidden={() => navigation.goBack()}
            />
        </View>
    );
}

/** Styles of the return screen: two cards on the same gray background as the other screens. */
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
    summaryTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    summaryTitle: {
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
