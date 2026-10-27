import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, fontSize, sizes, spacing } from '../theme';

/** Height of the header below the status bar, in dp, and width of the slot on each side of the title. */
const HEADER_HEIGHT = 48;
const SLOT_WIDTH = 56;

/**
 * Header of the stack screens: the title centered in text and, when there is a screen to go back
 * to, a back arrow whose left edge sits at the same distance from the screen edge as the content
 * (`spacing.lg`). The native header placed the arrow by the system's own inset, which differs
 * from the 16 dp padding of the screens.
 */
export function StackHeader({ navigation, options, route, back }: NativeStackHeaderProps) {
    const { top } = useSafeAreaInsets();
    const title = options.title ?? route.name;

    return (
        <View style={[styles.header, { paddingTop: top }]}>
            <View style={styles.row}>
                <View style={styles.slot}>
                    {back ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Voltar"
                            onPress={navigation.goBack}
                            hitSlop={spacing.sm}
                            style={styles.back}
                        >
                            <ChevronLeft color={colors.foreground} size={sizes.icon} />
                        </Pressable>
                    ) : null}
                </View>
                <Text numberOfLines={1} style={styles.title}>
                    {title}
                </Text>
                <View style={styles.slot} />
            </View>
        </View>
    );
}

/** Styles of the stack header: white with a bottom border, like the tab headers. */
const styles = StyleSheet.create({
    header: {
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    row: {
        height: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
    },
    slot: {
        width: SLOT_WIDTH,
        height: '100%',
    },
    back: {
        flex: 1,
        justifyContent: 'center',
        paddingLeft: spacing.lg,
    },
    title: {
        flex: 1,
        textAlign: 'center',
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
    },
});
