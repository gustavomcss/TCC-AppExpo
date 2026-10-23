import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { NoticeDialog } from '../components/NoticeDialog';
import { TextField } from '../components/TextField';
import { useAuth } from '../contexts/AuthContext';
import { loginSchema } from '../schemas/auth';
import type { LoginValues } from '../schemas/auth';
import { describeLoginError } from '../services/auth';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/**
 * Login screen (RF01). There is no sign-up link: users are created by the supervisor or by the
 * superadmin, and a line under the card says so. The app name and tagline sit above the card,
 * which holds only the form. Field errors show under the field; a refused login opens the
 * NoticeDialog, since it concerns the whole action. A session ended by the server (I-07) shows
 * its notice above the card.
 */
export default function LoginScreen() {
    const { signIn, notice } = useAuth();
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
                <View style={styles.mark}>
                    <Text style={styles.brand}>TRACE</Text>
                    <Text style={styles.tagline}>Gestão operacional de frotas</Text>
                </View>

                {notice && (
                    <Alert variant="warning" title="Sessão encerrada" description={notice} />
                )}

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
                                    onSubmitEditing={() => submit()}
                                    error={errors.password?.message}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoComplete="current-password"
                                    textContentType="password"
                                    editable={!isSubmitting}
                                />
                            )}
                        />

                        <Button title="Entrar" onPress={() => submit()} loading={isSubmitting} />
                    </CardContent>
                </Card>

                <Text style={styles.footnote}>
                    O acesso é criado pelo supervisor da sua empresa.
                </Text>
            </ScrollView>

            <NoticeDialog
                visible={serverError !== null}
                title="Não foi possível entrar"
                message={serverError ?? ''}
                onClose={() => setServerError(null)}
            />
        </KeyboardAvoidingView>
    );
}

/** Styles of the login screen: the name, a card and a note centered on a light gray background. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        gap: spacing.xl,
        padding: spacing.lg,
    },
    mark: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    brand: {
        color: colors.foreground,
        fontFamily: fontFamily.bold,
        fontSize: fontSize.xl,
        lineHeight: 32,
        letterSpacing: 4,
        textAlign: 'center',
    },
    tagline: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    footnote: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.xs,
        lineHeight: 16,
        textAlign: 'center',
    },
});
