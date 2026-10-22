import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, palette, sizes } from '../theme';

/** Props of Avatar: the name its initials come from, and the diameter (64 dp by default). */
export type AvatarProps = { name: string; size?: number };

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

/** Gray circle with the initials of a person, shown where there is no photo. */
export function Avatar({ name, size = sizes.avatar }: AvatarProps) {
    return (
        <View
            accessibilityLabel={name}
            style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        >
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
    text: {
        color: palette.g40,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.xl,
    },
    small: {
        fontSize: fontSize.base,
    },
});
