import { StyleSheet, TextInput } from 'react-native';
import type { TextInputProps } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/** Props of Input. `invalid` paints the border with the error color. */
export type InputProps = TextInputProps & { invalid?: boolean };

/** Single-line text input with the app border and radius. */
export function Input({ invalid, editable = true, style, ...props }: InputProps) {
    return (
        <TextInput
            style={[styles.input, invalid && styles.invalid, !editable && styles.disabled, style]}
            placeholderTextColor={colors.mutedForeground}
            editable={editable}
            {...props}
        />
    );
}

/** Styles of Input. */
const styles = StyleSheet.create({
    input: {
        height: 40,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.background,
        color: colors.foreground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        paddingHorizontal: spacing.md,
    },
    invalid: {
        borderColor: colors.destructive,
    },
    disabled: {
        opacity: 0.5,
    },
});
