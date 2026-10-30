import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorState } from '../components/ErrorState';
import { Fact } from '../components/Fact';
import { LoadingState } from '../components/LoadingState';
import { NoticeCard } from '../components/NoticeCard';
import { NoticeDialog } from '../components/NoticeDialog';
import { useToast } from '../contexts/ToastContext';
import type { RootStackParamList } from '../navigation/types';
import { formatDateTime, formatKm } from '../schemas/masks';
import { approvalBlockedReason, getReviewComplaint, reviewComplaint } from '../services/complaints';
import type { ComplaintStatus, ReviewComplaint } from '../services/complaints';
import { isNotFoundError, isRuleError, parseServerError } from '../services/serverErrors';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/** The two outcomes of a review. */
type Decision = Exclude<ComplaintStatus, 'pendente'>;

/** What each decision says in its confirmation and in the toast that follows it. */
const DECISIONS: Record<
    Decision,
    {
        title: string;
        message: string;
        confirmLabel: string;
        destructive: boolean;
        done: string;
        toast: 'success' | 'warning';
        failure: string;
    }
> = {
    aprovada: {
        title: 'Aprovar denúncia?',
        message:
            'Os km da rota serão corrigidos com base no km informado. Essa ação não pode ser desfeita.',
        confirmLabel: 'Aprovar',
        destructive: false,
        done: 'Denúncia aprovada. Os km da rota foram corrigidos.',
        toast: 'success',
        failure: 'Não foi possível aprovar',
    },
    reprovada: {
        title: 'Reprovar denúncia?',
        message: 'Nenhum km será alterado. O motorista verá a denúncia como reprovada.',
        confirmLabel: 'Reprovar',
        destructive: true,
        done: 'Denúncia reprovada. Nenhum km foi alterado.',
        toast: 'warning',
        failure: 'Não foi possível reprovar',
    },
};

/** Badge of each situation inside the screens: "Pendente" outline, the outcomes muted. */
const BADGES: Record<ComplaintStatus, { label: string; variant: BadgeVariant }> = {
    pendente: { label: 'Pendente', variant: 'outline' },
    aprovada: { label: 'Aprovada', variant: 'secondary' },
    reprovada: { label: 'Reprovada', variant: 'secondary' },
};

