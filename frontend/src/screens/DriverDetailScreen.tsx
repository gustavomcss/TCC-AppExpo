import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { NoticeDialog } from '../components/NoticeDialog';
import { PhotoSheet } from '../components/PhotoSheet';
import type { PhotoSource } from '../components/PhotoSheet';
import { TextField } from '../components/TextField';
import { useToast } from '../contexts/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { driverNameSchema, driverPasswordSchema } from '../schemas/driver';
import type { DriverNameValues, DriverPasswordValues } from '../schemas/driver';
import {
    getDriver,
    removeDriverPhoto,
    resetDriverPassword,
    setDriverActive,
    updateDriverName,
    updateDriverPhoto,
} from '../services/drivers';
import type { Driver } from '../services/drivers';
import { CAMERA_DENIED_MESSAGE, pickImage } from '../services/photoPicker';
import { applyServerError, isRuleError, parseServerError } from '../services/serverErrors';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/** What the screen is showing: the request in progress, its failure, or the driver. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; driver: Driver };

/** The action in progress that has no form of its own, so its button can show it is working. */
type Busy = 'photo' | 'status' | null;

/**
 * Driver detail (RF03), opened from the driver list. The supervisor edits the name and the photo,
 * sets a new password and deactivates or reactivates the driver (RB19). The e-mail and the role
 * are shown but cannot be edited. The server holds every one of these rules: Zod only gives the
 * feedback before sending. Deactivating a driver with an open route is refused by the server, and
 * the app shows the warning to close the route first (RB18, RF10).
 */
