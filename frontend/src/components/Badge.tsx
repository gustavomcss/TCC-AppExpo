import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, palette, radius, spacing } from '../theme';

/** Visual variants of Badge, named after the ShadCN ones, plus one for each notice color. */
export type BadgeVariant =
    'default' | 'secondary' | 'outline' | 'success' | 'destructive' | 'warning';

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
    outline: { background: colors.background, border: colors.border, text: palette.g40 },
    success: { background: colors.success, border: colors.success, text: palette.white },
    destructive: {
        background: colors.destructive,
        border: colors.destructive,
        text: colors.destructiveForeground,
    },
    warning: { background: colors.warning, border: colors.warning, text: palette.white },
} as const;

/** Small 24 dp pill that labels a status or a role. */
export function Badge({ label, variant = 'default' }: BadgeProps) {
    const tone = variants[variant];

    return (
        <View
            style={[styles.badge, { backgroundColor: tone.background, borderColor: tone.border }]}
        >
            <Text style={[styles.text, { color: tone.text }]}>{label}</Text>
        </View>
    );
}

/** Styles of Badge. */
const styles = StyleSheet.create({
    badge: {
        alignSelf: 'flex-start',
        height: 24,
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
    },
    text: {
        fontSize: fontSize.xs,
        lineHeight: 16,
        fontFamily: fontFamily.semibold,
    },
});
