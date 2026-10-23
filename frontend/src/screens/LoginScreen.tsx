import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    Animated,
    Easing,
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

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

/** Curve that follows the keyboard of iOS closely enough for the screen to move with it. */
const KEYBOARD_EASING = Easing.bezier(0.25, 0.46, 0.45, 0.94);

/**
 * Login screen (RF01). There is no sign-up link: users are created by the supervisor or by the
 * superadmin, and a line under the card says so. The app name and tagline sit above the card,
 * which holds only the form. Field errors show under the field; a refused login opens the
 * NoticeDialog, since it concerns the whole action. A session ended by the server (I-07) shows
 * its notice above the card. When the keyboard opens on iOS, the whole content moves up as one
 * piece, by half the keyboard height so it stays centered in what is left, with the duration the
 * system gives. A KeyboardAvoidingView was tried first and left out: its padding animation ran
 * apart from the re-centering of the content, so the card and its fields moved out of step.
 */
export default function LoginScreen() {
    const { signIn, notice } = useAuth();
    const [serverError, setServerError] = useState<string | null>(null);
    const [lift] = useState(() => new Animated.Value(0));
    const sizes = useRef({ screen: 0, content: 0 });
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    useEffect(() => {
        if (Platform.OS !== 'ios') {
            return;
        }

        const move = (toValue: number, duration: number) =>
            Animated.timing(lift, {
                toValue,
                duration,
                easing: KEYBOARD_EASING,
                useNativeDriver: true,
            }).start();

        const show = Keyboard.addListener('keyboardWillShow', (event) => {
            /* Never lift past the free space above the content, or its top would be cut off. */
            const free = Math.max(0, (sizes.current.screen - sizes.current.content) / 2);
            move(-Math.min(event.endCoordinates.height / 2, free), event.duration);
        });
        const hide = Keyboard.addListener('keyboardWillHide', (event) => move(0, event.duration));

        return () => {
            show.remove();
            hide.remove();
        };
    }, [lift]);

    const submit = handleSubmit(async ({ email, password }) => {
        setServerError(null);
        try {
            await signIn(email, password);
        } catch (error) {
            setServerError(describeLoginError(error));
        }
    });

    return (
        <View
            style={styles.screen}
            onLayout={(event) => {
                sizes.current.screen = event.nativeEvent.layout.height;
            }}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Animated.View
                    style={[styles.content, { transform: [{ translateY: lift }] }]}
                    onLayout={(event) => {
                        sizes.current.content = event.nativeEvent.layout.height;
                    }}
                >
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
                        O acesso é criado pelo supervisor da sua empresa.
                    </Text>
                </Animated.View>
            </ScrollView>

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
