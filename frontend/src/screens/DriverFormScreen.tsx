import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { FormScrollView } from '../components/FormScrollView';
import { NoticeDialog } from '../components/NoticeDialog';
import { TextField } from '../components/TextField';
import { useToast } from '../contexts/ToastContext';
import type { RootNavigation } from '../navigation/types';
import { driverSchema } from '../schemas/driver';
import type { DriverValues } from '../schemas/driver';
import { createDriver } from '../services/drivers';
import { applyServerError, isRuleError } from '../services/serverErrors';
import type { MessageOverrides } from '../services/serverErrors';
import { colors, spacing } from '../theme';

/** Fields of the form, in the names the server uses, so its field errors can be matched. */
const FIELDS = ['name', 'email', 'password'] as const;

/** Messages of this form that are more specific than the default translation of the code. */
const OVERRIDES: MessageOverrides = {
    email: {
        validation_not_unique: 'Já existe um usuário com este e-mail.',
    },
    password: {
        validation_min_text_constraint: 'A senha deve ter no mínimo 8 caracteres.',
    },
};

/**
 * Driver registration (RF03, RB19), opened from the driver list. Asks for name, e-mail and the
 * initial password; Zod checks them before sending, and the server still refuses a duplicate
 * e-mail, which lands on its field. The role and the active flag are not on the form: the driver
 * is always created as an active "motorista". On success a toast confirms and the screen goes
 * back to the list. The driver may sign in right away; changing the initial password is only
 * advised, not required.
 */
export default function DriverFormScreen() {
    const navigation = useNavigation<RootNavigation>();
    const toast = useToast();
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const {
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<DriverValues>({
        resolver: zodResolver(driverSchema),
        defaultValues: { name: '', email: '', password: '' },
    });

    const submit = handleSubmit(async (values) => {
        try {
            await createDriver(values);
            toast.show('success', 'Motorista cadastrado.');
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
        <View style={styles.screen}>
            <FormScrollView contentContainerStyle={styles.content}>
                <Card>
                    <CardHeader>
                        <CardTitle>Dados do motorista</CardTitle>
                        <CardDescription>O acesso é liberado com a senha inicial.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Nome"
                                    placeholder="Nome completo"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.name?.message}
                                    autoCapitalize="words"
                                    autoComplete="name"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="E-mail"
                                    placeholder="nome@empresa.com"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.email?.message}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Senha inicial"
                                    placeholder="Mínimo de 8 caracteres"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    onSubmitEditing={() => submit()}
                                    error={errors.password?.message}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoComplete="new-password"
                                    textContentType="newPassword"
                                    editable={!isSubmitting}
                                />
                            )}
                        />
                    </CardContent>
                </Card>
            </FormScrollView>

            <ActionBar>
                <Button
                    title="Cadastrar motorista"
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

/** Styles of the driver form: a card on the same gray background as the other screens. */
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
