import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { colors, fontFamily, fontSize, radius, sizes, spacing } from '../theme';

/**
 * Props of Input. `invalid` paints the border with the error color, and `suffix` is a short text
 * drawn inside the box, on the right, such as the unit of the value ("km").
 */
export type InputProps = TextInputProps & { invalid?: boolean; suffix?: string };

/**
 * Single-line text input with the app border and radius, 44 dp tall. The border darkens while it
 * has focus, a field with `secureTextEntry` gets a button to show or hide what is typed, and a
 * `suffix` shows the unit of the value beside what is typed.
 */
export function Input({
    invalid,
    editable = true,
    secureTextEntry,
    suffix,
    style,
    onFocus,
    onBlur,
    ...props
}: InputProps) {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(true);
    const isPassword = Boolean(secureTextEntry);

    return (
        <View
            style={[
                styles.box,
                focused && styles.focused,
                invalid && styles.invalid,
                !editable && styles.disabled,
                style,
            ]}
        >
            <TextInput
                style={[styles.input, !editable && styles.inputDisabled]}
                placeholderTextColor={colors.mutedForeground}
                editable={editable}
                secureTextEntry={isPassword && hidden}
                onFocus={(event) => {
                    setFocused(true);
                    onFocus?.(event);
                }}
                onBlur={(event) => {
                    setFocused(false);
                    onBlur?.(event);
                }}
                {...props}
            />
            {suffix && <Text style={styles.suffix}>{suffix}</Text>}
            {isPassword && (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
                    disabled={!editable}
                    onPress={() => setHidden((previous) => !previous)}
                    style={styles.toggle}
                >
                    {hidden ? (
                        <Eye color={colors.mutedForeground} size={20} />
                    ) : (
                        <EyeOff color={colors.mutedForeground} size={20} />
                    )}
                </Pressable>
            )}
        </View>
    );
}

/** Styles of Input. */
const styles = StyleSheet.create({
    box: {
        height: sizes.control,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
    },
    focused: {
        borderColor: colors.primary,
    },
    invalid: {
        borderColor: colors.destructive,
    },
    disabled: {
        backgroundColor: colors.secondary,
    },
    input: {
        flex: 1,
        height: '100%',
        paddingVertical: 0,
        color: colors.foreground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.base,
    },
    inputDisabled: {
        color: colors.mutedForeground,
    },
    suffix: {
        marginLeft: spacing.sm,
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
    },
    toggle: {
        width: sizes.control,
        height: '100%',
        marginRight: -spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
