import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Car } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { NoticeDialog } from '../components/NoticeDialog';
import { Select } from '../components/Select';
import { TextField } from '../components/TextField';
import { VEHICLE_TYPE_ICONS } from '../components/vehicleTypeOptions';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { RootNavigation } from '../navigation/types';
import { formatKm } from '../schemas/masks';
import { ROUTE_TEXT_MAX, routeDepartureSchema } from '../schemas/route';
import type { RouteDepartureInput, RouteDepartureValues } from '../schemas/route';
import { createRoute, hasOpenRoute } from '../services/routes';
import { applyServerError, isRuleError, parseServerError } from '../services/serverErrors';
import { getVehicle, listRouteVehicles } from '../services/vehicles';
import type { RouteVehicle } from '../services/vehicles';
import { colors, spacing } from '../theme';

/** Fields of the form, in the names the server uses, so its field errors can be matched. */
const FIELDS = ['vehicle', 'itinerary', 'obs_departure'] as const;

/** What the screen is showing: the request in progress, its failure, a blocked driver or the form. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'blocked' }
    | { status: 'ready'; vehicles: RouteVehicle[] };

/**
 * Route departure (RF07), the "Rota" module. On opening, and each time the screen gets focus, it
 * checks whether the driver already has an open route (RB02): if so it warns and goes back to
 * the Services tab without showing the form. Otherwise the form asks for the vehicle, shows its
 * current km read-only (RB03, the km of departure is that value) and takes the itinerary and an
 * optional observation, validated with Zod before sending. The vehicle field lists the active
 * vehicles (RB12): the free ones can be chosen, and the ones with an open route are listed with
 * the "Indisponível" badge and cannot be (RB01). The list is loaded again with each focus, so it
 * reflects a return or an administrative closure made since the last visit, and the choice is
 * dropped when that vehicle stops being free. The app checks only for feedback: the server
 * refuses a second open route of the driver or of the vehicle, and a failure of the whole action
 * opens the NoticeDialog. On success it shows a toast and goes back.
 */
export default function RouteDepartureScreen() {
    const navigation = useNavigation<RootNavigation>();
    const toast = useToast();
    const { user } = useAuth();
    const [state, setState] = useState<State>({ status: 'loading' });
    const [openRouteNotice, setOpenRouteNotice] = useState(false);
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const {
        control,
        handleSubmit,
        setError,
        setValue,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<RouteDepartureInput, unknown, RouteDepartureValues>({
        resolver: zodResolver(routeDepartureSchema),
        defaultValues: { vehicle: '', itinerary: '', obs_departure: '' },
    });
    const vehicles = state.status === 'ready' ? state.vehicles : null;
    const vehicleId = useWatch({ control, name: 'vehicle' });
    const selected = vehicles?.find((vehicle) => vehicle.id === vehicleId);
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
            if (user && (await hasOpenRoute(user.id))) {
                setState({ status: 'blocked' });
                setOpenRouteNotice(true);
                return;
            }

            const loaded = await listRouteVehicles();
            setState({ status: 'ready', vehicles: loaded });
            const current = getValues('vehicle');
            if (!loaded.some((vehicle) => vehicle.id === current && vehicle.available)) {
                setValue('vehicle', '');
            }
        } catch (error) {
            setState({ status: 'error', message: parseServerError(error).form ?? '' });
        }
    }, [user, getValues, setValue]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    function retry() {
        setState({ status: 'loading' });
        load();
    }

    /*
     * The departure km is the current km of the vehicle read again right before sending, so a
     * route finalized since the list was loaded cannot leave a stale value behind. If it moved,
     * the form shows the new km and asks the driver to confirm by sending again.
     */
    const submit = handleSubmit(async (values) => {
        try {
            const fresh = await getVehicle(values.vehicle);
            if (selected && fresh.odometer !== selected.odometer) {
                setState((previous) =>
                    previous.status === 'ready'
                        ? {
                              status: 'ready',
                              vehicles: previous.vehicles.map((vehicle) =>
                                  vehicle.id === fresh.id
                                      ? { ...vehicle, odometer: fresh.odometer }
                                      : vehicle,
                              ),
                          }
                        : previous,
                );
                setFailure({
                    visible: true,
                    title: 'O km do veículo mudou',
                    message:
                        'O km atual do veículo foi atualizado. Confira o km e registre a saída de novo.',
                });
                return;
            }

            await createRoute(values, fresh.odometer);
            toast.show('success', 'Saída registrada.');
            navigation.goBack();
        } catch (error) {
            if (parseServerError(error).fields.user) {
                setOpenRouteNotice(true);
                return;
            }

            const message = applyServerError(error, setError, FIELDS);
            load();
            if (!message) {
                return;
            }
            setFailure({
                visible: true,
                title: isRuleError(error) ? 'Ação não permitida' : 'Não foi possível salvar',
                message,
            });
        }
    });

    const openRouteDialog = (
        <NoticeDialog
            visible={openRouteNotice}
            title="Rota em andamento"
            message="Você já tem uma rota aberta. Registre o retorno antes de iniciar outra."
            onClose={() => setOpenRouteNotice(false)}
            onHidden={() => navigation.goBack()}
        />
    );

    if (state.status === 'loading') {
        return <LoadingState />;
    }

    if (state.status === 'blocked') {
        return <View style={styles.screen}>{openRouteDialog}</View>;
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
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar saída</CardTitle>
                        <CardDescription>Informe os dados para iniciar a rota.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Controller
                            control={control}
                            name="vehicle"
                            render={({ field: { onChange, value } }) => (
                                <Select
                                    label="Veículo"
                                    options={options}
                                    value={value || undefined}
                                    onChange={onChange}
                                    error={errors.vehicle?.message}
                                    disabled={isSubmitting}
                                />
                            )}
                        />

                        <TextField
                            label="Km atual"
                            placeholder="Selecione o veículo"
                            value={selected ? formatKm(selected.odometer) : ''}
                            suffix="km"
                            editable={false}
                        />

                        <Controller
                            control={control}
                            name="itinerary"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Itinerário"
                                    placeholder="Ex.: Entrega de pedidos no Centro"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.itinerary?.message}
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="obs_departure"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Observação (opcional)"
                                    placeholder="Alguma informação para o supervisor"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.obs_departure?.message}
                                    multiline
                                    maxLength={ROUTE_TEXT_MAX}
                                    showCount
                                    editable={!isSubmitting}
                                />
                            )}
                        />
                    </CardContent>
                </Card>
            </ScrollView>

            <ActionBar>
                <Button title="Registrar saída" onPress={() => submit()} loading={isSubmitting} />
            </ActionBar>

            <NoticeDialog
                visible={failure.visible}
                title={failure.title}
                message={failure.message}
                onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
            />
            {openRouteDialog}
        </KeyboardAvoidingView>
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
