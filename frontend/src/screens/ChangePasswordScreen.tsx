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
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { RootNavigation } from '../navigation/types';
import { changePasswordSchema } from '../schemas/auth';
import type { ChangePasswordValues } from '../schemas/auth';
import { changePassword } from '../services/profile';
import { applyServerError, isRuleError } from '../services/serverErrors';
import type { MessageOverrides } from '../services/serverErrors';
import { colors, spacing } from '../theme';

/** Fields of the form, in the names the server uses, so its field errors can be matched. */
const FIELDS = ['oldPassword', 'password', 'passwordConfirm'] as const;

/** Messages of this form that are more specific than the default translation of the code. */
const OVERRIDES: MessageOverrides = {
    oldPassword: {
        validation_invalid_old_password: 'A senha atual informada está incorreta.',
        validation_required: 'Informe a senha atual.',
    },
    password: {
        validation_min_text_constraint: 'A nova senha deve ter no mínimo 8 caracteres.',
    },
    passwordConfirm: {
        validation_values_mismatch: 'A confirmação não confere com a nova senha.',
    },
};

/**
 * Password change (RF04, RB19), opened from the User tab. Asks for the current password, the new
 * one and its confirmation; Zod checks them before sending and the server still checks the
 * current one, whose error lands on its field. On success the session is renewed with the new
 * password, a toast confirms and the screen goes back to the User tab.
 */
export default function ChangePasswordScreen() {
    const { user } = useAuth();
    const navigation = useNavigation<RootNavigation>();
    const toast = useToast();
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const {
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { oldPassword: '', password: '', passwordConfirm: '' },
    });

    const submit = handleSubmit(async (values) => {
        if (!user) {
            return;
        }

        try {
            await changePassword(user.id, user.email, values);
            toast.show('success', 'Senha alterada.');
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
                        <CardTitle>Nova senha</CardTitle>
                        <CardDescription>Use no mínimo 8 caracteres.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Controller
                            control={control}
                            name="oldPassword"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Senha atual"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.oldPassword?.message}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoComplete="current-password"
                                    textContentType="password"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Nova senha"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.password?.message}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoComplete="new-password"
                                    textContentType="newPassword"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="passwordConfirm"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Confirmar nova senha"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    onSubmitEditing={() => submit()}
                                    error={errors.passwordConfirm?.message}
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
                <Button title="Alterar senha" onPress={() => submit()} loading={isSubmitting} />
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

/** Styles of the password screen: a card on the same gray background as the other screens. */
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
