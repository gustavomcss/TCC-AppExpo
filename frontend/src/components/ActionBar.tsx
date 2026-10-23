import { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

/**
 * Whether the on-screen keyboard is open. iOS announces it before the animation starts, so the
 * bar can change in step with the keyboard; Android only has the event after it shows.
 */
function useKeyboardVisible(): boolean {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const ios = Platform.OS === 'ios';
        const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () =>
            setVisible(true),
        );
        const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
            setVisible(false),
        );

        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    return visible;
}

/**
 * Bar fixed at the bottom of a form screen that holds its main action, full width, in the place
 * the tab bar takes on the tab screens. It keeps clear of the bottom safe area, except while the
 * keyboard is open: the keyboard already covers that area, and keeping the padding would leave a
 * white strip between the bar and the keyboard.
 */
export function ActionBar({ style, ...props }: ViewProps) {
    const { bottom } = useSafeAreaInsets();
    const keyboardVisible = useKeyboardVisible();
    const paddingBottom = (keyboardVisible ? 0 : bottom) + spacing.md;

    return <View style={[styles.bar, { paddingBottom }, style]} {...props} />;
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
