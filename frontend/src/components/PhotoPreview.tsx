import { Image, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/** What is shown about a picture: where it is, its file name and a line of detail (may be empty). */
export type PhotoPreviewValue = {
    uri: string;
    name: string;
    /** Second line under the name, such as "Câmera · 1,2 MB" or just "621 KB". */
    detail: string;
};

/** Props of PhotoPreview: the picture, whether to paint the border as invalid, and what goes under it. */
export type PhotoPreviewProps = {
    value: PhotoPreviewValue;
    invalid?: boolean;
    children?: ReactNode;
};

/**
 * Bordered box with the thumbnail of a picture (40% of the row) beside its file name and detail
 * (60%). Whatever is passed as children goes on a line of its own under them, inside the box,
 * such as the button that changes the picture. Used by the photo field of a form.
 */
export function PhotoPreview({ value, invalid, children }: PhotoPreviewProps) {
    return (
        <View style={[styles.box, invalid && styles.invalid]}>
            <View style={styles.row}>
                <Image source={{ uri: value.uri }} style={styles.thumb} />
                <View style={styles.texts}>
                    <Text numberOfLines={2} ellipsizeMode="middle" style={styles.name}>
                        {value.name}
                    </Text>
                    {value.detail !== '' && <Text style={styles.detail}>{value.detail}</Text>}
                </View>
            </View>
            {children}
        </View>
    );
}

/** Styles of PhotoPreview. */
const styles = StyleSheet.create({
    box: {
        gap: spacing.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.background,
    },
    invalid: {
        borderColor: colors.destructive,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    thumb: {
        flex: 4,
        aspectRatio: 4 / 3,
        borderRadius: radius.md,
        backgroundColor: colors.muted,
    },
    texts: {
        flex: 6,
        gap: spacing.xs,
    },
    name: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    detail: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.xs,
        lineHeight: 16,
    },
});
