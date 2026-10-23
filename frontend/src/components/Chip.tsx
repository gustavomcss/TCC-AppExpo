import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/** Props of Chip: its text, whether it is the option in use and what pressing it does. */
export type ChipProps = {
    label: string;
    selected: boolean;
    onPress: () => void;
};

/**
 * Pill that picks one option of a filter (RNF08). It is 36 dp tall and the touch area is extended
 * by 4 dp above and below, which gets it to the 44 dp minimum. The chip in use is filled dark and
 * is also announced as selected, so the color is not the only sign of it.
 */
export function Chip({ label, selected, onPress }: ChipProps) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={onPress}
            style={({ pressed }) => [
                styles.chip,
                selected && styles.selected,
                pressed && styles.pressed,
            ]}
        >
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        </Pressable>
    );
}

/** Styles of Chip. */
const styles = StyleSheet.create({
    chip: {
        height: 36,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.full,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.lg,
    },
    selected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    pressed: {
        opacity: 0.85,
    },
    label: {
        color: colors.foreground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    labelSelected: {
        color: colors.primaryForeground,
    },
});
