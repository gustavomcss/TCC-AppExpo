import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { colors, fontFamily, fontSize, radius, sizes, spacing } from '../theme';

/** Props of Input. `invalid` paints the border with the error color. */
export type InputProps = TextInputProps & { invalid?: boolean };

/**
 * Single-line text input with the app border and radius, 44 dp tall. The border darkens while it
 * has focus, and a field with `secureTextEntry` gets a button to show or hide what is typed.
 */
export function Input({
    invalid,
    editable = true,
    secureTextEntry,
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
    toggle: {
        width: sizes.control,
        height: '100%',
        marginRight: -spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
