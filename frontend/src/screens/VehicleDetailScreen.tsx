import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { NoticeDialog } from '../components/NoticeDialog';
import { Select } from '../components/Select';
import { TextField } from '../components/TextField';
import { VEHICLE_TYPE_ICONS, VEHICLE_TYPE_OPTIONS } from '../components/vehicleTypeOptions';
import { useToast } from '../contexts/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { capitalizeWords, formatKm, formatPlate } from '../schemas/masks';
import { vehicleEditSchema } from '../schemas/vehicle';
import type { VehicleEditInput, VehicleEditValues } from '../schemas/vehicle';
import { applyServerError, isRuleError, parseServerError } from '../services/serverErrors';
import {
    VEHICLE_MESSAGE_OVERRIDES,
    deleteVehicle,
    findVehicleByPlate,
    getVehicle,
    setVehicleActive,
    typeLabel,
    updateVehicle,
} from '../services/vehicles';
import type { Vehicle } from '../services/vehicles';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';

/** Fields of the form, in the names the server uses, so its field errors can be matched. */
const FIELDS = ['plate', 'type', 'model'] as const;

/** What the screen is showing: the request in progress, its failure, or the vehicle. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; vehicle: Vehicle };

/** The action in progress that has no form of its own, so its button can show it is working. */
type Busy = 'status' | 'delete' | null;

/**
 * Vehicle detail (RF06), opened from the vehicle list. The supervisor edits plate, type and model,
 * inactivates or reactivates the vehicle and deletes one that has no records. The current km is
 * shown but cannot be edited (RB09): the server refuses a request that changes it, so the form
 * does not even send it. A changed plate is checked for a duplicate or equivalent one (RB20),
 * leaving the vehicle itself out, so editing is also how a vehicle converts to the equivalent
 * plate. Deleting a vehicle with records is refused by the server (RB12), and then the app offers
 * to inactivate it instead, which keeps it in the history; a confirmed deletion goes back to the
 * list.
 */
