import { CircleAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius, sizes, spacing } from '../theme';
import { Button } from './Button';

/** Props of ErrorState. The retry button only shows when `onRetry` is given. */
export type ErrorStateProps = {
    message: string;
    onRetry?: () => void;
    title?: string;
};

/**
 * Centered notice for a screen or a list that failed to load, with the message already
 * translated from the server error (I-08) and a button to try again. Same layout as EmptyState,
 * with a red ring.
 */
export function ErrorState({
    message,
    onRetry,
    title = 'Não foi possível carregar',
}: ErrorStateProps) {
    return (
        <View accessibilityRole="alert" style={styles.state}>
            <View style={styles.ring}>
                <CircleAlert color={colors.destructive} size={sizes.icon} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            {onRetry && (
                <View style={styles.action}>
                    <Button variant="outline" title="Tentar novamente" onPress={onRetry} />
                </View>
            )}
        </View>
    );
}

/** Styles of ErrorState. */
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
        borderColor: colors.destructive,
        borderRadius: radius.full,
        backgroundColor: colors.background,
    },
    title: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        textAlign: 'center',
    },
    message: {
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
