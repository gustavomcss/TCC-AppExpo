import { Camera } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius, sizes, spacing } from '../theme';
import { Button } from './Button';
import { FieldError } from './FieldError';
import { Label } from './Label';
import { PhotoPreview } from './PhotoPreview';
import type { PhotoPreviewValue } from './PhotoPreview';

/** Props of PhotoField: its label, the chosen picture, the error, and what to do to add or edit it. */
export type PhotoFieldProps = {
    label: string;
    value?: PhotoPreviewValue;
    error?: string;
    /** Opens the sheet of the caller: the choice of source, plus removal when there is a picture. */
    onPress: () => void;
    disabled?: boolean;
};

/**
 * Form field for a picture, as in the prototype: a 112 dp box that invites the user to add a
 * photo and, once there is one, the PhotoPreview of it with, on a line of its own under it, one
 * "Alterar foto" button. Like the profile
 * photo, changing and removing are options of the sheet that button opens. The field only shows
 * the choice; asking for the camera or the gallery is up to the caller. An error paints the
 * border and is written under the field.
 */
export function PhotoField({ label, value, error, onPress, disabled }: PhotoFieldProps) {
    const invalid = Boolean(error);

    return (
        <View style={styles.field}>
            <Label>{label}</Label>
            {value ? (
                <PhotoPreview value={value} invalid={invalid}>
                    <Button
                        variant="secondary"
                        title="Alterar foto"
                        onPress={onPress}
                        disabled={disabled}
                    />
                </PhotoPreview>
            ) : (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${label}: adicionar foto`}
                    disabled={disabled}
                    onPress={onPress}
                    style={({ pressed }) => [
                        styles.box,
                        styles.boxEmpty,
                        invalid && styles.boxInvalid,
                        pressed && styles.pressed,
                    ]}
                >
                    <Camera color={colors.mutedForeground} size={sizes.icon} />
                    <Text style={styles.emptyTitle}>Adicionar foto</Text>
                    <Text style={styles.hint}>Câmera ou galeria</Text>
                </Pressable>
            )}
            <FieldError message={error} />
        </View>
    );
}

/** Styles of PhotoField. */
const styles = StyleSheet.create({
    field: {
        gap: spacing.sm,
    },
    box: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.background,
    },
    boxEmpty: {
        height: 112,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    boxInvalid: {
        borderColor: colors.destructive,
    },
    pressed: {
        opacity: 0.85,
    },
    hint: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.xs,
        lineHeight: 16,
    },
    emptyTitle: {
        color: colors.foreground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
});
