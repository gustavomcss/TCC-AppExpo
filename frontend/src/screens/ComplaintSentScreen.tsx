import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { Card, CardHeader, CardTitle } from '../components/Card';
import { Fact, FactSpacer } from '../components/Fact';
import { NoticeCard } from '../components/NoticeCard';
import type { NoticeCardProps } from '../components/NoticeCard';
import { OpenRouteCard } from '../components/OpenRouteCard';
import { formatDateTime, formatKm } from '../schemas/masks';
import type { Complaint, ComplaintStatus } from '../services/complaints';
import type { OpenRoute } from '../services/routes';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/** Props of ComplaintSentScreen: the open route and the complaint already filed on it. */
export type ComplaintSentScreenProps = {
    route: OpenRoute;
    complaint: Complaint;
};

/**
 * What the badge and the notice say for each situation. The badge inside the screen is `outline`
 * while the complaint waits and `secondary` once it is decided, and the outcomes differ only by
 * their text. The notice takes a color: blue while it waits, green when approved, red when
 * rejected.
 */
const SITUATIONS: Record<
    ComplaintStatus,
    {
        label: string;
        variant: BadgeVariant;
        tone: NoticeCardProps['variant'];
        description: string;
    }
> = {
    pendente: {
        label: 'Pendente',
        variant: 'outline',
        tone: 'warning',
        description:
            'Aguardando a revisão do supervisor. Acompanhe a situação pelo card em Serviços.',
    },
    aprovada: {
        label: 'Aprovada',
        variant: 'secondary',
        tone: 'success',
        description: 'O supervisor aprovou a denúncia. O km da rota foi corrigido.',
    },
    reprovada: {
        label: 'Reprovada',
        variant: 'secondary',
        tone: 'destructive',
        description: 'O supervisor reprovou a denúncia. Nenhum km foi alterado.',
    },
};

/**
 * The "Denúncia de km" module when the open route already has its complaint (RB11 allows one per
 * route): no form, the summary of the route and, under it, what was reported and where it stands,
 * with the badge of the situation and a notice that says what it means. The route can still be
 * finalized (RB05).
 */
export default function ComplaintSentScreen({ route, complaint }: ComplaintSentScreenProps) {
    const situation = SITUATIONS[complaint.status];

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <OpenRouteCard route={route} />

            <Card>
                <View style={styles.top}>
                    <CardHeader style={styles.title}>
                        <CardTitle>Denúncia registrada</CardTitle>
                    </CardHeader>
                    <Badge label={situation.label} variant={situation.variant} />
                </View>

                <View style={styles.separator} />

                <View style={styles.grid}>
                    <Fact label="Km informado" value={formatKm(complaint.kmComplaint)} />
                    <Fact label="Registrado" value={formatDateTime(complaint.created)} />
                    {complaint.reviewed !== '' && (
                        <>
                            <FactSpacer />
                            <Fact label="Revisado" value={formatDateTime(complaint.reviewed)} />
                        </>
                    )}
                    {complaint.photoUrl !== '' && (
                        <View style={styles.photo}>
                            <Text style={styles.photoLabel}>Foto do painel</Text>
                            <Image
                                accessibilityLabel="Foto do painel enviada na denúncia"
                                source={{ uri: complaint.photoUrl }}
                                style={styles.thumb}
                            />
                        </View>
                    )}
                </View>
            </Card>

            <NoticeCard
                variant={situation.tone}
                title={`Situação: ${situation.label.toLowerCase()}`}
                message={situation.description}
            />
        </ScrollView>
    );
}

/** Styles of the sent complaint: a card and a notice on the gray background of the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        padding: spacing.lg,
        gap: spacing.lg,
    },
    top: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    title: {
        flex: 1,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.lg,
    },
    photo: {
        flexBasis: '100%',
        gap: spacing.xs,
    },
    thumb: {
        width: '100%',
        aspectRatio: 4 / 3,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.muted,
    },
    photoLabel: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
    },
});
