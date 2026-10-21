import { StyleSheet, Text, View } from 'react-native';
import type { ViewProps } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/** Props of Alert. The destructive variant is for errors; the default one is for information. */
export type AlertProps = ViewProps & {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
};

/** Inline notice with a title and an optional description, announced to screen readers. */
export function Alert({ title, description, variant = 'default', style, ...props }: AlertProps) {
    const destructive = variant === 'destructive';

    return (
        <View
            accessibilityRole="alert"
            style={[styles.alert, destructive && styles.alertDestructive, style]}
            {...props}
        >
            <Text style={[styles.title, destructive && styles.textDestructive]}>{title}</Text>
            {description && (
                <Text style={[styles.description, destructive && styles.textDestructive]}>
                    {description}
                </Text>
            )}
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
    alertDestructive: {
        borderColor: colors.destructive,
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
    textDestructive: {
        color: colors.destructive,
    },
});
