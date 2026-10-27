import { Check } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
    Animated,
    Easing,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';
import { Badge } from './Badge';

/** How long the sheet takes to slide in and out, in milliseconds. */
const SLIDE_IN = 350;
const SLIDE_OUT = 280;

/**
 * Props of BottomSheet. The caller owns `visible` and closes the sheet from `onClose`. `onHidden`
 * is called once the sheet is gone from the screen, for what must wait for that, such as opening
 * the camera: iOS cannot present anything over a Modal that is still on its way out.
 */
export type BottomSheetProps = {
    visible: boolean;
    title: string;
    onClose: () => void;
    onHidden?: () => void;
    children: ReactNode;
};

/**
 * Sheet that slides up from the bottom edge over a dark backdrop, with a grab handle and a title.
 * Pressing the backdrop or going back calls `onClose`. The sheet slides up and the backdrop fades
 * on its own: the Modal's own slide animation would carry the backdrop along with the sheet, like
 * a pane of dark glass. The slide decelerates as it arrives and accelerates as it leaves, which is
 * what makes it look smooth, and the Modal stays mounted until the slide-out ends.
 */
export function BottomSheet({ visible, title, onClose, onHidden, children }: BottomSheetProps) {
    const [mounted, setMounted] = useState(visible);
    const [progress] = useState(() => new Animated.Value(0));
    const { height } = useWindowDimensions();

    /* The latest onHidden, read when the slide-out ends, so a new callback does not restart it. */
    const hiddenCallback = useRef(onHidden);
    useEffect(() => {
        hiddenCallback.current = onHidden;
    });

    /* Opening mounts the Modal during this render; closing unmounts it when the slide-out ends. */
    if (visible && !mounted) {
        setMounted(true);
    }

    useEffect(() => {
        const animation = Animated.timing(progress, {
            toValue: visible ? 1 : 0,
            duration: visible ? SLIDE_IN : SLIDE_OUT,
            easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
            useNativeDriver: true,
        });
        animation.start(({ finished }) => {
            if (finished && !visible) {
                setMounted(false);
                /* Android has no Modal onDismiss, and there nothing needs to wait for the Modal. */
                if (Platform.OS !== 'ios') {
                    hiddenCallback.current?.();
                }
            }
        });

        return () => animation.stop();
    }, [visible, progress]);

    return (
        <Modal
            visible={mounted}
            transparent
            animationType="none"
            onRequestClose={onClose}
            onDismiss={onHidden}
        >
            <View style={styles.overlay}>
                <Animated.View style={[styles.backdrop, { opacity: progress }]}>
                    <Pressable
                        accessibilityLabel="Fechar"
                        style={StyleSheet.absoluteFill}
                        onPress={onClose}
                    />
                </Animated.View>
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [
                                {
                                    translateY: progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [height, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <View style={styles.grab} />
                    <Text accessibilityRole="header" style={styles.title}>
                        {title}
                    </Text>
                    {children}
                </Animated.View>
            </View>
        </Modal>
    );
}

/**
 * Props of SheetOption: its text, an optional icon before it, whether it is the chosen one and
 * whether it is a destructive action, which is written in red. A `disabled` row does not react to
 * touch and is dimmed; its `badge` ends the row and says why.
 */
export type SheetOptionProps = {
    label: string;
    onPress: () => void;
    icon?: ReactNode;
    selected?: boolean;
    destructive?: boolean;
    disabled?: boolean;
    badge?: string;
};

/**
 * One row of a BottomSheet list, at least 48 dp tall. The chosen row is bold and ends with a
 * check. A long label wraps and the badge keeps its size, vertically centered at the end.
 */
export function SheetOption({
    label,
    onPress,
    icon,
    selected = false,
    destructive = false,
    disabled = false,
    badge,
}: SheetOptionProps) {
    return (
        <Pressable
            accessibilityRole="menuitem"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [
                styles.option,
                disabled && styles.optionDisabled,
                pressed && styles.pressed,
            ]}
        >
            <View style={styles.optionLabel}>
                {icon}
                <Text
                    style={[
                        styles.optionText,
                        selected && styles.optionSelected,
                        destructive && styles.optionDestructive,
                    ]}
                >
                    {label}
                </Text>
            </View>
            {badge && (
                <View style={styles.optionBadge}>
                    <Badge label={badge} variant="secondary" />
                </View>
            )}
            {selected && <Check color={colors.foreground} size={20} />}
        </Pressable>
    );
}

/** Styles of BottomSheet and SheetOption. */
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        maxHeight: '70%',
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        backgroundColor: colors.card,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xl,
    },
    grab: {
        width: 32,
        height: 4,
        alignSelf: 'center',
        marginBottom: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.border,
    },
    title: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        lineHeight: 24,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    option: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    pressed: {
        backgroundColor: colors.muted,
    },
    optionDisabled: {
        opacity: 0.6,
    },
    optionLabel: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    optionBadge: {
        flexShrink: 0,
    },
    optionText: {
        flexShrink: 1,
        color: colors.foreground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.base,
    },
    optionSelected: {
        fontFamily: fontFamily.semibold,
    },
    optionDestructive: {
        color: colors.destructive,
    },
});
