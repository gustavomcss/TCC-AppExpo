import { useNavigation } from '@react-navigation/native';
import { ClipboardCheck, SearchX, TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ListFilters } from '../components/ListFilters';
import type { StatusOption } from '../components/ListFilters';
import { PagedList } from '../components/PagedList';
import type { RootNavigation } from '../navigation/types';
import { formatDate, formatKm } from '../schemas/masks';
import { listReviewComplaints } from '../services/complaints';
import type {
    ComplaintStatus,
    ReviewListComplaint,
    ReviewStatusFilter,
} from '../services/complaints';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';

/** Options of the situation filter, in the order the chips appear. */
const STATUS_OPTIONS: readonly StatusOption<ReviewStatusFilter>[] = [
    { value: 'all', label: 'Todas' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'revisada', label: 'Revisadas' },
];

/** Badge of each situation inside the screens: "Pendente" outline, the outcomes muted. */
const BADGES: Record<ComplaintStatus, { label: string; variant: BadgeVariant }> = {
    pendente: { label: 'Pendente', variant: 'outline' },
    aprovada: { label: 'Aprovada', variant: 'secondary' },
    reprovada: { label: 'Reprovada', variant: 'secondary' },
};

/** How long the search text rests before the list asks the server, in ms. */
const SEARCH_DELAY = 400;

/** Key of a complaint in the list. */
function complaintKey(complaint: ReviewListComplaint): string {
    return complaint.id;
}

/**
 * Complaint review (RF15), a module of the supervisor. Lists the pending complaints, oldest
 * first, and then the reviewed ones, the latest review first, each with the icon of a complaint,
 * the driver, the vehicle, the km change it asks for ("departure → informed") and its situation
 * badge. A reviewed complaint says "Revisado em DD/MM/AAAA"; a pending one says "Registrado em"
 * and the date, without the time, so the line does not wrap on small phones. A search field
 * (driver, plate or model) and the chips Todas, Pendentes and Revisadas narrow the list. The
 * filtering, the order and the paging are the server's and the list loads ten complaints at a
 * time as it is scrolled (`PagedList`), so the list never reads every complaint. A row opens its
 * detail, where a pending complaint is approved or rejected. The pages loaded are read again each
 * time the screen gets focus, so a complaint just reviewed has already left the pending ones
 * when the detail goes back.
 */
export default function ComplaintReviewScreen() {
    const navigation = useNavigation<RootNavigation>();
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<ReviewStatusFilter>('all');
    const filtered = search.trim() !== '' || status !== 'all';

    useEffect(() => {
        const timer = setTimeout(() => setSearch(query), SEARCH_DELAY);
        return () => clearTimeout(timer);
    }, [query]);

    function renderComplaint(complaint: ReviewListComplaint) {
        const badge = BADGES[complaint.status];

        return (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Denúncia de ${complaint.driverName}`}
                onPress={() =>
                    navigation.navigate('ComplaintReviewDetail', { complaintId: complaint.id })
                }
                style={({ pressed }) => pressed && styles.pressed}
            >
                <Card style={styles.card}>
                    <View style={styles.iconBox}>
                        <TriangleAlert color={palette.g20} size={sizes.icon} />
                    </View>
                    <View style={styles.texts}>
                        <Text style={styles.name}>{complaint.driverName}</Text>
                        <Text style={styles.detail}>
                            {complaint.vehicle.plate} · {complaint.vehicle.model}
                        </Text>
                        <Text style={styles.detail}>
                            {formatKm(complaint.kmDeparture)} → {formatKm(complaint.kmComplaint)}
                        </Text>
                        <Text style={styles.detail}>
                            {complaint.reviewed !== ''
                                ? `Revisado em ${formatDate(complaint.reviewed)}`
                                : `Registrado em ${formatDate(complaint.created)}`}
                        </Text>
                    </View>
                    <Badge label={badge.label} variant={badge.variant} />
                </Card>
            </Pressable>
        );
    }

    return (
        <View style={styles.screen}>
            <ListFilters
                searchLabel="Buscar denúncia"
                searchPlaceholder="Buscar por motorista, placa ou modelo"
                query={query}
                onQueryChange={setQuery}
                status={status}
                onStatusChange={setStatus}
                statusOptions={STATUS_OPTIONS}
            />

            <PagedList<ReviewListComplaint>
                queryKey={`${search.trim()}|${status}`}
                loadPage={(page) => listReviewComplaints({ query: search, status }, page)}
                keyExtractor={complaintKey}
                renderItem={renderComplaint}
                errorTitle="Não foi possível carregar as denúncias"
                emptyState={
                    filtered ? (
                        <EmptyState
                            icon={SearchX}
                            top
                            title="Nenhuma denúncia encontrada"
                            description="Ajuste a busca ou o filtro para ver outras denúncias."
                        />
                    ) : (
                        <EmptyState
                            icon={ClipboardCheck}
                            title="Nenhuma denúncia"
                            description="As denúncias de km enviadas pelos motoristas aparecem aqui para revisão."
                        />
                    )
                }
            />
        </View>
    );
}

/** Styles of the review list: search and chips over a list of cards, on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    pressed: {
        opacity: 0.6,
    },
    card: {
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
});
