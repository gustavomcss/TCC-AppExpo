import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, spacing } from '../theme';
import { Input } from './Input';
import type { InputProps } from './Input';
import { Label } from './Label';

/** Props of TextField: the input props plus its label and the validation error to show below it. */
export type TextFieldProps = Omit<InputProps, 'invalid'> & {
    label: string;
    error?: string;
};

/** Form field: label, input and, when there is one, the validation error under it (RNF08). */
export function TextField({ label, error, ...props }: TextFieldProps) {
    return (
        <View style={styles.field}>
            <Label>{label}</Label>
            <Input invalid={Boolean(error)} accessibilityLabel={label} {...props} />
            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

/** Styles of TextField. */
const styles = StyleSheet.create({
    field: {
        gap: spacing.sm,
    },
    error: {
        color: colors.destructive,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
    },
});