/** What the screen is showing: the request in progress, its failure, or the complaint. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; complaint: ReviewComplaint };

/** Km difference as the supervisor reads it, signed and without the zero padding of the other km: "+80,00 km", "-0,05 km". */
function formatDifference(difference: number): string {
    const cents = Math.round(difference * 100);
    const text = (Math.abs(cents) / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return `${cents > 0 ? '+' : cents < 0 ? '-' : ''}${text} km`;
}

/**
 * Complaint review detail (RF15), opened from the review list. Shows the driver and vehicle, the
 * departure km of the route, the km informed, when it was registered and, in the last cell, their
 * difference (or, once reviewed, when it was reviewed), then the photo of the panel. A
 * pending complaint has the fixed bar "Aprovar" and "Reprovar", each asking for a confirmation;
 * a reviewed one is only shown, with its situation. The supervisor
 * may review the complaint they filed themselves (RB08). "Aprovar" is off, with the reason written
 * on the screen, when the server would refuse it (RB14, `approvalBlockedReason`); "Reprovar" is
 * always available. The server is the rule: only a supervisor reviews, and only a pending
 * complaint, so one reviewed by someone else in the meantime answers 404 and the app says so and
 * goes back. Any other refusal opens a dialog with the reason and the screen is loaded again, so
 * the complaint stays pending. On success it shows a toast and goes back to the list. What follows
 * the dialog waits for it to be gone (onHidden), because iOS cannot present a Modal or change
 * screen under one that is still closing.
 */
export default function ComplaintReviewDetailScreen({
    route,
    navigation,
}: NativeStackScreenProps<RootStackParamList, 'ComplaintReviewDetail'>) {
    const { complaintId } = route.params;
    const toast = useToast();
    const [state, setState] = useState<State>({ status: 'loading' });
    const [decision, setDecision] = useState<Decision>('aprovada');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const [goneNotice, setGoneNotice] = useState(false);
    const afterConfirm = useRef<(() => void) | null>(null);

    /* With `keep`, a failed read leaves the complaint on screen, so a dialog opened over it is not hidden by the error state. */
    const load = useCallback(
        async (keep = false) => {
            try {
                setState({ status: 'ready', complaint: await getReviewComplaint(complaintId) });
            } catch (error) {
                setState((previous) =>
                    keep && previous.status === 'ready'
                        ? previous
                        : { status: 'error', message: parseServerError(error).form ?? '' },
                );
            }
        },
        [complaintId],
    );

    useFocusEffect(
        useCallback(() => {
            load(true);
        }, [load]),
    );

    function retry() {
        setState({ status: 'loading' });
        load();
    }

    function ask(next: Decision) {
        setDecision(next);
        setConfirmOpen(true);
    }

    async function confirmReview() {
        const chosen = DECISIONS[decision];
        setSaving(true);
        try {
            await reviewComplaint(complaintId, decision);
            afterConfirm.current = () => {
                toast.show(chosen.toast, chosen.done);
                navigation.goBack();
            };
        } catch (error) {
            if (isNotFoundError(error)) {
                afterConfirm.current = () => setGoneNotice(true);
            } else {
                const { form, fields } = parseServerError(error);
                afterConfirm.current = () => {
                    setFailure({
                        visible: true,
                        title:
                            isRuleError(error) || Object.keys(fields).length > 0
                                ? 'Ação não permitida'
                                : chosen.failure,
                        message:
                            form ??
                            Object.values(fields)[0] ??
                            'Não foi possível salvar. Tente novamente.',
                    });
                    /* The complaint is still pending: read it again, since the data may have changed. */
                    load(true);
                };
            }
        } finally {
            setSaving(false);
            setConfirmOpen(false);
        }
    }

    function afterConfirmHidden() {
        const next = afterConfirm.current;
        afterConfirm.current = null;
        next?.();
    }

    if (state.status === 'loading') {
        return (
            <View style={styles.screen}>
                <LoadingState />
            </View>
        );
    }

    if (state.status === 'error') {
        return (
            <View style={styles.screen}>
                <ErrorState
                    title="Não foi possível carregar a denúncia"
                    message={state.message}
                    onRetry={retry}
                />
            </View>
        );
    }

    const { complaint } = state;
    const pending = complaint.status === 'pendente';
    const blockedReason = pending ? approvalBlockedReason(complaint) : null;
    const badge = BADGES[complaint.status];
    const chosen = DECISIONS[decision];

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                <Card>
                    <View style={styles.top}>
                        <CardHeader style={styles.title}>
                            <CardTitle>{complaint.driverName}</CardTitle>
                            <CardDescription>
                                {complaint.vehicle.plate} · {complaint.vehicle.model}
                            </CardDescription>
                        </CardHeader>
                        <Badge label={badge.label} variant={badge.variant} />
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.grid}>
                        <Fact label="Km de saída" value={formatKm(complaint.kmDeparture)} />
                        <Fact label="Registrado" value={formatDateTime(complaint.created)} />
                        <Fact label="Km informado" value={formatKm(complaint.kmComplaint)} />
                        {complaint.reviewed !== '' ? (
                            <Fact label="Revisado" value={formatDateTime(complaint.reviewed)} />
                        ) : (
                            <Fact
                                label="Diferença"
                                value={formatDifference(
                                    complaint.kmComplaint - complaint.kmDeparture,
                                )}
                            />
                        )}
                    </View>

                    {complaint.photoUrl !== '' && (
                        <View style={styles.photoBox}>
                            <Text style={styles.photoLabel}>Foto do painel</Text>
                            <Image
                                accessibilityLabel="Foto do painel enviada na denúncia"
                                source={{ uri: complaint.photoUrl }}
                                style={styles.photo}
                            />
                        </View>
                    )}
                </Card>

                {pending &&
                    (blockedReason ? (
                        <NoticeCard
                            variant="destructive"
                            title="Aprovação indisponível"
                            message={blockedReason}
                        />
                    ) : (
                        <NoticeCard
                            title="O que acontece ao decidir"
                            message="Aprovar corrige os km da rota com base no km informado. Reprovar não altera nenhum km."
                        />
                    ))}
            </ScrollView>

            {pending && (
                <ActionBar>
                    <Button
                        title="Aprovar"
                        disabled={blockedReason !== null}
                        onPress={() => ask('aprovada')}
                    />
                    <Button variant="outline" title="Reprovar" onPress={() => ask('reprovada')} />
                </ActionBar>
            )}

            <ConfirmDialog
                visible={confirmOpen}
                title={chosen.title}
                message={chosen.message}
                confirmLabel={chosen.confirmLabel}
                destructive={chosen.destructive}
                onConfirm={confirmReview}
                onCancel={() => setConfirmOpen(false)}
                onHidden={afterConfirmHidden}
                loading={saving}
            />
            <NoticeDialog
                visible={failure.visible}
                title={failure.title}
                message={failure.message}
                onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
            />
            <NoticeDialog
                visible={goneNotice}
                title="Denúncia já revisada"
                message="Esta denúncia já foi revisada por outro supervisor."
                onClose={() => setGoneNotice(false)}
                onHidden={() => navigation.goBack()}
            />
        </View>
    );
}

/** Styles of the review detail: the complaint card and the notice, on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        flexGrow: 1,
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
    photoBox: {
        gap: spacing.xs,
    },
    photoLabel: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
    },
    photo: {
        width: '100%',
        aspectRatio: 4 / 3,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.muted,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.lg,
    },
});
