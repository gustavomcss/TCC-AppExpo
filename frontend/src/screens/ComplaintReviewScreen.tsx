import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ClipboardCheck, SearchX, TriangleAlert } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ListFilters } from '../components/ListFilters';
import type { StatusOption } from '../components/ListFilters';
import { LoadingState } from '../components/LoadingState';
import type { RootNavigation } from '../navigation/types';
import { formatDate, formatKm } from '../schemas/masks';
import { filterReviewComplaints, listReviewComplaints } from '../services/complaints';
import type { ComplaintStatus, ReviewComplaint, ReviewStatusFilter } from '../services/complaints';
import { parseServerError } from '../services/serverErrors';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';

/** What the list is showing: the request in progress, its failure, or the complaints. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; complaints: ReviewComplaint[] };

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

/**
 * Complaint review (RF15), a module of the supervisor. Lists the pending complaints, oldest
 * first, and then the reviewed ones, the latest review first, each with the icon of a complaint,
 * the driver, the vehicle, the km change it asks for ("departure → informed") and its situation
 * badge. A reviewed complaint says
 * "Revisado em DD/MM/AAAA"; a pending one says "Registrado em" and the date, without the time, so
 * the line does not wrap on small phones. A search field (driver, plate or
 * model) and the chips Todas, Pendentes and Revisadas narrow the list on the device, without a
 * new request. A row opens its detail, where a pending complaint is approved or rejected. The list
 * is loaded again each time the screen gets focus, so a complaint just reviewed has already left
 * the pending ones when the detail goes back.
 */
export default function ComplaintReviewScreen() {
    const navigation = useNavigation<RootNavigation>();
    const [state, setState] = useState<State>({ status: 'loading' });
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<ReviewStatusFilter>('all');
    const complaints = state.status === 'ready' ? state.complaints : null;
    const visible = useMemo(
        () => (complaints ? filterReviewComplaints(complaints, query, status) : []),
        [complaints, query, status],
    );

    const load = useCallback(async () => {
        try {
            setState({ status: 'ready', complaints: await listReviewComplaints() });
        } catch (error) {
            setState({ status: 'error', message: parseServerError(error).form ?? '' });
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    function retry() {
        setState({ status: 'loading' });
        load();
    }

    function renderComplaint(complaint: ReviewComplaint) {
        const badge = BADGES[complaint.status];

        return (
            <Pressable
                key={complaint.id}
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

    function renderBody() {
        if (state.status === 'loading') {
            return <LoadingState />;
        }

        if (state.status === 'error') {
            return (
                <ErrorState
                    title="Não foi possível carregar as denúncias"
                    message={state.message}
                    onRetry={retry}
                />
            );
        }

        if (state.complaints.length === 0) {
            return (
                <EmptyState
                    icon={ClipboardCheck}
                    title="Nenhuma denúncia"
                    description="As denúncias de km enviadas pelos motoristas aparecem aqui para revisão."
                />
            );
        }

        return (
            <>
                <ListFilters
                    searchLabel="Buscar denúncia"
                    searchPlaceholder="Buscar por motorista, placa ou modelo"
                    query={query}
                    onQueryChange={setQuery}
                    status={status}
                    onStatusChange={setStatus}
                    statusOptions={STATUS_OPTIONS}
                />

                {visible.length === 0 ? (
                    <EmptyState
                        icon={SearchX}
                        title="Nenhuma denúncia encontrada"
                        description="Ajuste a busca ou o filtro para ver outras denúncias."
                    />
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.list}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {visible.map(renderComplaint)}
                    </ScrollView>
                )}
            </>
        );
    }

    return <View style={styles.screen}>{renderBody()}</View>;
}

/** Styles of the review list: search and chips over cards, on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    list: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        gap: spacing.md,
    },
    pressed: {
        opacity: 0.6,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        padding: spacing.md,
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
