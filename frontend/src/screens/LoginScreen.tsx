import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

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
 * Space kept between the password field and the keyboard, so the Entrar button (gap 16, 40 dp),
 * the card padding (12), the note under the card (gap 24, 16 dp) and a margin of 36 stay visible.
 */
const KEYBOARD_CLEARANCE = 144;

/**
 * Login screen (RF01). There is no sign-up link: users are created by the supervisor or by the
 * superadmin, and a line under the card says so. The app name and tagline sit above the card,
 * which holds only the form. Field errors show under the field; a refused login opens the
 * NoticeDialog, since it concerns the whole action. A session ended by the server (I-07) shows
 * its notice above the card. The keyboard is handled by the KeyboardAwareScrollView of
 * react-native-keyboard-controller, the same as in the forms (FormScrollView), on iOS and Android:
 * when the keyboard opens, the field in focus is scrolled above it, in step with the keyboard.
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
        <View style={styles.screen}>
            <KeyboardAwareScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                bottomOffset={KEYBOARD_CLEARANCE}
            >
                <View style={styles.content}>
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

                            <Button
                                title="Entrar"
                                onPress={() => submit()}
                                loading={isSubmitting}
                            />
                        </CardContent>
                    </Card>

                    <Text style={styles.footnote}>
                        Sem acesso? Peça ao supervisor da sua empresa.
                    </Text>
                </View>
            </KeyboardAwareScrollView>

            <NoticeDialog
                visible={serverError !== null}
                title="Não foi possível entrar"
                message={serverError ?? ''}
                onClose={() => setServerError(null)}
            />
        </View>
    );
}

/** Styles of the login screen: the name, a card and a note centered on a light gray background. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
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
