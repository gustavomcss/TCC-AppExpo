import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import type { ScrollViewProps } from 'react-native';

/**
 * Scrollable body of a form screen that keeps clear of the keyboard: on iOS only this area shrinks
 * above the keyboard, so the ActionBar below it stays where it is and the keyboard covers it. The
 * main action is not reachable while typing, which also rules out a stray tap on it. Taps on
 * buttons inside still work with the keyboard open.
 */
export function FormScrollView(props: ScrollViewProps) {
    return (
        <KeyboardAvoidingView
            style={styles.area}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView keyboardShouldPersistTaps="handled" {...props} />
        </KeyboardAvoidingView>
    );
}

/** Styles of FormScrollView. */
const styles = StyleSheet.create({
    area: {
        flex: 1,
    },
});
