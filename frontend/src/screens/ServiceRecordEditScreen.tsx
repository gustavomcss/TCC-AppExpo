import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { Fact } from '../components/Fact';
import { FormScrollView } from '../components/FormScrollView';
import { LoadingState } from '../components/LoadingState';
import { NoticeDialog } from '../components/NoticeDialog';
import { Select } from '../components/Select';
import { TextField } from '../components/TextField';
import { useToast } from '../contexts/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { FUEL_TYPES, fuelEditSchema } from '../schemas/fuel';
import type { FuelEditInput, FuelEditValues } from '../schemas/fuel';
import { formatDateTime, formatDecimal, formatDecimalInput, formatKm } from '../schemas/masks';
import { OIL_TYPE_MAX, oilEditSchema } from '../schemas/oil';
import type { OilEditInput, OilEditValues } from '../schemas/oil';
import { REPAIR_DESCRIPTION_MAX, repairEditSchema } from '../schemas/repair';
import type { RepairEditInput, RepairEditValues } from '../schemas/repair';
import { updateFuel } from '../services/fuels';
import { updateOil } from '../services/oils';
import { updateRepair } from '../services/repairs';
import { getServiceRecord } from '../services/serviceRecords';
import type {
    FuelRecord,
    OilRecord,
    RepairRecord,
    ServiceRecord,
} from '../services/serviceRecords';
import {
    applyServerError,
    isNotFoundError,
    isRuleError,
    parseServerError,
} from '../services/serverErrors';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceRecordEdit'>;

/** What the screen is showing: the request in progress, its failure or the record. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; record: ServiceRecord };

/** Title of the screen for each kind of record. */
export const EDIT_TITLES = {
    fuel: 'Editar abastecimento',
    oil: 'Editar troca de óleo',
    repair: 'Editar manutenção',
} as const;

/** Message of the refusal for a record that is not the user's: the server answers it with 404. */
const NOT_AUTHOR_MESSAGE = 'Só o autor pode editar este registro.';

/**
 * Edit of one fueling, oil change or repair (RF21), opened from the history cards of the author.
 * The vehicle, the km, the author and the date are shown for reading only (RB17), and the form has
 * just the non-sensitive fields, validated with the rules of the creation (RB16: up to 999.999,99,
 * two decimals, greater than zero). Editing does not touch the current km of the vehicle (RB04).
 * The server holds the rules: only the author edits, not even a supervisor edits someone else's
 * record, and a refusal opens the NoticeDialog. On success it shows a toast and goes back.
 */
