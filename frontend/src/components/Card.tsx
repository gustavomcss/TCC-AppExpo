import { StyleSheet, Text, View } from 'react-native';
import type { TextProps, ViewProps } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/** Bordered white surface that groups related content. */
export function Card({ style, ...props }: ViewProps) {
    return <View style={[styles.card, style]} {...props} />;
}

/** Top part of a Card, holding its title and description. */
export function CardHeader({ style, ...props }: ViewProps) {
    return <View style={[styles.header, style]} {...props} />;
}

/** Title of a Card. */
export function CardTitle({ style, ...props }: TextProps) {
    return <Text accessibilityRole="header" style={[styles.title, style]} {...props} />;
}

/** One line of secondary text under the title of a Card. */
export function CardDescription({ style, ...props }: TextProps) {
    return <Text style={[styles.description, style]} {...props} />;
}

/** Body of a Card. */
export function CardContent({ style, ...props }: ViewProps) {
    return <View style={[styles.content, style]} {...props} />;
}

/** Styles of the Card parts. */
const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.xl,
        padding: spacing.lg,
        gap: spacing.lg,
    },
    header: {
        gap: spacing.xs,
    },
    title: {
        color: colors.foreground,
        fontSize: fontSize.lg,
        fontFamily: fontFamily.semibold,
    },
    description: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
    },
    content: {
        gap: spacing.lg,
    },
});
