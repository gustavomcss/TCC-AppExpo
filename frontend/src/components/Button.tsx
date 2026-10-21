import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/** Visual variants of Button, named after the ShadCN ones. */
export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';

/** Props of Button. `loading` shows a spinner and blocks presses. */
export type ButtonProps = Omit<PressableProps, 'children'> & {
    title: string;
    variant?: ButtonVariant;
    loading?: boolean;
};

/** Background, border and text color of each variant. */
const variants = {
    default: { background: colors.primary, border: colors.primary, text: colors.primaryForeground },
    secondary: {
        background: colors.secondary,
        border: colors.secondary,
        text: colors.secondaryForeground,
    },
    outline: { background: colors.background, border: colors.border, text: colors.foreground },
    destructive: {
        background: colors.destructive,
        border: colors.destructive,
        text: colors.destructiveForeground,
    },
    ghost: { background: 'transparent', border: 'transparent', text: colors.foreground },
} as const;

/** Full-width button. While `loading` or `disabled` it ignores presses. */
export function Button({
    title,
    variant = 'default',
    loading = false,
    disabled,
    style,
    ...props
}: ButtonProps) {
    const inactive = loading || disabled;
    const palette = variants[variant];

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: Boolean(inactive), busy: loading }}
            disabled={inactive}
            style={(state) => [
                styles.button,
                { backgroundColor: palette.background, borderColor: palette.border },
                state.pressed && styles.pressed,
                inactive && styles.inactive,
                typeof style === 'function' ? style(state) : style,
            ]}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={palette.text} />
            ) : (
                <Text style={[styles.text, { color: palette.text }]}>{title}</Text>
            )}
        </Pressable>
    );
}

/** Styles of Button. */
const styles = StyleSheet.create({
    button: {
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
    },
    text: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.medium,
    },
    pressed: {
        opacity: 0.85,
    },
    inactive: {
        opacity: 0.5,
    },
});
