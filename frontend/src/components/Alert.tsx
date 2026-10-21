import { StyleSheet, Text, View } from 'react-native';
import type { ViewProps } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/**
 * Props of Alert. The destructive variant is red and for errors, success is green, warning is
 * blue, and the default one is neutral and for information.
 */
export type AlertProps = ViewProps & {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success' | 'warning';
};

/** Border and text color of the colored variants. */
const tones = {
    destructive: colors.destructive,
    success: colors.success,
    warning: colors.warning,
} as const;

/** Inline notice with a title and an optional description, announced to screen readers. */
export function Alert({ title, description, variant = 'default', style, ...props }: AlertProps) {
    const tone = variant === 'default' ? undefined : { color: tones[variant] };

    return (
        <View
            accessibilityRole="alert"
            style={[styles.alert, tone && { borderColor: tone.color }, style]}
            {...props}
        >
            <Text style={[styles.title, tone]}>{title}</Text>
            {description && <Text style={[styles.description, tone]}>{description}</Text>}
        </View>
    );
}

/** Styles of Alert. */
const styles = StyleSheet.create({
    alert: {
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        backgroundColor: colors.card,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    title: {
        color: colors.foreground,
        fontSize: fontSize.sm,
        fontFamily: fontFamily.medium,
        textAlign: 'center',
    },
    description: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        textAlign: 'center',
    },
});
