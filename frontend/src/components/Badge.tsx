import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/** Visual variants of Badge, named after the ShadCN ones. */
export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

/** Props of Badge. */
export type BadgeProps = {
    label: string;
    variant?: BadgeVariant;
};

/** Background, border and text color of each variant. */
const variants = {
    default: { background: colors.primary, border: colors.primary, text: colors.primaryForeground },
    secondary: {
        background: colors.secondary,
        border: colors.secondary,
        text: colors.secondaryForeground,
    },
    outline: { background: 'transparent', border: colors.border, text: colors.foreground },
    destructive: {
        background: colors.destructive,
        border: colors.destructive,
        text: colors.destructiveForeground,
    },
} as const;

/** Small pill that labels a status or a role. */
export function Badge({ label, variant = 'default' }: BadgeProps) {
    const palette = variants[variant];

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: palette.background, borderColor: palette.border },
            ]}
        >
            <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
        </View>
    );
}

/** Styles of Badge. */
const styles = StyleSheet.create({
    badge: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    text: {
        fontSize: fontSize.xs,
        fontFamily: fontFamily.medium,
    },
});