export default function ServiceRecordEditScreen({ route }: Props) {
    const { kind, recordId } = route.params;
    const [state, setState] = useState<State>({ status: 'loading' });

    const load = useCallback(async () => {
        try {
            setState({ status: 'ready', record: await getServiceRecord(kind, recordId) });
        } catch (error) {
            setState({ status: 'error', message: parseServerError(error).form ?? '' });
        }
    }, [kind, recordId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    function retry() {
        setState({ status: 'loading' });
        load();
    }

    if (state.status === 'loading') {
        return <LoadingState />;
    }

    if (state.status === 'error') {
        return (
            <ErrorState
                title="Não foi possível carregar o registro"
                message={state.message}
                onRetry={retry}
            />
        );
    }

    switch (state.record.kind) {
        case 'fuel':
            return <FuelEditForm record={state.record} />;
        case 'oil':
            return <OilEditForm record={state.record} />;
        case 'repair':
            return <RepairEditForm record={state.record} />;
    }
}

/** The failure of a save that the NoticeDialog shows. */
type Failure = { visible: boolean; title: string; message: string };

/**
 * Keeps the failure of a save for the NoticeDialog. A refused rule or a record that is not the
 * user's (404) is "Ação não permitida"; anything else is a failed save.
 */
function useSaveFailure() {
    const [failure, setFailure] = useState<Failure>({ visible: false, title: '', message: '' });

    function show(error: unknown, message: string) {
        const refused = isRuleError(error) || isNotFoundError(error);
        setFailure({
            visible: true,
            title: refused ? 'Ação não permitida' : 'Não foi possível salvar',
            message: isNotFoundError(error) ? NOT_AUTHOR_MESSAGE : message,
        });
    }

    function close() {
        setFailure((previous) => ({ ...previous, visible: false }));
    }

    return { failure, show, close };
}

/**
 * Layout shared by the three forms: the read-only card with what stays fixed (vehicle, km, author
 * and date), the card with the editable fields (`children`), the fixed save bar and the dialog
 * for a failed save.
 */
function EditLayout({
    record,
    fieldsTitle,
    saving,
    onSave,
    failure,
    onCloseFailure,
    children,
}: {
    record: ServiceRecord;
    fieldsTitle: string;
    saving: boolean;
    onSave: () => void;
    failure: Failure;
    onCloseFailure: () => void;
    children: ReactNode;
}) {
    return (
        <View style={styles.screen}>
            <FormScrollView contentContainerStyle={styles.content}>
                <Card>
                    <CardHeader>
                        <CardTitle>Dados do registro</CardTitle>
                        <CardDescription>Estes dados não podem ser alterados.</CardDescription>
                    </CardHeader>

                    <View style={styles.separator} />

                    <View style={styles.facts}>
                        <Fact label="Km registrado" value={`${formatKm(record.km)} km`} />
                        <Fact label="Registrado" value={formatDateTime(record.created)} />
                        <Fact
                            label="Veículo"
                            value={`${record.vehicle.plate} · ${record.vehicle.model}`}
                            wide
                        />
                        <Fact label="Autor" value={record.authorName} wide />
                    </View>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{fieldsTitle}</CardTitle>
                    </CardHeader>

                    <CardContent>{children}</CardContent>
                </Card>
            </FormScrollView>

            <ActionBar>
                <Button title="Salvar alterações" onPress={onSave} loading={saving} />
            </ActionBar>

            <NoticeDialog
                visible={failure.visible}
                title={failure.title}
                message={failure.message}
                onClose={onCloseFailure}
            />
        </View>
    );
}

/** Fields of the fueling edit form, in the names the server uses. */
const FUEL_FIELDS = ['type', 'liters', 'cost'] as const;

/** Edit form of a fueling: fuel type, liters and total cost. */
function FuelEditForm({ record }: { record: FuelRecord }) {
    const navigation = useNavigation();
    const toast = useToast();
    const { failure, show, close } = useSaveFailure();
    const {
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FuelEditInput, unknown, FuelEditValues>({
        resolver: zodResolver(fuelEditSchema),
        defaultValues: {
            type: record.type,
            liters: formatDecimal(record.liters),
            cost: formatDecimal(record.cost),
        },
    });

    const submit = handleSubmit(async (values) => {
        try {
            await updateFuel(record.id, values);
            toast.show('success', 'Alterações salvas.');
            navigation.goBack();
        } catch (error) {
            const message = applyServerError(error, setError, FUEL_FIELDS);
            if (message) {
                show(error, message);
            }
        }
    });

    return (
        <EditLayout
            record={record}
            fieldsTitle="Dados do abastecimento"
            saving={isSubmitting}
            onSave={() => submit()}
            failure={failure}
            onCloseFailure={close}
        >
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
                        onChangeText={(text) => onChange(formatDecimalInput(text, value))}
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
                        onChangeText={(text) => onChange(formatDecimalInput(text, value))}
                        onBlur={onBlur}
                        onSubmitEditing={() => submit()}
                        error={errors.cost?.message}
                        keyboardType="number-pad"
                        prefix="R$"
                        editable={!isSubmitting}
                    />
                )}
            />
        </EditLayout>
    );
}

/** Fields of the oil change edit form, in the names the server uses. */
const OIL_FIELDS = ['type', 'cost'] as const;

/** Edit form of an oil change: oil type and cost. */
function OilEditForm({ record }: { record: OilRecord }) {
    const navigation = useNavigation();
    const toast = useToast();
    const { failure, show, close } = useSaveFailure();
    const {
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<OilEditInput, unknown, OilEditValues>({
        resolver: zodResolver(oilEditSchema),
        defaultValues: { type: record.type, cost: formatDecimal(record.cost) },
    });

    const submit = handleSubmit(async (values) => {
        try {
            await updateOil(record.id, values);
            toast.show('success', 'Alterações salvas.');
            navigation.goBack();
        } catch (error) {
            const message = applyServerError(error, setError, OIL_FIELDS);
            if (message) {
                show(error, message);
            }
        }
    });

    return (
        <EditLayout
            record={record}
            fieldsTitle="Dados da troca de óleo"
            saving={isSubmitting}
            onSave={() => submit()}
            failure={failure}
            onCloseFailure={close}
        >
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
                        onChangeText={(text) => onChange(formatDecimalInput(text, value))}
                        onBlur={onBlur}
                        onSubmitEditing={() => submit()}
                        error={errors.cost?.message}
                        keyboardType="number-pad"
                        prefix="R$"
                        editable={!isSubmitting}
                    />
                )}
            />
        </EditLayout>
    );
}

/** Fields of the repair edit form, in the names the server uses. */
const REPAIR_FIELDS = ['description', 'cost'] as const;

/** Edit form of a repair: description and cost. */
function RepairEditForm({ record }: { record: RepairRecord }) {
    const navigation = useNavigation();
    const toast = useToast();
    const { failure, show, close } = useSaveFailure();
    const {
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<RepairEditInput, unknown, RepairEditValues>({
        resolver: zodResolver(repairEditSchema),
        defaultValues: { description: record.description, cost: formatDecimal(record.cost) },
    });

    const submit = handleSubmit(async (values) => {
        try {
            await updateRepair(record.id, values);
            toast.show('success', 'Alterações salvas.');
            navigation.goBack();
        } catch (error) {
            const message = applyServerError(error, setError, REPAIR_FIELDS);
            if (message) {
                show(error, message);
            }
        }
    });

    return (
        <EditLayout
            record={record}
            fieldsTitle="Dados da manutenção"
            saving={isSubmitting}
            onSave={() => submit()}
            failure={failure}
            onCloseFailure={close}
        >
            <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                    <TextField
                        label="Descrição"
                        placeholder="Ex.: Troca das pastilhas de freio"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.description?.message}
                        multiline
                        maxLength={REPAIR_DESCRIPTION_MAX}
                        showCount
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
                        onChangeText={(text) => onChange(formatDecimalInput(text, value))}
                        onBlur={onBlur}
                        onSubmitEditing={() => submit()}
                        error={errors.cost?.message}
                        keyboardType="number-pad"
                        prefix="R$"
                        editable={!isSubmitting}
                    />
                )}
            />
        </EditLayout>
    );
}

/** Styles of the edit screen: two cards on the same gray background as the other screens. */
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
    facts: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.lg,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
    },
});
