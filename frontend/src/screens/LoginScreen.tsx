import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { NoticeDialog } from '../components/NoticeDialog';
import { PrivacySheet } from '../components/PrivacySheet';
import { TextField } from '../components/TextField';
import { useAuth } from '../contexts/AuthContext';
import { useBottomBar, useToast } from '../contexts/ToastContext';
import { loginSchema } from '../schemas/auth';
import type { LoginValues } from '../schemas/auth';
import { describeLoginError } from '../services/auth';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/**
 * Space kept between the password field and the keyboard, so the Entrar button (gap 16, 40 dp),
 * the card padding (12), the footer under the card (gap 24, then the note of 16 dp, a gap of 4 and
 * the privacy link of 16 dp) and a margin of 36 stay visible: 16 + 40 + 12 + 24 + 36 + 36 = 164.
 */
const KEYBOARD_CLEARANCE = 164;

/**
 * Login screen (RF01). There is no sign-up link: users are created by the supervisor or by the
 * superadmin, and a line under the card says so, followed by the link to the privacy notice. The app name and tagline sit above the card,
 * which holds only the form. Field errors show under the field; a refused login opens the
 * NoticeDialog, since it concerns the whole action. A session ended by the server (I-07) shows
 * its notice as a blue toast, the app's pattern for a warning, resting above the safe area. The keyboard is handled by the KeyboardAwareScrollView of
 * react-native-keyboard-controller, the same as in the forms (FormScrollView), on iOS and Android:
 * when the keyboard opens, the field in focus is scrolled above it, in step with the keyboard.
 */
export default function LoginScreen() {
    const { signIn, notice } = useAuth();
    const { show } = useToast();
    const insets = useSafeAreaInsets();
    const [serverError, setServerError] = useState<string | null>(null);
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    /* There is no bar on this screen: the safe area is what the toast rests above. */
    useBottomBar(insets.bottom);
    useEffect(() => {
        if (notice) {
            show('warning', notice);
        }
    }, [notice, show]);

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

                    <View style={styles.footer}>
                        <Text style={styles.footnote}>
                            Sem acesso? Peça ao supervisor da sua empresa.
                        </Text>
                        <Pressable
                            accessibilityRole="link"
                            onPress={() => setPrivacyOpen(true)}
                            hitSlop={spacing.md}
                        >
                            <Text style={styles.link}>Privacidade dos dados</Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAwareScrollView>

            <NoticeDialog
                visible={serverError !== null}
                title="Não foi possível entrar"
                message={serverError ?? ''}
                onClose={() => setServerError(null)}
            />
            <PrivacySheet visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
        </View>
    );
}

/** Styles of the login screen: the name, a card and a note with the privacy link centered on a light gray background. */
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
    footer: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    link: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.xs,
        lineHeight: 16,
        textDecorationLine: 'underline',
    },
    footnote: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.xs,
        lineHeight: 16,
        textAlign: 'center',
    },
});
