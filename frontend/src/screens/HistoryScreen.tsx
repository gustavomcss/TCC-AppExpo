import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { LucideIcon } from 'lucide-react-native';
import { Droplets, Fuel, History, Wrench } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import type { RootNavigation } from '../navigation/types';
import { FUEL_TYPES } from '../schemas/fuel';
import { formatDateTime, formatDecimal, formatKm } from '../schemas/masks';
import { listServiceRecords } from '../services/serviceRecords';
import type { ServiceKind, ServiceRecord } from '../services/serviceRecords';
import { parseServerError } from '../services/serverErrors';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';

/** What the list is showing: the request in progress, its failure, or the records. */
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; records: ServiceRecord[] };

/** Icon and title of each kind of record. */
const KINDS: Record<ServiceKind, { icon: LucideIcon; title: string }> = {
    fuel: { icon: Fuel, title: 'Abastecimento' },
    oil: { icon: Droplets, title: 'Troca de óleo' },
    repair: { icon: Wrench, title: 'Manutenção' },
};

/** The line that sums up a record: fuel and liters, oil type or description, and the cost. */
function summarize(record: ServiceRecord): string {
    const cost = `R$ ${formatDecimal(record.cost)}`;

    switch (record.kind) {
        case 'fuel': {
            const fuel =
                FUEL_TYPES.find((type) => type.value === record.type)?.label ?? record.type;
            return `${fuel} · ${formatDecimal(record.liters)} L · ${cost}`;
        }
        case 'oil':
            return `${record.type} · ${cost}`;
        case 'repair':
            return `${record.description} · ${cost}`;
    }
}

/**
 * History tab. Provisional until the history lists (I-33 and I-35) replace it: for now it lists
 * the fuelings, oil changes and repairs the user can read (a driver's own, all of them for a
 * supervisor, RF17), the latest first, and only the records of the signed-in user have the
 * "Editar" action, which opens the edit screen (RF21, RB17). The list is loaded again with each
 * focus, so an edit just saved is already there when the edit screen goes back.
 */
export default function HistoryScreen() {
    const navigation = useNavigation<RootNavigation>();
    const { user } = useAuth();
    const [state, setState] = useState<State>({ status: 'loading' });

    const load = useCallback(async () => {
        try {
            setState({ status: 'ready', records: await listServiceRecords() });
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

    function renderRecord(record: ServiceRecord) {
        const { icon: Icon, title } = KINDS[record.kind];

        return (
            <Card key={`${record.kind}-${record.id}`} style={styles.card}>
                <View style={styles.top}>
                    <View style={styles.iconBox}>
                        <Icon color={palette.g20} size={sizes.icon} />
                    </View>
                    <View style={styles.texts}>
                        <Text style={styles.name}>{title}</Text>
                        <Text style={styles.detail}>
                            {record.vehicle.plate} · {record.vehicle.model}
                        </Text>
                        <Text style={styles.detail}>{summarize(record)}</Text>
                        <Text style={styles.detail}>Km registrado:{formatKm(record.km)} km</Text>
                        <Text style={styles.detail}>
                            {formatDateTime(record.created)} · {record.authorName}
                        </Text>
                    </View>
                </View>

                {record.userId === user?.id && (
                    <Button
                        title="Editar"
                        variant="outline"
                        onPress={() =>
                            navigation.navigate('ServiceRecordEdit', {
                                kind: record.kind,
                                recordId: record.id,
                            })
                        }
                    />
                )}
            </Card>
        );
    }

    function renderBody() {
        if (state.status === 'loading') {
            return <LoadingState />;
        }

        if (state.status === 'error') {
            return (
                <ErrorState
                    title="Não foi possível carregar o histórico"
                    message={state.message}
                    onRetry={retry}
                />
            );
        }

        if (state.records.length === 0) {
            return (
                <EmptyState
                    icon={History}
                    title="Nenhum registro ainda"
                    description="Os abastecimentos, trocas de óleo e manutenções feitos aparecerão aqui."
                />
            );
        }

        return (
            <ScrollView contentContainerStyle={styles.list}>
                {state.records.map(renderRecord)}
            </ScrollView>
        );
    }

    return <View style={styles.screen}>{renderBody()}</View>;
}

/** Styles of the history list: cards on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    list: {
        padding: spacing.lg,
        gap: spacing.md,
    },
    card: {
        padding: spacing.md,
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
});
