import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    Animated,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { FieldError } from '../components/FieldError';
import { Label } from '../components/Label';
import { TextField } from '../components/TextField';
import { capitalizeWords, formatDecimalInput, formatPlate } from '../schemas/masks';
import { VEHICLE_TYPES, vehicleSchema } from '../schemas/vehicle';
import type { VehicleInput, VehicleValues } from '../schemas/vehicle';
import { applyServerError } from '../services/serverErrors';
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

/** How long a notice stays on screen, and how long its fade-out takes, in milliseconds. */
const NOTICE_DURATION = 5000;
const NOTICE_FADE = 400;

/** The message shown above the buttons after a submit, in the color of its kind. */
type Notice = { variant: 'success' | 'destructive'; title: string };

/**
 * Alert that fades out by itself after NOTICE_DURATION, then calls `onDismiss`, and the layout
 * below it slides up instead of jumping. It owns its opacity, so each notice is mounted with a
 * fresh one (the screen gives it a new `key`): reusing one animated value across notices left the
 * next alert invisible.
 */
function TransientAlert({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
    const [opacity] = useState(() => new Animated.Value(1));

    useEffect(() => {
        const timer = setTimeout(() => {
            Animated.timing(opacity, {
                toValue: 0,
                duration: NOTICE_FADE,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    onDismiss();
                }
            });
        }, NOTICE_DURATION);

        return () => {
            clearTimeout(timer);
            opacity.stopAnimation();
        };
    }, [opacity, onDismiss]);

    return (
        <Animated.View style={{ opacity }}>
            <Alert variant={notice.variant} title={notice.title} />
        </Animated.View>
    );
}

/**
 * Reference form for the other screens (I-08): React Hook Form with a Zod schema from
 * src/schemas validates before sending, and whatever the server still refuses (a duplicate
 * plate, a value out of range, an API rule) comes back as a message on the field or on the
 * form, never as a generic error. It creates a real vehicle, so only a supervisor succeeds; a
 * driver gets the API rule refusal. Reached from the home screen until the navigation (I-10)
 * and the vehicle management (I-16) replace it.
 */
export default function ExampleFormScreen({ onClose }: { onClose: () => void }) {
    /* `id` grows with every notice, so a new one is a new alert and not an update of the old. */
    const [shown, setShown] = useState<{ id: number; notice: Notice | null }>({
        id: 0,
        notice: null,
    });
    const {
        control,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<VehicleInput, unknown, VehicleValues>({
        resolver: zodResolver(vehicleSchema),
        defaultValues: { plate: '', model: '', odometer: '' },
    });

    const showNotice = (variant: Notice['variant'], title: string) =>
        setShown((previous) => ({ id: previous.id + 1, notice: { variant, title } }));
    const dismissNotice = useCallback(
        () => setShown((previous) => ({ ...previous, notice: null })),
        [],
    );

    const submit = handleSubmit(
        async (values) => {
            dismissNotice();
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
                reset();
                showNotice('success', 'Veículo cadastrado.');
            } catch (error) {
                const message = applyServerError(error, setError, FIELDS, OVERRIDES);
                if (message) {
                    showNotice('destructive', message);
                }
            }
        },
        /* An invalid attempt also clears the notice left by the previous one. */
        dismissNotice,
    );

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Card>
                    <CardHeader>
                        <CardTitle>Cadastrar veículo</CardTitle>
                        <CardDescription>Formulário de exemplo</CardDescription>
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

                        {/* Stand-in for the selector component planned in I-09. */}
                        <View style={styles.choice}>
                            <Label>Tipo</Label>
                            <Controller
                                control={control}
                                name="type"
                                render={({ field: { onChange, value } }) => (
                                    <View style={styles.options}>
                                        {VEHICLE_TYPES.map((type) => (
                                            <Button
                                                key={type.value}
                                                title={type.label}
                                                variant={
                                                    value === type.value ? 'default' : 'outline'
                                                }
                                                onPress={() => onChange(type.value)}
                                                disabled={isSubmitting}
                                                style={[
                                                    styles.option,
                                                    errors.type && styles.optionInvalid,
                                                ]}
                                            />
                                        ))}
                                    </View>
                                )}
                            />
                            <FieldError message={errors.type?.message} />
                        </View>

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
                                    onSubmitEditing={submit}
                                    error={errors.odometer?.message}
                                    keyboardType="number-pad"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        {shown.notice && (
                            <TransientAlert
                                key={shown.id}
                                notice={shown.notice}
                                onDismiss={dismissNotice}
                            />
                        )}

                        <Button title="Cadastrar" onPress={submit} loading={isSubmitting} />
                        <Button
                            variant="outline"
                            title="Voltar"
                            onPress={onClose}
                            disabled={isSubmitting}
                        />
                    </CardContent>
                </Card>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

/** Styles of the example form: a card centered on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    choice: {
        gap: spacing.sm,
    },
    options: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    option: {
        flexGrow: 1,
        paddingHorizontal: spacing.md,
    },
    optionInvalid: {
        borderColor: colors.destructive,
    },
});
