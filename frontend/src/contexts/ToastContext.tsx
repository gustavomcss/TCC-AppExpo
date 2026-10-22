import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/** How long a toast stays on screen, and how long its fade-out takes, in milliseconds. */
const TOAST_DURATION = 5000;
const TOAST_FADE = 400;

/** Distance from the top edge that clears the status bar or the notch. */
const TOP_OFFSET = Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + spacing.md;

/** The kinds of toast, each with a solid background and white text. */
type ToastVariant = 'success' | 'destructive' | 'warning';

/** A toast: the color of its kind and the message. */
type Toast = { id: number; variant: ToastVariant; title: string };

/** Background of each kind of toast. */
const backgrounds = {
    success: colors.success,
    destructive: colors.destructive,
    warning: colors.warning,
} as const;

/** What useToast gives: `show` replaces the toast on screen, if any, with a new one. */
type ToastContextValue = { show: (variant: ToastVariant, title: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Solid-color notice that fades out by itself after TOAST_DURATION and then calls `onDismiss`; pressing it
 * dismisses it at once. It owns its opacity, so each toast is mounted with a fresh one (the
 * provider gives it a new `key`): reusing one animated value across toasts left the next one
 * invisible.
 */
function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const [opacity] = useState(() => new Animated.Value(1));

    useEffect(() => {
        const timer = setTimeout(() => {
            Animated.timing(opacity, {
                toValue: 0,
                duration: TOAST_FADE,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) {
                    onDismiss();
                }
            });
        }, TOAST_DURATION);

        return () => {
            clearTimeout(timer);
            opacity.stopAnimation();
        };
    }, [opacity, onDismiss]);

    return (
        <Animated.View style={{ opacity }}>
            <Pressable
                accessibilityRole="alert"
                onPress={onDismiss}
                style={[styles.toast, { backgroundColor: backgrounds[toast.variant] }]}
            >
                <Text style={styles.text}>{toast.title}</Text>
            </Pressable>
        </Animated.View>
    );
}

/**
 * Shows the app's toasts over every screen: short notices that confirm an action (green) or warn
 * (blue) and go away by themselves (RNF08). Failures are not toasts: they use the NoticeDialog,
 * which the user has to acknowledge. Wrap the app in it once.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toast, setToast] = useState<Toast | null>(null);

    /* `id` grows with every toast, so a new one is a new view and not an update of the old. */
    const show = useCallback<ToastContextValue['show']>(
        (variant, title) =>
            setToast((previous) => ({ id: (previous?.id ?? 0) + 1, variant, title })),
        [],
    );
    const dismiss = useCallback(() => setToast(null), []);
    const value = useMemo(() => ({ show }), [show]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toast && (
                <View pointerEvents="box-none" style={styles.overlay}>
                    <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
                </View>
            )}
        </ToastContext.Provider>
    );
}

/** Access to `show`; only valid under ToastProvider. */
export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used inside ToastProvider');
    }

    return context;
}

/** Styles of the toast: floating above the screen, with a shadow to set it apart. */
const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: TOP_OFFSET,
        left: spacing.xl,
        right: spacing.xl,
    },
    toast: {
        borderRadius: radius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        shadowColor: '#000000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    text: {
        color: colors.primaryForeground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
        textAlign: 'center',
    },
});
