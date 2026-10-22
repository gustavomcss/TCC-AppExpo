import { StyleSheet, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

/**
 * Bar fixed at the bottom of a form screen that holds its main action, full width, in the place
 * the tab bar takes on the tab screens. It keeps clear of the bottom safe area.
 */
export function ActionBar({ style, ...props }: ViewProps) {
    const { bottom } = useSafeAreaInsets();

    return <View style={[styles.bar, { paddingBottom: bottom + spacing.md }, style]} {...props} />;
}

/** Styles of ActionBar. */
const styles = StyleSheet.create({
    bar: {
        gap: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
        paddingTop: spacing.md,
        paddingHorizontal: spacing.lg,
    },
});
