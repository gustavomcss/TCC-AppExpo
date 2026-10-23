import { ChevronDown } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius, sizes, spacing } from '../theme';
import { BottomSheet, SheetOption } from './BottomSheet';
import { FieldError } from './FieldError';
import { Label } from './Label';

/**
 * One choice of a Select: the `value` the form stores and the `label` the user reads. An `icon`
 * shows before the label in the sheet, for choices that a picture identifies, such as a vehicle type.
 */
export type SelectOption<T extends string> = { value: T; label: string; icon?: LucideIcon };

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
 * BottomSheet, which also works for lists too long to show inline.
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
    const selected = options.find((option) => option.value === value);

    const choose = (next: T) => {
        onChange(next);
        setOpen(false);
    };

    return (
        <View style={styles.field}>
            <Label>{label}</Label>
            <Pressable
                accessibilityRole="combobox"
                accessibilityLabel={label}
                accessibilityState={{ disabled, expanded: open }}
                disabled={disabled}
                onPress={() => setOpen(true)}
                style={[
                    styles.trigger,
                    Boolean(error) && styles.invalid,
                    disabled && styles.disabled,
                ]}
            >
                <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
                    {selected?.label ?? placeholder}
                </Text>
                <ChevronDown color={colors.mutedForeground} size={20} />
            </Pressable>
            <FieldError message={error} />

            <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
                <FlatList
                    data={options}
                    keyExtractor={(option) => option.value}
                    renderItem={({ item }) => (
                        <SheetOption
                            label={item.label}
                            icon={
                                item.icon && (
                                    <item.icon color={colors.foreground} size={sizes.icon} />
                                )
                            }
                            selected={item.value === value}
                            onPress={() => choose(item.value)}
                        />
                    )}
                />
            </BottomSheet>
        </View>
    );
}

/** Styles of Select. */
const styles = StyleSheet.create({
    field: {
        gap: spacing.sm,
    },
    trigger: {
        height: sizes.control,
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
        fontSize: fontSize.base,
    },
    placeholder: {
        color: colors.mutedForeground,
    },
});
