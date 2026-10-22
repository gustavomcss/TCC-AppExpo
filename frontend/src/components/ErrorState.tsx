import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, spacing } from '../theme';
import { Button } from './Button';

/** Props of ErrorState. The retry button only shows when `onRetry` is given. */
export type ErrorStateProps = {
    message: string;
    onRetry?: () => void;
    title?: string;
};

/**
 * Centered notice for a screen or a list that failed to load, with the message already
 * translated from the server error (I-08) and a button to try again.
 */
export function ErrorState({ message, onRetry, title = 'Algo deu errado' }: ErrorStateProps) {
    return (
        <View accessibilityRole="alert" style={styles.state}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            {onRetry && <Button variant="outline" title="Tentar novamente" onPress={onRetry} />}
        </View>
    );
}

/** Styles of ErrorState. */
const styles = StyleSheet.create({
    state: {
        flex: 1,
        alignItems: 'stretch',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.xl,
    },
    title: {
        color: colors.destructive,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        textAlign: 'center',
    },
    message: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        textAlign: 'center',
    },
});
