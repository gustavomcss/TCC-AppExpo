import { useState } from 'react';
import {
    Animated,
    Easing,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';
import { FieldError } from './FieldError';
import { Label } from './Label';

/** One choice of a Select: the `value` the form stores and the `label` the user reads. */
export type SelectOption<T extends string> = { value: T; label: string };

/** How long the sheet takes to slide in and out, in milliseconds. */
const SLIDE_IN = 350;
const SLIDE_OUT = 280;

/** Props of Select. The list is closed until the field is pressed. */
export type SelectProps<T extends string> = {
    label: string;
    options: readonly SelectOption<T>[];
    value?: T;
    onChange: (value: T) => void;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
};

/**
 * Form field for choosing one option from a short list: label, a field that looks like an Input
 * and, when there is one, the validation error under it. Pressing it opens the options in a
 * bottom sheet, which also works for lists too long to show inline. The sheet slides up and
 * the dark backdrop fades on its own: the Modal's own slide animation would carry the backdrop
 * along with the sheet, like a pane of dark glass. The slide decelerates as it arrives and
 * accelerates as it leaves, which is what makes it look smooth.
 */
export function Select<T extends string>({
    label,
    options,
    value,
    onChange,
    placeholder = 'Selecione',
    error,
    disabled = false,
}: SelectProps<T>) {
    const [open, setOpen] = useState(false);
    const [progress] = useState(() => new Animated.Value(0));
    const { height } = useWindowDimensions();
    const selected = options.find((option) => option.value === value);

    /* The Modal stays mounted until the slide-out ends. Starting either animation stops the other. */
    const show = () => {
        setOpen(true);
        Animated.timing(progress, {
            toValue: 1,
            duration: SLIDE_IN,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    };
    const hide = () => {
        Animated.timing(progress, {
            toValue: 0,
            duration: SLIDE_OUT,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setOpen(false);
            }
        });
    };
    const choose = (next: T) => {
        onChange(next);
        hide();
    };

    return (
        <View style={styles.field}>
            <Label>{label}</Label>
            <Pressable
                accessibilityRole="combobox"
                accessibilityLabel={label}
                accessibilityState={{ disabled, expanded: open }}
                disabled={disabled}
                onPress={show}
                style={[
                    styles.trigger,
                    Boolean(error) && styles.invalid,
                    disabled && styles.disabled,
                ]}
            >
                <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
                    {selected?.label ?? placeholder}
                </Text>
                <Text style={styles.chevron}>▾</Text>
            </Pressable>
            <FieldError message={error} />

            <Modal visible={open} transparent animationType="none" onRequestClose={hide}>
                <View style={styles.overlay}>
                    <Animated.View style={[styles.backdrop, { opacity: progress }]}>
                        <Pressable
                            accessibilityLabel="Fechar"
                            style={StyleSheet.absoluteFill}
                            onPress={hide}
                        />
                    </Animated.View>
                    <Animated.View
                        style={[
                            styles.sheet,
                            {
                                transform: [
                                    {
                                        translateY: progress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [height, 0],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <Text accessibilityRole="header" style={styles.title}>
                            {label}
                        </Text>
                        <FlatList
                            data={options}
                            keyExtractor={(option) => option.value}
                            renderItem={({ item }) => (
                                <Pressable
                                    accessibilityRole="menuitem"
                                    accessibilityState={{ selected: item.value === value }}
                                    onPress={() => choose(item.value)}
                                    style={({ pressed }) => [
                                        styles.option,
                                        pressed && styles.pressed,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            item.value === value && styles.optionSelected,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {item.value === value && <Text style={styles.check}>✓</Text>}
                                </Pressable>
                            )}
                        />
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

/** Styles of Select. */
const styles = StyleSheet.create({
    field: {
        gap: spacing.sm,
    },
    trigger: {
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
    },
    invalid: {
        borderColor: colors.destructive,
    },
    disabled: {
        opacity: 0.5,
    },
    value: {
        flex: 1,
        color: colors.foreground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
    },
    placeholder: {
        color: colors.mutedForeground,
    },
    chevron: {
        color: colors.mutedForeground,
        fontSize: fontSize.sm,
    },
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sheet: {
        maxHeight: '60%',
        gap: spacing.sm,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        backgroundColor: colors.card,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    title: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    pressed: {
        backgroundColor: colors.muted,
    },
    optionText: {
        color: colors.foreground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.base,
    },
    optionSelected: {
        fontFamily: fontFamily.semibold,
    },
    check: {
        color: colors.foreground,
        fontSize: fontSize.base,
    },
});
