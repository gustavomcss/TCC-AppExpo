import { TriangleAlert } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import type { ComplaintStatus } from '../services/complaints';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';
import { Card } from './Card';

/** The card of a history item: the shared `Card` with the vertical rhythm of the history cards. */
export function HistoryCard({ children }: { children: ReactNode }) {
    return <Card style={styles.card}>{children}</Card>;
}

/**
 * Top of a history card: the icon in its box, a title with an optional subtitle under it and,
 * when given, something at the right edge (a badge or an action).
 */
export function HistoryCardTop({
    icon: Icon,
    title,
    subtitle,
    right,
}: {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    right?: ReactNode;
}) {
    return (
        <View style={styles.top}>
            <View style={styles.iconBox}>
                <Icon color={palette.g20} size={sizes.icon} />
            </View>
            <View style={styles.texts}>
                <Text style={styles.name}>{title}</Text>
                {subtitle ? <Text style={styles.detail}>{subtitle}</Text> : null}
            </View>
            {right}
        </View>
    );
}

/** The thin line between the top of a history card and its facts. */
export function HistoryCardSeparator() {
    return <View style={styles.separator} />;
}

/** Wrapping row for the `Fact`s of a history card: two fit side by side. */
export function HistoryCardFacts({ children }: { children: ReactNode }) {
    return <View style={styles.facts}>{children}</View>;
}

/** Bottom row of a history card, for the small notes: the first at the left, the last at the right. */
export function HistoryCardFooter({ children }: { children: ReactNode }) {
    return <View style={styles.footer}>{children}</View>;
}

/** Small muted text of the footer of a history card. */
export function HistoryCardNote({
    children,
    style,
}: {
    children: ReactNode;
    style?: StyleProp<TextStyle>;
}) {
    return <Text style={[styles.note, style]}>{children}</Text>;
}

/** How the footer names the situation of a complaint. */
const COMPLAINT_LABELS: Record<ComplaintStatus, string> = {
    pendente: 'Denúncia pendente',
    aprovada: 'Denúncia aprovada',
    reprovada: 'Denúncia reprovada',
};

/**
 * Footer line that names the situation of a complaint ("Denúncia pendente", "Denúncia aprovada" or
 * "Denúncia reprovada") next to an alert icon, all in the muted gray whatever the situation.
 */
export function HistoryComplaintNote({ status }: { status: ComplaintStatus }) {
    return (
        <View style={styles.complaint}>
            <TriangleAlert color={colors.mutedForeground} size={16} />
            <HistoryCardNote>{COMPLAINT_LABELS[status]}</HistoryCardNote>
        </View>
    );
}

/** Styles shared by the history cards. */
const styles = StyleSheet.create({
    complaint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    card: {
        gap: spacing.md,
    },
    top: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    iconBox: {
        width: sizes.iconBox,
        height: sizes.iconBox,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: palette.gE0,
    },
    texts: {
        flex: 1,
    },
    name: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
        lineHeight: 24,
    },
    detail: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    separator: {
        height: 1,
        backgroundColor: palette.gE0,
    },
    facts: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    footer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        columnGap: spacing.md,
        rowGap: spacing.xs,
        marginTop: spacing.md / 2,
    },
    note: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.xs,
        lineHeight: 16,
    },
});
