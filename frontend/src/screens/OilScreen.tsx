import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Car } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { FormScrollView } from '../components/FormScrollView';
import { LoadingState } from '../components/LoadingState';
import { NoticeDialog } from '../components/NoticeDialog';
import { Select } from '../components/Select';
import { TextField } from '../components/TextField';
import { VEHICLE_TYPE_ICONS } from '../components/vehicleTypeOptions';
import { useToast } from '../contexts/ToastContext';
import type { RootNavigation } from '../navigation/types';
import { formatDecimalInput } from '../schemas/masks';
import { OIL_TYPE_MAX, oilSchema } from '../schemas/oil';
import type { OilInput, OilValues } from '../schemas/oil';
import { createOil } from '../services/oils';
import {
    applyServerError,
    hasFieldCode,
    isRuleError,
    parseServerError,
} from '../services/serverErrors';
import { listActiveVehicles } from '../services/vehicles';
import type { Vehicle } from '../services/vehicles';
import { colors, spacing } from '../theme';

/**
 * Fields of the form, in the names the server uses, so its field errors can be matched. The
 * vehicle is left out: a refusal on it (an inactive vehicle) goes to the NoticeDialog.
 */
const FIELDS = ['km_oil', 'type', 'cost'] as const;

/** What the screen is showing: the request in progress, its failure or the form. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; vehicles: Vehicle[] };

/**
 * Oil change record (RF12), the "Troca de óleo" module. Asks for the vehicle, the km, the oil type
 * (free text) and the cost, validated with Zod before sending (RB16: up to 999.999,99, two
 * decimals, greater than zero). The vehicle field lists only the active vehicles (RB12), loaded
 * again with each focus; the choice is dropped when that vehicle stops being active. The km is
 * only informative and does not change the current km of the vehicle (RB04). The author and the
 * date come from the server (RNF05), so they are not sent. What the server still refuses (an
 * inactive vehicle, a value out of range) comes back on the field, and a failure of the whole
 * action opens the NoticeDialog. On success it shows a toast and goes back.
 */
export default function OilScreen() {
    const navigation = useNavigation<RootNavigation>();
    const toast = useToast();
    const [state, setState] = useState<State>({ status: 'loading' });
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const {
        control,
        handleSubmit,
        setError,
        setValue,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<OilInput, unknown, OilValues>({
        resolver: zodResolver(oilSchema),
        defaultValues: { vehicle: '', km_oil: '', type: '', cost: '' },
    });
    const vehicles = state.status === 'ready' ? state.vehicles : null;
    const vehicleOptions = useMemo(
        () =>
            (vehicles ?? []).map((vehicle) => ({
                value: vehicle.id,
                label: `${vehicle.plate} · ${vehicle.model}`,
                icon: VEHICLE_TYPE_ICONS[vehicle.type],
            })),
        [vehicles],
    );

    const load = useCallback(async () => {
        try {
            const loaded = await listActiveVehicles();
            setState({ status: 'ready', vehicles: loaded });
            const current = getValues('vehicle');
            if (!loaded.some((vehicle) => vehicle.id === current)) {
                setValue('vehicle', '');
            }
        } catch (error) {
            setState({ status: 'error', message: parseServerError(error).form ?? '' });
        }
    }, [getValues, setValue]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    function retry() {
        setState({ status: 'loading' });
        load();
    }

    const submit = handleSubmit(async (values) => {
        try {
            await createOil(values);
            toast.show('success', 'Troca de óleo registrada.');
            navigation.goBack();
        } catch (error) {
            const message = applyServerError(error, setError, FIELDS);
            load();
            if (!message) {
                return;
            }
            setFailure({
                visible: true,
                title:
                    isRuleError(error) || hasFieldCode(error, 'vehicle', 'vehicle_inactive')
                        ? 'Ação não permitida'
                        : 'Não foi possível salvar',
                message,
            });
        }
    });

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

                <NoticeDialog
                    visible={failure.visible}
                    title={failure.title}
                    message={failure.message}
                    onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
                />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <FormScrollView contentContainerStyle={styles.content}>
                <Card>
                    <CardHeader>
                        <CardTitle>Dados da troca de óleo</CardTitle>
                        <CardDescription>O km informado é apenas informativo.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Controller
                            control={control}
                            name="vehicle"
                            render={({ field: { onChange, value } }) => (
                                <Select
                                    label="Veículo"
                                    options={vehicleOptions}
                                    value={value || undefined}
                                    onChange={onChange}
                                    error={errors.vehicle?.message}
                                    disabled={isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="km_oil"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Km atual"
                                    placeholder="0,00"
                                    value={value}
                                    onChangeText={(text) =>
                                        onChange(formatDecimalInput(text, value))
                                    }
                                    onBlur={onBlur}
                                    error={errors.km_oil?.message}
                                    keyboardType="number-pad"
                                    suffix="km"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="type"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Tipo do óleo"
                                    placeholder="Ex.: 5W-30 sintético"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.type?.message}
                                    maxLength={OIL_TYPE_MAX}
                                    autoCapitalize="sentences"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="cost"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Valor"
                                    placeholder="0,00"
                                    value={value}
                                    onChangeText={(text) =>
                                        onChange(formatDecimalInput(text, value))
                                    }
                                    onBlur={onBlur}
                                    onSubmitEditing={() => submit()}
                                    error={errors.cost?.message}
                                    keyboardType="number-pad"
                                    prefix="R$"
                                    editable={!isSubmitting}
                                />
                            )}
                        />
                    </CardContent>
                </Card>
            </FormScrollView>

            <ActionBar>
                <Button title="Registrar troca" onPress={() => submit()} loading={isSubmitting} />
            </ActionBar>

            <NoticeDialog
                visible={failure.visible}
                title={failure.title}
                message={failure.message}
                onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
            />
        </View>
    );
}

/** Styles of the oil change screen: a card on the same gray background as the other screens. */
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