export default function VehicleDetailScreen({
    route,
    navigation,
}: NativeStackScreenProps<RootStackParamList, 'VehicleDetail'>) {
    const { vehicleId } = route.params;
    const toast = useToast();
    const [state, setState] = useState<State>({ status: 'loading' });
    const [busy, setBusy] = useState<Busy>(null);
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [offerOpen, setOfferOpen] = useState(false);
    const afterConfirm = useRef<(() => void) | null>(null);

    const form = useForm<VehicleEditInput, unknown, VehicleEditValues>({
        resolver: zodResolver(vehicleEditSchema),
        defaultValues: { plate: '', model: '' },
    });
    const { reset: resetForm } = form;

    const load = useCallback(async () => {
        try {
            const vehicle = await getVehicle(vehicleId);
            resetForm({ plate: vehicle.plate, type: vehicle.type, model: vehicle.model });
            setState({ status: 'ready', vehicle });
        } catch (error) {
            setState({ status: 'error', message: parseServerError(error).form ?? '' });
        }
    }, [vehicleId, resetForm]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    function retry() {
        setState({ status: 'loading' });
        load();
    }

    /* The dialog text for the failure of an action that has no field of its own on the screen. */
    function describeFailure(error: unknown) {
        const { fields, form: formMessage } = parseServerError(error);
        /* A refused inactivation or deletion comes as a field error, but it is a refused rule. */
        const refused = isRuleError(error) || 'active' in fields || 'id' in fields;
        return {
            title: refused ? 'Ação não permitida' : 'Não foi possível salvar',
            message:
                formMessage ??
                Object.values(fields)[0] ??
                'Não foi possível salvar. Tente novamente.',
        };
    }

    /* Shows the failure of an action that has no field of its own on the screen. */
    function fail(error: unknown) {
        setFailure({ visible: true, ...describeFailure(error) });
    }

    const save = form.handleSubmit(async (values) => {
        try {
            const taken = await findVehicleByPlate(values.plate, vehicleId);
            if (taken) {
                form.setError('plate', {
                    type: 'server',
                    message:
                        taken.plate === values.plate
                            ? 'Esta placa pertence a um veículo já cadastrado.'
                            : 'Esta placa equivale a um veículo já cadastrado.',
                });
                return;
            }

            const vehicle = await updateVehicle(vehicleId, values);
            resetForm({ plate: vehicle.plate, type: vehicle.type, model: vehicle.model });
            setState({ status: 'ready', vehicle });
            toast.show('success', 'Alterações salvas.');
        } catch (error) {
            const message = applyServerError(
                error,
                form.setError,
                FIELDS,
                VEHICLE_MESSAGE_OVERRIDES,
            );
            if (message) {
                fail(error);
            }
        }
    });

    /* Inactivates or reactivates the vehicle. Inactivating is undone by reactivating (RB12). */
    async function setActive(active: boolean) {
        setBusy('status');
        try {
            const vehicle = await setVehicleActive(vehicleId, active);
            setState({ status: 'ready', vehicle });
            toast.show(
                active ? 'success' : 'warning',
                active ? 'Veículo reativado.' : 'Veículo inativado.',
            );
        } catch (error) {
            fail(error);
        } finally {
            setBusy(null);
        }
    }

    /*
     * The deletion runs behind the confirmation dialog, which stays open and busy while the
     * request is on its way. What follows (going back to the list, the offer to inactivate, or
     * the warning) waits for the dialog to be gone (onHidden): iOS cannot present a Modal or
     * change screen under one that is still closing.
     */
    async function confirmDelete() {
        setBusy('delete');
        try {
            await deleteVehicle(vehicleId);
            afterConfirm.current = () => {
                toast.show('success', 'Veículo excluído.');
                navigation.goBack();
            };
        } catch (error) {
            const hasRecords = parseServerError(error).fields.id !== undefined;
            const active = state.status === 'ready' && state.vehicle.active;
            const failed = describeFailure(error);
            afterConfirm.current =
                hasRecords && active
                    ? () => setOfferOpen(true)
                    : () => setFailure({ visible: true, ...failed });
        } finally {
            setBusy(null);
            setConfirmOpen(false);
        }
    }

    /*
     * The offer to inactivate, shown after the server refuses to delete a vehicle with records.
     * Like the deletion, its result waits for the dialog to be gone.
     */
    async function confirmOffer() {
        setBusy('status');
        try {
            const vehicle = await setVehicleActive(vehicleId, false);
            setState({ status: 'ready', vehicle });
            afterConfirm.current = () => toast.show('warning', 'Veículo inativado.');
        } catch (error) {
            const failed = describeFailure(error);
            afterConfirm.current = () => setFailure({ visible: true, ...failed });
        } finally {
            setBusy(null);
            setOfferOpen(false);
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
                    title="Não foi possível carregar o veículo"
                    message={state.message}
                    onRetry={retry}
                />
            </View>
        );
    }

    const { vehicle } = state;
    const saving = form.formState.isSubmitting;
    const TypeIcon = VEHICLE_TYPE_ICONS[vehicle.type];

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Card>
                    <View style={styles.hero}>
                        <View style={styles.iconBox}>
                            <TypeIcon color={palette.g20} size={sizes.icon} />
                        </View>
                        <View style={styles.texts}>
                            <Text style={styles.plate}>{vehicle.plate}</Text>
                            <Text style={styles.detail}>
                                {vehicle.model} · {typeLabel(vehicle.type)}
                            </Text>
                            <Badge
                                label={vehicle.active ? 'Ativo' : 'Inativo'}
                                variant={vehicle.active ? 'outline' : 'secondary'}
                            />
                        </View>
                    </View>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Dados do veículo</CardTitle>
                        <CardDescription>
                            O km atual é atualizado pelas rotas e não pode ser editado.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Controller
                            control={form.control}
                            name="plate"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Placa"
                                    placeholder="ABC-1D23"
                                    value={value}
                                    onChangeText={(text) => onChange(formatPlate(text))}
                                    onBlur={onBlur}
                                    error={form.formState.errors.plate?.message}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    editable={!saving}
                                />
                            )}
                        />

                        <Controller
                            control={form.control}
                            name="type"
                            render={({ field: { onChange, value } }) => (
                                <Select
                                    label="Tipo"
                                    options={VEHICLE_TYPE_OPTIONS}
                                    value={value}
                                    onChange={onChange}
                                    error={form.formState.errors.type?.message}
                                    disabled={saving}
                                />
                            )}
                        />

                        <Controller
                            control={form.control}
                            name="model"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Modelo"
                                    placeholder="Ex.: Onix Plus"
                                    value={value}
                                    onChangeText={(text) => onChange(capitalizeWords(text))}
                                    onBlur={onBlur}
                                    onSubmitEditing={() => save()}
                                    error={form.formState.errors.model?.message}
                                    autoCapitalize="sentences"
                                    editable={!saving}
                                />
                            )}
                        />

                        <TextField
                            label="Km atual"
                            value={formatKm(vehicle.odometer)}
                            suffix="km"
                            editable={false}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Situação</CardTitle>
                        <CardDescription>
                            {vehicle.active
                                ? 'Veículo disponível para novas rotas e registros.'
                                : 'Veículo fora das seleções de novas rotas e registros. O histórico continua.'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Button
                            variant="outline"
                            title={vehicle.active ? 'Inativar veículo' : 'Reativar veículo'}
                            onPress={() => setActive(!vehicle.active)}
                            loading={busy === 'status'}
                        />
                        <Button
                            variant="destructive"
                            title="Excluir veículo"
                            onPress={() => setConfirmOpen(true)}
                        />
                    </CardContent>
                </Card>
            </ScrollView>

            <ActionBar>
                <Button title="Salvar alterações" onPress={() => save()} loading={saving} />
            </ActionBar>

            <ConfirmDialog
                visible={confirmOpen}
                title="Excluir veículo?"
                message="O cadastro será removido. Essa ação não pode ser desfeita."
                confirmLabel="Excluir"
                onConfirm={confirmDelete}
                onCancel={() => setConfirmOpen(false)}
                onHidden={afterConfirmHidden}
                loading={busy === 'delete'}
            />

            <ConfirmDialog
                visible={offerOpen}
                title="Inativar veículo?"
                message="Este veículo tem registros vinculados e não pode ser excluído. Inativo, ele sai das seleções de novas rotas e registros, e o histórico continua."
                confirmLabel="Inativar"
                onConfirm={confirmOffer}
                onCancel={() => setOfferOpen(false)}
                onHidden={afterConfirmHidden}
                destructive={false}
                loading={busy === 'status'}
            />

            <NoticeDialog
                visible={failure.visible}
                title={failure.title}
                message={failure.message}
                onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
            />
        </KeyboardAvoidingView>
    );
}

/** Styles of the vehicle detail: cards on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        flexGrow: 1,
        gap: spacing.lg,
        padding: spacing.lg,
    },
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
    },
    iconBox: {
        width: sizes.avatar,
        height: sizes.avatar,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: palette.gE0,
    },
    texts: {
        flex: 1,
        gap: spacing.xs,
        alignItems: 'flex-start',
    },
    plate: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        lineHeight: 24,
    },
    detail: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
});