export default function DriverDetailScreen({
    route,
}: NativeStackScreenProps<RootStackParamList, 'DriverDetail'>) {
    const { driverId } = route.params;
    const toast = useToast();
    const [state, setState] = useState<State>({ status: 'loading' });
    const [busy, setBusy] = useState<Busy>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const pendingSource = useRef<PhotoSource | null>(null);
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });

    const nameForm = useForm<DriverNameValues>({
        resolver: zodResolver(driverNameSchema),
        defaultValues: { name: '' },
    });
    const passwordForm = useForm<DriverPasswordValues>({
        resolver: zodResolver(driverPasswordSchema),
        defaultValues: { password: '' },
    });
    const { reset: resetNameForm } = nameForm;

    const load = useCallback(async () => {
        try {
            const driver = await getDriver(driverId);
            resetNameForm({ name: driver.name });
            setState({ status: 'ready', driver });
        } catch (error) {
            setState({ status: 'error', message: parseServerError(error).form ?? '' });
        }
    }, [driverId, resetNameForm]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    function retry() {
        setState({ status: 'loading' });
        load();
    }

    /* Shows the failure of an action that has no field of its own on the screen. */
    function fail(error: unknown) {
        const { fields, form } = parseServerError(error);
        /* A refused deactivation comes as an error on `active`, but it is a refused rule. */
        const refused = isRuleError(error) || 'active' in fields;
        setFailure({
            visible: true,
            title: refused ? 'Ação não permitida' : 'Não foi possível salvar',
            message:
                form ?? Object.values(fields)[0] ?? 'Não foi possível salvar. Tente novamente.',
        });
    }

    const saveName = nameForm.handleSubmit(async (values) => {
        try {
            const driver = await updateDriverName(driverId, values.name);
            resetNameForm({ name: driver.name });
            setState({ status: 'ready', driver });
            toast.show('success', 'Alterações salvas.');
        } catch (error) {
            const message = applyServerError(error, nameForm.setError, ['name']);
            if (message) {
                fail(error);
            }
        }
    });

    const savePassword = passwordForm.handleSubmit(async (values) => {
        try {
            await resetDriverPassword(driverId, values.password);
            passwordForm.reset({ password: '' });
            toast.show('success', 'Senha redefinida.');
        } catch (error) {
            const message = applyServerError(error, passwordForm.setError, ['password'], {
                password: {
                    validation_min_text_constraint: 'A senha deve ter no mínimo 8 caracteres.',
                },
            });
            if (message) {
                fail(error);
            }
        }
    });

    async function toggleActive() {
        if (state.status !== 'ready') {
            return;
        }

        const activate = !state.driver.active;
        setBusy('status');
        try {
            const driver = await setDriverActive(driverId, activate);
            setState({ status: 'ready', driver });
            toast.show(
                activate ? 'success' : 'warning',
                activate ? 'Motorista reativado.' : 'Motorista desativado.',
            );
        } catch (error) {
            fail(error);
        } finally {
            setBusy(null);
        }
    }

    /*
     * Choosing an option only closes the sheet; the camera or the gallery opens when the sheet is
     * gone (onHidden), and the removal runs then too, as in the User tab: iOS cannot present the
     * picker over a Modal that is still closing.
     */
    function choose(source: PhotoSource) {
        pendingSource.current = source;
        setSheetOpen(false);
    }

    async function changePhoto() {
        const source = pendingSource.current;
        pendingSource.current = null;
        if (!source) {
            return;
        }

        try {
            if (source === 'remove') {
                setBusy('photo');
                const driver = await removeDriverPhoto(driverId);
                setState({ status: 'ready', driver });
                toast.show('success', 'Foto removida.');
                return;
            }

            const picked = await pickImage(source);
            if (picked.status === 'denied') {
                setFailure({
                    visible: true,
                    title: 'Permissão necessária',
                    message: CAMERA_DENIED_MESSAGE,
                });
                return;
            }
            if (picked.status === 'canceled') {
                return;
            }

            setBusy('photo');
            const driver = await updateDriverPhoto(driverId, picked.photo);
            setState({ status: 'ready', driver });
            toast.show('success', 'Foto atualizada.');
        } catch (error) {
            fail(error);
        } finally {
            setBusy(null);
        }
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
                    title="Não foi possível carregar o motorista"
                    message={state.message}
                    onRetry={retry}
                />
            </View>
        );
    }

    const { driver } = state;
    const saving = nameForm.formState.isSubmitting;

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Card>
                    <View style={styles.hero}>
                        <Avatar name={driver.name} uri={driver.photoUrl} />
                        <View style={styles.texts}>
                            <Text style={styles.name}>{driver.name}</Text>
                            <Badge
                                label={driver.active ? 'Ativo' : 'Inativo'}
                                variant={driver.active ? 'outline' : 'secondary'}
                            />
                        </View>
                    </View>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Dados do motorista</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <Controller
                            control={nameForm.control}
                            name="name"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Nome"
                                    placeholder="Nome completo"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    onSubmitEditing={() => saveName()}
                                    error={nameForm.formState.errors.name?.message}
                                    autoCapitalize="words"
                                    autoComplete="name"
                                    editable={!saving}
                                />
                            )}
                        />

                        <TextField label="E-mail" value={driver.email} editable={false} />
                        <TextField label="Cargo" value="Motorista" editable={false} />

                        <Button
                            variant="secondary"
                            title="Trocar foto"
                            onPress={() => setSheetOpen(true)}
                            loading={busy === 'photo'}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Redefinir senha</CardTitle>
                        <CardDescription>
                            Defina uma nova senha de acesso. O motorista entra com ela na próxima
                            vez.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Controller
                            control={passwordForm.control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Nova senha"
                                    placeholder="Mínimo de 8 caracteres"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    onSubmitEditing={() => savePassword()}
                                    error={passwordForm.formState.errors.password?.message}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoComplete="new-password"
                                    textContentType="newPassword"
                                    editable={!passwordForm.formState.isSubmitting}
                                />
                            )}
                        />

                        <Button
                            variant="outline"
                            title="Redefinir senha"
                            onPress={() => savePassword()}
                            loading={passwordForm.formState.isSubmitting}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Situação</CardTitle>
                        <CardDescription>
                            {driver.active
                                ? 'Motorista com acesso ao app.'
                                : 'Motorista sem acesso ao app. Os registros continuam no histórico.'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Button
                            variant={driver.active ? 'destructive' : 'outline'}
                            title={driver.active ? 'Desativar motorista' : 'Reativar motorista'}
                            onPress={toggleActive}
                            loading={busy === 'status'}
                        />
                    </CardContent>
                </Card>
            </ScrollView>

            <ActionBar>
                <Button title="Salvar alterações" onPress={() => saveName()} loading={saving} />
            </ActionBar>

            <PhotoSheet
                visible={sheetOpen}
                title="Trocar foto"
                onClose={() => setSheetOpen(false)}
                onPick={choose}
                onHidden={changePhoto}
                canRemove={Boolean(driver.photoUrl)}
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

/** Styles of the driver detail: cards on the same gray background as the other screens. */
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
    texts: {
        flex: 1,
        gap: spacing.sm,
        alignItems: 'flex-start',
    },
    name: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        lineHeight: 24,
    },
});
