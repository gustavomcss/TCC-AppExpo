import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, palette, sizes } from '../theme';

/**
 * Props of Avatar: the name its initials come from, the diameter (64 dp by default) and the
 * address of the photo, when the person has one.
 */
export type AvatarProps = { name: string; size?: number; uri?: string | null };

/** Up to two initials of a name, in capitals. */
function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

/** Round photo of a person or, where there is none, a gray circle with their initials. */
export function Avatar({ name, size = sizes.avatar, uri }: AvatarProps) {
    const shape = { width: size, height: size, borderRadius: size / 2 };

    if (uri) {
        return <Image accessibilityLabel={name} source={{ uri }} style={[styles.photo, shape]} />;
    }

    return (
        <View accessibilityLabel={name} style={[styles.avatar, shape]}>
            <Text style={[styles.text, size < sizes.avatar && styles.small]}>{initials(name)}</Text>
        </View>
    );
}

/** Styles of Avatar. */
const styles = StyleSheet.create({
    avatar: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.secondary,
    },
    photo: {
        backgroundColor: colors.secondary,
    },
    text: {
        color: palette.g40,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.xl,
    },
    small: {
        fontSize: fontSize.base,
    },
});
