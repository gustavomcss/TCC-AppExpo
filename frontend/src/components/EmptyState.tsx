import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius, sizes, spacing } from '../theme';
import { Button } from './Button';

/** Props of EmptyState. The action button only shows when both its title and handler are given. */
export type EmptyStateProps = {
    title: string;
    description?: string;
    icon?: LucideIcon;
    actionTitle?: string;
    onAction?: () => void;
};

/**
 * Centered notice for a list with nothing to show: an icon in a ring, a title, a short text and,
 * optionally, the action that fills the list.
 */
export function EmptyState({
    title,
    description,
    icon: Icon,
    actionTitle,
    onAction,
}: EmptyStateProps) {
    return (
        <View style={styles.state}>
            {Icon && (
                <View style={styles.ring}>
                    <Icon color={colors.mutedForeground} size={sizes.icon} />
                </View>
            )}
            <Text accessibilityRole="header" style={styles.title}>
                {title}
            </Text>
            {description && <Text style={styles.description}>{description}</Text>}
            {actionTitle && onAction && (
                <View style={styles.action}>
                    <Button variant="outline" title={actionTitle} onPress={onAction} />
                </View>
            )}
        </View>
    );
}

/** Styles of EmptyState. */
const styles = StyleSheet.create({
    state: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        padding: spacing.xl,
    },
    ring: {
        width: sizes.avatar,
        height: sizes.avatar,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.full,
        backgroundColor: colors.background,
    },
    title: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        textAlign: 'center',
    },
    description: {
        maxWidth: 280,
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
        textAlign: 'center',
    },
    action: {
        width: '100%',
        maxWidth: 240,
        paddingTop: spacing.xs,
    },
});
