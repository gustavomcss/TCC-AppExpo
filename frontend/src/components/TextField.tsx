import { StyleSheet, View } from 'react-native';

import { spacing } from '../theme';
import { FieldError } from './FieldError';
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
            <FieldError message={error} />
        </View>
    );
}

/** Styles of TextField. */
const styles = StyleSheet.create({
    field: {
        gap: spacing.sm,
    },
});
