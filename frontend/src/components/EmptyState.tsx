import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, spacing } from '../theme';
import { Button } from './Button';

/** Props of EmptyState. The action button only shows when both its title and handler are given. */
export type EmptyStateProps = {
    title: string;
    description?: string;
    actionTitle?: string;
    onAction?: () => void;
};

/** Centered notice for a list with nothing to show, optionally with the action that fills it. */
export function EmptyState({ title, description, actionTitle, onAction }: EmptyStateProps) {
    return (
        <View style={styles.state}>
            <Text accessibilityRole="header" style={styles.title}>
                {title}
            </Text>
            {description && <Text style={styles.description}>{description}</Text>}
            {actionTitle && onAction && (
                <Button variant="outline" title={actionTitle} onPress={onAction} />
            )}
        </View>
    );
}

/** Styles of EmptyState. */
const styles = StyleSheet.create({
    state: {
        flex: 1,
        alignItems: 'stretch',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.xl,
    },
    title: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        textAlign: 'center',
    },
    description: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        textAlign: 'center',
    },
});
