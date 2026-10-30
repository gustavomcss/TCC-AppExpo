import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormScrollView } from '../components/FormScrollView';
import { NoticeDialog } from '../components/NoticeDialog';
import { OpenRouteCard } from '../components/OpenRouteCard';
import { TextField } from '../components/TextField';
import { useToast } from '../contexts/ToastContext';
import type { RootNavigation } from '../navigation/types';
import { formatDecimalInput } from '../schemas/masks';
import {
    ROUTE_TEXT_MAX,
    createRouteReturnSchema,
    kmNotGreaterMessage,
    waitsForReview,
} from '../schemas/route';
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
    /** Km of the pending complaint of the route, or null when there is none (RB05). */
    complaintKm: number | null;
};

/**
 * Route return (RF09), the "Rota" module when the driver has an open route. A card summarizes the
 * route, vehicle included, which comes from the route and cannot be changed. The form asks for the
 * return km, which must be greater than the departure km (RB13) and, while a pending complaint
 * names a higher km, than the km of the complaint, and an optional observation,
 * validated with Zod before sending; the valid form then asks for a confirmation (a reminder to
 * check what was filled in), and only the confirmed values are sent. Finalizing is one update of the route: the server stamps
 * the return date and makes the return km the current km of the vehicle (RB03), and a pending
 * complaint does not stop it (RB05). The app only gives feedback; the server refuses a return km
 * that is not greater, and a route that is no longer open (closed by the supervisor, RB15) opens
 * a notice and goes back. On success it shows a toast and goes back. A button under the form opens
 * the km complaint (RF14), for the driver who finds the km of the departure wrong.
 */
export default function RouteReturnScreen({ route, complaintKm }: RouteReturnScreenProps) {
    const navigation = useNavigation<RootNavigation>();
    const toast = useToast();
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmed, setConfirmed] = useState<RouteReturnValues | null>(null);
    const [closedNotice, setClosedNotice] = useState(false);
    const [reviewNotice, setReviewNotice] = useState(false);
    const schema = useMemo(
        () => createRouteReturnSchema(route.kmDeparture, complaintKm),
        [route.kmDeparture, complaintKm],
    );
    const {
        control,
        handleSubmit,
        setError,
        getValues,
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
    const review = handleSubmit(
        (values) => {
            setConfirmed(values);
            setConfirmOpen(true);
        },
        /*
         * The field error is the usual one; when the departure km may be wrong (a pending
         * complaint says it is lower), a notice also tells the driver to wait for the review.
         */
        () => {
            if (waitsForReview(route.kmDeparture, complaintKm, getValues('km_return'))) {
                setReviewNotice(true);
            }
        },
    );

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
                    km_return_not_greater: kmNotGreaterMessage(route.kmDeparture, complaintKm),
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
                <OpenRouteCard route={route} />

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
                                    placeholder="0,00"
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

                <Button
                    variant="outline"
                    title="Denunciar divergência de km"
                    onPress={() => navigation.navigate('complaint')}
                    disabled={saving}
                />
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
                visible={reviewNotice}
                title="Aguarde a revisão"
                message="Você denunciou uma divergência no km de saída. O km de retorno informado não é maior que o km de saída. O retorno só pode ser registrado depois da revisão do supervisor, se o km de saída for corrigido."
                onClose={() => setReviewNotice(false)}
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
});
