import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { TextField } from '../components/TextField';
import { useAuth } from '../contexts/AuthContext';
import { loginSchema } from '../schemas/auth';
import type { LoginValues } from '../schemas/auth';
import { describeLoginError } from '../services/auth';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/**
 * Login screen (RF01). There is no sign-up link: users are created by the supervisor or by the
 * superadmin. The app name sits above the card, which holds only the form. Field errors show
 * under the field; a refused login shows as an alert above the button.
 */
export default function LoginScreen() {
    const { signIn } = useAuth();
    const [serverError, setServerError] = useState<string | null>(null);
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const submit = handleSubmit(async ({ email, password }) => {
        setServerError(null);
        try {
            await signIn(email, password);
        } catch (error) {
            setServerError(describeLoginError(error));
        }
    });

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.brand}>TRACE</Text>

                <Card>
                    <CardContent>
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
                                    autoComplete="email"
                                    autoCorrect={false}
                                    textContentType="emailAddress"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Senha"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    onSubmitEditing={submit}
                                    error={errors.password?.message}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoComplete="current-password"
                                    textContentType="password"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        {serverError && <Alert variant="destructive" title={serverError} />}

                        <Button title="Entrar" onPress={submit} loading={isSubmitting} />
                    </CardContent>
                </Card>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

/** Styles of the login screen: the name and a card centered on a light gray background. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        gap: spacing.xl,
        padding: spacing.xl,
    },
    brand: {
        color: colors.foreground,
        fontFamily: fontFamily.bold,
        fontSize: fontSize.xl,
        letterSpacing: 2,
        textAlign: 'center',
    },
});
