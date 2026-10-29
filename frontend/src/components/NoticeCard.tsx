import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';
import type { ViewProps } from 'react-native';

import { colors, fontFamily, fontSize, palette, sizes, spacing } from '../theme';
import { Card } from './Card';

/**
 * Props of NoticeCard: a title and the sentence that explains it. The variant is the tone of the
 * notice: blue for information (the default), green for success and red for an error.
 */
export type NoticeCardProps = ViewProps & {
    title: string;
    message: string;
    variant?: 'warning' | 'success' | 'destructive';
};

/** Color of the icon and of the border, and the icon, of each variant. */
const tones = {
    warning: { color: colors.warning, Icon: Info },
    success: { color: colors.success, Icon: CircleCheck },
    destructive: { color: colors.destructive, Icon: CircleAlert },
} as const;

/**
 * Notice that stays on the screen, for what the user should read before an action, such as what
 * closing a route does. It has the look of NoticeDialog without being a dialog: an icon over a
 * centered title and text, in a Card, and no button, since nothing is asked of the user. The
 * border has the color of the icon. It is announced to screen readers like an alert.
 */
export function NoticeCard({
    title,
    message,
    variant = 'warning',
    style,
    ...props
}: NoticeCardProps) {
    const { color, Icon } = tones[variant];

    return (
        <Card
            accessibilityRole="alert"
            style={[styles.card, { borderColor: color }, style]}
            {...props}
        >
            <Icon color={color} size={sizes.icon} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
        </Card>
    );
}

/** Styles of NoticeCard: the text sizes and the padding of NoticeDialog. */
const styles = StyleSheet.create({
    card: {
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.xl,
    },
    title: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        textAlign: 'center',
    },
    message: {
        color: palette.g40,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
        textAlign: 'center',
    },
});
