import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { ViewProps } from 'react-native';

import { colors, fontFamily, fontSize, palette, radius, spacing } from '../theme';

/**
 * Props of Alert. The destructive variant is red and for errors, success is green, warning is
 * blue, and the default one is neutral and for information.
 */
export type AlertProps = ViewProps & {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success' | 'warning';
};

/** Border, icon and title color of the colored variants. */
const tones = {
    destructive: colors.destructive,
    success: colors.success,
    warning: colors.warning,
} as const;

/** Icon of each variant. */
const icons = {
    default: Info,
    destructive: CircleAlert,
    success: CircleCheck,
    warning: Info,
} as const;

/**
 * Inline notice with an icon, a title and an optional description, announced to screen readers.
 * Only the border, the icon and the title take the color of the variant; the description stays
 * dark gray.
 */
export function Alert({ title, description, variant = 'default', style, ...props }: AlertProps) {
    const tone = variant === 'default' ? undefined : tones[variant];
    const Icon = icons[variant];

    return (
        <View
            accessibilityRole="alert"
            style={[styles.alert, tone && { borderColor: tone }, style]}
            {...props}
        >
            <View style={styles.icon}>
                <Icon color={tone ?? colors.foreground} size={16} />
            </View>
            <View style={styles.texts}>
                <Text style={[styles.title, tone && { color: tone }]}>{title}</Text>
                {description && <Text style={styles.description}>{description}</Text>}
            </View>
        </View>
    );
}

/** Styles of Alert. */
const styles = StyleSheet.create({
    alert: {
        flexDirection: 'row',
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        backgroundColor: colors.card,
        padding: spacing.md,
    },
    icon: {
        height: 20,
        justifyContent: 'center',
    },
    texts: {
        flex: 1,
        gap: spacing.xs,
    },
    title: {
        color: colors.foreground,
        fontSize: fontSize.sm,
        lineHeight: 20,
        fontFamily: fontFamily.semibold,
    },
    description: {
        color: palette.g40,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
});
