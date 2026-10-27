import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/** How long a toast stays on screen, and how long it takes to slide in and out, in milliseconds. */
const TOAST_DURATION = 5000;
const TOAST_SLIDE = 280;

/**
 * Height of the strip above the bottom bar where toasts live, in dp, and how far below its place
 * a toast starts and ends: both are enough to hide the tallest toast behind the bar.
 */
const TOAST_AREA = 128;
const TOAST_TRAVEL = TOAST_AREA;

/** How far down, in dp, or how fast, in dp/ms, a drag has to go for the toast to be dismissed. */
const DISMISS_DISTANCE = 40;
const DISMISS_VELOCITY = 0.6;

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

/** Icon of each kind of toast. */
const icons = { success: CircleCheck, destructive: CircleAlert, warning: Info } as const;

/** What useToast gives: `show` replaces the toast on screen, if any, with a new one. */
type ToastContextValue = { show: (variant: ToastVariant, title: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

/** A bar fixed at the bottom of the screen that toasts come out from behind, with its height. */
type BottomBar = { id: string; height: number };

/** Lets a bottom bar tell the provider its height, and take it back when it goes away. */
type BottomBarRegistry = {
    set: (id: string, height: number) => void;
    clear: (id: string) => void;
};

const BottomBarContext = createContext<BottomBarRegistry | null>(null);

/**
 * Solid-color notice that slides up from behind the bottom bar, stays for TOAST_DURATION and slides
 * back down before calling `onDismiss`. Pressing it, or dragging it down, dismisses it the same
 * way at once; sliding out twice only restarts the same slide, so `onDismiss` runs once. It owns
 * its position, so each toast is mounted with a fresh one (the provider gives it a new `key`):
 * reusing one animated value across toasts left the next one invisible.
 */
function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const [translateY] = useState(() => new Animated.Value(TOAST_TRAVEL));
    const Icon = icons[toast.variant];

    const slideOut = useCallback(() => {
        Animated.timing(translateY, {
            toValue: TOAST_TRAVEL,
            duration: TOAST_SLIDE,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                onDismiss();
            }
        });
    }, [translateY, onDismiss]);

    useEffect(() => {
        Animated.timing(translateY, {
            toValue: 0,
            duration: TOAST_SLIDE,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
        const timer = setTimeout(slideOut, TOAST_DURATION);

        return () => {
            clearTimeout(timer);
            translateY.stopAnimation();
        };
    }, [translateY, slideOut]);

    /* A downward drag follows the finger; letting go far or fast enough sends the toast away. */
    const drag = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gesture) =>
                    gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
                onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
                onPanResponderRelease: (_, gesture) => {
                    if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
                        slideOut();
                    } else {
                        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
                    }
                },
                onPanResponderTerminate: () =>
                    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start(),
            }),
        [translateY, slideOut],
    );

    return (
        <Animated.View style={{ transform: [{ translateY }] }} {...drag.panHandlers}>
            <Pressable
                accessibilityRole="alert"
                onPress={slideOut}
                style={[styles.toast, { backgroundColor: backgrounds[toast.variant] }]}
            >
                <Icon color={colors.primaryForeground} size={16} />
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
    const [bars, setBars] = useState<BottomBar[]>([]);

    /* `id` grows with every toast, so a new one is a new view and not an update of the old. */
    const show = useCallback<ToastContextValue['show']>(
        (variant, title) =>
            setToast((previous) => ({ id: (previous?.id ?? 0) + 1, variant, title })),
        [],
    );
    const dismiss = useCallback(() => setToast(null), []);
    const value = useMemo(() => ({ show }), [show]);

    /*
     * The bar that registered last is the one on top: a form's ActionBar covers the tab bar under
     * it, and when it goes away the tab bar is the last one left.
     */
    const registry = useMemo<BottomBarRegistry>(
        () => ({
            set: (id, height) =>
                setBars((previous) =>
                    previous.some((bar) => bar.id === id)
                        ? previous.map((bar) => (bar.id === id ? { id, height } : bar))
                        : [...previous, { id, height }],
                ),
            clear: (id) => setBars((previous) => previous.filter((bar) => bar.id !== id)),
        }),
        [],
    );
    const barHeight = bars[bars.length - 1]?.height ?? 0;

    return (
        <ToastContext.Provider value={value}>
            <BottomBarContext.Provider value={registry}>{children}</BottomBarContext.Provider>
            {toast && (
                <View pointerEvents="box-none" style={[styles.overlay, { bottom: barHeight }]}>
                    <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
                </View>
            )}
        </ToastContext.Provider>
    );
}

/**
 * Declares that the calling component is a bar fixed at the bottom of the screen, `height` dp tall
 * (safe area included). Toasts rest just above it and slide in from behind it, and the strip
 * they move in is clipped at its top edge. Pass `null` while the height is not known. Used by the
 * tab bar and by the ActionBar.
 */
export function useBottomBar(height: number | null) {
    const registry = useContext(BottomBarContext);
    const id = useId();

    useEffect(() => {
        if (!registry || height === null) {
            return;
        }
        registry.set(id, height);

        return () => registry.clear(id);
    }, [registry, id, height]);
}

/** Access to `show`; only valid under ToastProvider. */
export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used inside ToastProvider');
    }

    return context;
}

/** Styles of the toast: floating above the tab bar, with a shadow to set it apart. */
const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: TOAST_AREA,
        justifyContent: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        overflow: 'hidden',
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
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
        flex: 1,
        color: colors.primaryForeground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
});
