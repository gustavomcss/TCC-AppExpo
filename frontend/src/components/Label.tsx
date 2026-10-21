import { StyleSheet, Text } from 'react-native';
import type { TextProps } from 'react-native';

import { colors, fontFamily, fontSize } from '../theme';

/** Label of a form field. */
export function Label({ style, ...props }: TextProps) {
    return <Text style={[styles.label, style]} {...props} />;
}

/** Styles of Label. */
const styles = StyleSheet.create({
    label: {
        color: colors.foreground,
        fontSize: fontSize.sm,
        fontFamily: fontFamily.medium,
    },
});
