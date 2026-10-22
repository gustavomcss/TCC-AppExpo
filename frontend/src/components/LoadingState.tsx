import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, spacing } from '../theme';

/** Props of LoadingState. */
export type LoadingStateProps = { message?: string };

/** Centered spinner, with an optional line of text, for a screen or a list that is loading. */
export function LoadingState({ message }: LoadingStateProps) {
    return (
        <View accessibilityRole="progressbar" accessibilityLabel="Carregando" style={styles.state}>
            <ActivityIndicator size="large" color={colors.primary} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
}

/** Styles of LoadingState. */
const styles = StyleSheet.create({
    state: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        padding: spacing.xl,
    },
    message: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        textAlign: 'center',
    },
});
