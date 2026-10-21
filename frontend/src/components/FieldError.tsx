import { StyleSheet, Text } from 'react-native';

import { colors, fontFamily, fontSize } from '../theme';

/** Validation error shown under a form field. Renders nothing when there is no message. */
export function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <Text accessibilityRole="alert" style={styles.error}>
            {message}
        </Text>
    );
}

/** Styles of FieldError. */
const styles = StyleSheet.create({
    error: {
        color: colors.destructive,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
    },
});
