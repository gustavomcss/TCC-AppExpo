import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { colors, fontFamily, fontSize, radius, sizes, spacing } from '../theme';

/**
 * Props of Input. `invalid` paints the border with the error color, `suffix` is a short text
 * drawn inside the box, on the right, such as the unit of the value ("km"), and `prefix` is the
 * same on the left, such as the currency ("R$"). `masked` is for values the app reformats on every
 * key, such as km and money: the native text is made invisible and the value is drawn over it,
 * with a caret of its own.
 */
export type InputProps = TextInputProps & {
    invalid?: boolean;
    suffix?: string;
    prefix?: string;
    masked?: boolean;
};

/**
 * Text input with the app border and radius, 44 dp tall. The border darkens while it has focus, a
 * field with `secureTextEntry` gets a button to show or hide what is typed, and a `prefix` or
 * `suffix` shows the currency or the unit beside what is typed. With `multiline` the box grows
 * from 88 dp for free text, such as an observation. A `masked` input keeps the keyboard and the
 * focus of the native field but shows the value through a Text: when the app rewrites the typed
 * text (adding the separators), the system replaces the native text and restarts its caret, which
 * then blinks again on every key. So the native text and caret are hidden, and the input draws its
 * own caret, steady and always after the last digit, where the next one goes.
 */
export function Input({
    invalid,
    editable = true,
    secureTextEntry,
    multiline,
    suffix,
    prefix,
    masked,
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
                masked && styles.inputInvisible,
            ]}
            multiline={multiline}
            placeholderTextColor={masked ? 'transparent' : colors.mutedForeground}
            editable={editable}
            secureTextEntry={isPassword && hidden}
            caretHidden={masked}
            contextMenuHidden={masked}
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
            {masked ? (
                <View style={styles.maskedBox}>
                    {field}
                    <View pointerEvents="none" style={styles.maskedOverlay}>
                        {focused && !props.value && <View style={styles.caret} />}
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.maskedText,
                                !props.value && styles.maskedPlaceholder,
                                !editable && styles.inputDisabled,
                            ]}
                        >
                            {props.value || props.placeholder}
                        </Text>
                        {focused && Boolean(props.value) && <View style={styles.caret} />}
                    </View>
                </View>
            ) : (
                field
            )}
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
    inputInvisible: {
        color: 'transparent',
    },
    maskedBox: {
        flex: 1,
        height: '100%',
    },
    maskedOverlay: {
        ...StyleSheet.absoluteFill,
        flexDirection: 'row',
        alignItems: 'center',
    },
    maskedPlaceholder: {
        color: colors.mutedForeground,
    },
    caret: {
        width: 2,
        height: fontSize.base + 4,
        marginHorizontal: 1,
        backgroundColor: colors.foreground,
    },
    maskedText: {
        color: colors.foreground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.base,
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
