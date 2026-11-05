import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { applyTextCase } from '../schemas/masks';
import type { TextCase } from '../schemas/masks';
import { colors, fontFamily, fontSize, radius, sizes, spacing } from '../theme';

/**
 * Props of Input. `invalid` paints the border with the error color, `suffix` is a short text
 * drawn inside the box, on the right, such as the unit of the value ("km"), and `prefix` is the
 * same on the left, such as the currency ("R$"). `capitalize` is the one way to capitalize a
 * free text: `words` (a name, a vehicle model) or `sentences` (an itinerary, a note, a
 * description); see TextCase.
 */
export type InputProps = TextInputProps & {
    invalid?: boolean;
    suffix?: string;
    prefix?: string;
    capitalize?: TextCase;
};

/**
 * Text input with the app border and radius, 44 dp tall. The border darkens while it has focus, a
 * field with `secureTextEntry` gets a button to show or hide what is typed, and a `prefix` or
 * `suffix` shows the currency or the unit beside what is typed. With `multiline` the box grows
 * from 88 dp for free text, such as an observation. The caret is the native one, even in the
 * fields the app reformats on every key (km and money): a caret drawn by the input shifted the
 * text sideways as it moved. With `capitalize`, the keyboard is asked to capitalize while typing
 * and the text is capitalized when the field loses focus; it is not rewritten on every key, which
 * duplicated the letter being typed ("Mm") while the keyboard composed it.
 */
export function Input({
    invalid,
    editable = true,
    secureTextEntry,
    multiline,
    suffix,
    prefix,
    capitalize,
    style,
    onFocus,
    onBlur,
    ...props
}: InputProps) {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(true);
    const isPassword = Boolean(secureTextEntry);

    const field = (
        <TextInput
            style={[
                styles.input,
                multiline && styles.inputMultiline,
                !editable && styles.inputDisabled,
            ]}
            multiline={multiline}
            placeholderTextColor={colors.mutedForeground}
            editable={editable}
            secureTextEntry={isPassword && hidden}
            onFocus={(event) => {
                setFocused(true);
                onFocus?.(event);
            }}
            autoCapitalize={capitalize}
            autoCorrect={capitalize === 'words' ? false : undefined}
            onBlur={(event) => {
                setFocused(false);
                if (capitalize && props.value !== undefined && props.onChangeText) {
                    const text = applyTextCase(capitalize, props.value);

                    if (text !== props.value) {
                        props.onChangeText(text);
                    }
                }
                onBlur?.(event);
            }}
            {...props}
        />
    );

    return (
        <View
            style={[
                styles.box,
                multiline && styles.boxMultiline,
                focused && styles.focused,
                invalid && styles.invalid,
                !editable && styles.disabled,
                style,
            ]}
        >
            {prefix && <Text style={styles.prefix}>{prefix}</Text>}
            {field}
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
    boxMultiline: {
        height: undefined,
        minHeight: sizes.multilineControl,
        alignItems: 'flex-start',
        paddingVertical: spacing.md,
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
    inputMultiline: {
        height: undefined,
        minHeight: sizes.multilineControl - 2 * spacing.md - 2,
        textAlignVertical: 'top',
    },
    inputDisabled: {
        color: colors.mutedForeground,
    },
    prefix: {
        marginRight: spacing.sm,
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
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
