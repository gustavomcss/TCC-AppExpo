import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, spacing } from '../theme';

/** How long a collapsible fact takes to open or close, in milliseconds. */
const COLLAPSE_DURATION = 220;

/**
 * One label and value of a route summary, as in the prototype (the value at 16 dp). Laid out by a
 * wrapping row of the screen: two facts fit side by side, and `wide` takes the whole row.
 */
export function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
    return (
        <View style={[styles.fact, wide && styles.factWide]}>
            <Text style={styles.factLabel}>{label}</Text>
            <Text style={styles.factValue}>{value}</Text>
        </View>
    );
}

/**
 * Label with a chevron that opens and closes its text, closed at first. The text is always laid
 * out, in a box that is measured and kept out of the flow; what the card sees is a clipped box
 * whose height grows from 0 to the measured one, so the card follows the opening frame by frame
 * and nothing shows outside it. The text fades in and the chevron turns over the same progress.
 * When the text is empty it opens to `emptyText` in the muted color, so a missing observation
 * reads as "none" and not as something that failed to load. It always takes the whole row.
 */
export function CollapsibleFact({
    label,
    value,
    emptyText,
}: {
    label: string;
    value: string;
    emptyText: string;
}) {
    const [open, setOpen] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const [progress] = useState(() => new Animated.Value(0));

    function toggle() {
        Animated.timing(progress, {
            toValue: open ? 0 : 1,
            duration: COLLAPSE_DURATION,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
        }).start();
        setOpen(!open);
    }

    return (
        <View style={styles.factWide}>
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={toggle}
                hitSlop={spacing.sm}
                style={styles.collapsibleHeader}
            >
                <Text style={styles.factLabel}>{label}</Text>
                <Animated.View
                    style={{
                        transform: [
                            {
                                rotate: progress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '180deg'],
                                }),
                            },
                        ],
                    }}
                >
                    <ChevronDown color={colors.mutedForeground} size={20} />
                </Animated.View>
            </Pressable>

            <Animated.View
                style={[
                    styles.collapsibleBody,
                    {
                        height: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, contentHeight],
                        }),
                    },
                ]}
            >
                <Animated.View
                    onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}
                    style={[styles.collapsibleContent, { opacity: progress }]}
                >
                    <Text style={value ? styles.factValue : styles.factEmpty}>
                        {value || emptyText}
                    </Text>
                </Animated.View>
            </Animated.View>
        </View>
    );
}

/** Styles of the facts. */
const styles = StyleSheet.create({
    fact: {
        flexBasis: '45%',
        flexGrow: 1,
        gap: spacing.xs,
    },
    factWide: {
        flexBasis: '100%',
    },
    factLabel: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
    },
    collapsibleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    collapsibleBody: {
        overflow: 'hidden',
    },
    collapsibleContent: {
        position: 'absolute',
        left: 0,
        right: 0,
        paddingTop: spacing.xs,
    },
    factEmpty: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.base,
    },
    factValue: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
    },
});
