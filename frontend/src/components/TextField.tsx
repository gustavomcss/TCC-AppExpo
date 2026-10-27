import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, spacing } from '../theme';
import { FieldError } from './FieldError';
import { Input } from './Input';
import type { InputProps } from './Input';
import { Label } from './Label';

/**
 * Props of TextField: the input props plus its label and the validation error to show below it.
 * With `showCount` and a `maxLength`, the length typed so far is shown as "12/500" under the field.
 */
export type TextFieldProps = Omit<InputProps, 'invalid'> & {
    label: string;
    error?: string;
    showCount?: boolean;
};

/** Form field: label, input and, when there is one, the validation error under it (RNF08). */
export function TextField({ label, error, showCount, ...props }: TextFieldProps) {
    return (
        <View style={styles.field}>
            <Label>{label}</Label>
            <Input invalid={Boolean(error)} accessibilityLabel={label} {...props} />
            {showCount && props.maxLength ? (
                <View style={styles.footer}>
                    <View style={styles.footerError}>
                        <FieldError message={error} />
                    </View>
                    <Text style={styles.count}>
                        {props.value?.length ?? 0}/{props.maxLength}
                    </Text>
                </View>
            ) : (
                <FieldError message={error} />
            )}
        </View>
    );
}

/** Styles of TextField. */
const styles = StyleSheet.create({
    field: {
        gap: spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    footerError: {
        flex: 1,
    },
    count: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.xs,
    },
});
