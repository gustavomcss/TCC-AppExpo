import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { NoticeDialog } from '../components/NoticeDialog';
import { Select } from '../components/Select';
import { TextField } from '../components/TextField';
import { VEHICLE_TYPE_OPTIONS } from '../components/vehicleTypeOptions';
import { useToast } from '../contexts/ToastContext';
import type { RootNavigation } from '../navigation/types';
import { capitalizeWords, formatDecimalInput, formatPlate } from '../schemas/masks';
import { vehicleSchema } from '../schemas/vehicle';
import type { VehicleInput, VehicleValues } from '../schemas/vehicle';
import { applyServerError, isRuleError } from '../services/serverErrors';
import type { MessageOverrides } from '../services/serverErrors';
import { createVehicle, findVehicleByPlate } from '../services/vehicles';
import { colors, spacing } from '../theme';

/** Fields of the form, in the names the server uses, so its field errors can be matched. */
const FIELDS = ['plate', 'type', 'model', 'odometer'] as const;

/** Messages of this form that are more specific than the default translation of the code. */
const OVERRIDES: MessageOverrides = {
    plate: {
        validation_not_unique:
            'Já existe um veículo com esta placa ou com a equivalente em outro padrão.',
        validation_invalid_format: 'Informe uma placa válida, como ABC-1D23.',
    },
};

/**
 * Vehicle registration (RF05), opened from the vehicle list. Asks for plate, type, model and the
 * current km, which is the starting point of the odometer: afterwards the server keeps it and the
 * app never edits it (RB03, RB09). React Hook Form with the Zod schema from src/schemas validates
 * before sending, and whatever the server still refuses (a duplicate or equivalent plate, a km
 * out of range, an API rule) comes back as a message on the field or on the form: a failure of
 * the whole action opens the NoticeDialog and success is a toast. The vehicle is always created
 * active by the server, so `active` is not on the form. The main action sits in the ActionBar
 * fixed at the bottom, and on success the screen goes back to the list.
 */
export default function VehicleFormScreen() {
    const navigation = useNavigation<RootNavigation>();
    const toast = useToast();
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const {
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<VehicleInput, unknown, VehicleValues>({
        resolver: zodResolver(vehicleSchema),
        defaultValues: { plate: '', model: '', odometer: '' },
    });

    const submit = handleSubmit(async (values) => {
        try {
            const taken = await findVehicleByPlate(values.plate);
            if (taken) {
                setError('plate', {
                    type: 'server',
                    message:
                        taken.plate === values.plate
                            ? 'Esta placa pertence a um veículo já cadastrado.'
                            : 'Esta placa equivale a um veículo já cadastrado.',
                });
                return;
            }

            await createVehicle(values);
            toast.show('success', 'Veículo cadastrado.');
            navigation.goBack();
        } catch (error) {
            const message = applyServerError(error, setError, FIELDS, OVERRIDES);
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

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Card>
                    <CardHeader>
                        <CardTitle>Dados do veículo</CardTitle>
                        <CardDescription>
                            O km atual é o ponto de partida do veículo.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Controller
                            control={control}
                            name="plate"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Placa"
                                    placeholder="ABC-1D23"
                                    value={value}
                                    onChangeText={(text) => onChange(formatPlate(text))}
                                    onBlur={onBlur}
                                    error={errors.plate?.message}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="type"
                            render={({ field: { onChange, value } }) => (
                                <Select
                                    label="Tipo"
                                    options={VEHICLE_TYPE_OPTIONS}
                                    value={value}
                                    onChange={onChange}
                                    error={errors.type?.message}
                                    disabled={isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="model"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Modelo"
                                    placeholder="Ex.: Onix Plus"
                                    value={value}
                                    onChangeText={(text) => onChange(capitalizeWords(text))}
                                    onBlur={onBlur}
                                    error={errors.model?.message}
                                    autoCapitalize="sentences"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="odometer"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Km Atual"
                                    placeholder="000.000,00"
                                    value={value}
                                    onChangeText={(text) =>
                                        onChange(formatDecimalInput(text, value))
                                    }
                                    onBlur={onBlur}
                                    onSubmitEditing={() => submit()}
                                    error={errors.odometer?.message}
                                    keyboardType="number-pad"
                                    suffix="km"
                                    editable={!isSubmitting}
                                />
                            )}
                        />
                    </CardContent>
                </Card>
            </ScrollView>

            <ActionBar>
                <Button title="Cadastrar veículo" onPress={() => submit()} loading={isSubmitting} />
            </ActionBar>

            <NoticeDialog
                visible={failure.visible}
                title={failure.title}
                message={failure.message}
                onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
            />
        </KeyboardAvoidingView>
    );
}

/** Styles of the vehicle form: a card on the same gray background as the other screens. */
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
