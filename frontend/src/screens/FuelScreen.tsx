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
import { FUEL_TYPES, fuelSchema } from '../schemas/fuel';
import type { FuelInput, FuelValues } from '../schemas/fuel';
import { formatDecimalInput } from '../schemas/masks';
import { createFuel } from '../services/fuels';
import { applyServerError, isRuleError, parseServerError } from '../services/serverErrors';
import { listActiveVehicles } from '../services/vehicles';
import type { Vehicle } from '../services/vehicles';
import { colors, spacing } from '../theme';

/** Fields of the form, in the names the server uses, so its field errors can be matched. */
const FIELDS = ['vehicle', 'km_fuel', 'type', 'liters', 'cost'] as const;

/** What the screen is showing: the request in progress, its failure or the form. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; vehicles: Vehicle[] };

/**
 * Fueling record (RF11), the "Abastecimento" module. Asks for the vehicle, the km, the fuel type,
 * the liters and the total cost, validated with Zod before sending (RB16: up to 999.999,99, two
 * decimals, greater than zero). The vehicle field lists only the active vehicles (RB12), loaded
 * again with each focus; the choice is dropped when that vehicle stops being active. The km is
 * only informative and does not change the current km of the vehicle (RB04). The author and the
 * date come from the server (RNF05), so they are not sent. What the server still refuses (an
 * inactive vehicle, a value out of range) comes back on the field, and a failure of the whole
 * action opens the NoticeDialog. On success it shows a toast and goes back.
 */
export default function FuelScreen() {
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
    } = useForm<FuelInput, unknown, FuelValues>({
        resolver: zodResolver(fuelSchema),
        defaultValues: { vehicle: '', km_fuel: '', liters: '', cost: '' },
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
            await createFuel(values);
            toast.show('success', 'Abastecimento registrado.');
            navigation.goBack();
        } catch (error) {
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
            <FormScrollView contentContainerStyle={styles.content}>
                <Card>
                    <CardHeader>
                        <CardTitle>Dados do abastecimento</CardTitle>
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
                            name="km_fuel"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Km atual"
                                    placeholder="0,00"
                                    value={value}
                                    onChangeText={(text) =>
                                        onChange(formatDecimalInput(text, value))
                                    }
                                    onBlur={onBlur}
                                    error={errors.km_fuel?.message}
                                    keyboardType="number-pad"
                                    suffix="km"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="type"
                            render={({ field: { onChange, value } }) => (
                                <Select
                                    label="Combustível"
                                    options={FUEL_TYPES}
                                    value={value}
                                    onChange={onChange}
                                    error={errors.type?.message}
                                    disabled={isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="liters"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Litros"
                                    placeholder="0,00"
                                    value={value}
                                    onChangeText={(text) =>
                                        onChange(formatDecimalInput(text, value))
                                    }
                                    onBlur={onBlur}
                                    error={errors.liters?.message}
                                    keyboardType="number-pad"
                                    suffix="L"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="cost"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Valor total"
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
                <Button
                    title="Registrar abastecimento"
                    onPress={() => submit()}
                    loading={isSubmitting}
                />
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

/** Styles of the fueling screen: a card on the same gray background as the other screens. */
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
