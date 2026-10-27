import { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBottomBar } from '../contexts/ToastContext';
import { colors, spacing } from '../theme';

/** Whether the on-screen keyboard is open. */
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
 * the tab bar takes on the tab screens. It stays where it is when the keyboard opens: on iOS the
 * keyboard covers it (the form area above shrinks, see FormScrollView), so the action is not in
 * reach while typing and cannot be tapped by accident. On Android the window itself shrinks, which
 * would lift the bar above the keyboard, so there it is hidden while the keyboard is open. It
 * tells the toasts how tall it is, so they come out from behind it.
 */
export function ActionBar({ style, onLayout, ...props }: ViewProps) {
    const { bottom } = useSafeAreaInsets();
    const keyboardVisible = useKeyboardVisible();
    const [height, setHeight] = useState<number | null>(null);
    useBottomBar(height);

    function handleLayout(event: LayoutChangeEvent) {
        setHeight(event.nativeEvent.layout.height);
        onLayout?.(event);
    }

    if (keyboardVisible && Platform.OS === 'android') {
        return null;
    }

    return (
        <View
            style={[styles.bar, { paddingBottom: bottom + spacing.md }, style]}
            onLayout={handleLayout}
            {...props}
        />
    );
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
