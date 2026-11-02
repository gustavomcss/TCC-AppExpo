import { useNavigation } from '@react-navigation/native';
import type { LucideIcon } from 'lucide-react-native';
import { Droplets, Fuel, Pencil, Route, SearchX, TriangleAlert, Wrench } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { ListFilters } from '../components/ListFilters';
import type { StatusOption } from '../components/ListFilters';
import { PagedList } from '../components/PagedList';
import { useAuth } from '../contexts/AuthContext';
import type { RootNavigation } from '../navigation/types';
import { FUEL_TYPES } from '../schemas/fuel';
import { formatDate, formatDateTime, formatDecimal, formatKm } from '../schemas/masks';
import { VEHICLE_TYPES } from '../schemas/vehicle';
import { HISTORY_PERIODS, listHistory } from '../services/history';
import type {
    HistoryFilters,
    HistoryItem,
    HistoryModule,
    HistoryPeriod,
} from '../services/history';
import type { ServiceRecord } from '../services/serviceRecords';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';

/** A module of the history: its chip, its icon and the notice for when it has no records at all. */
type ModuleInfo = StatusOption<HistoryModule> & {
    icon: LucideIcon;
    emptyTitle: string;
    emptyDescription: string;
};

/** The five modules (RF17), in the order the chips appear. */
const MODULES: readonly ModuleInfo[] = [
    {
        value: 'routes',
        label: 'Rotas',
        icon: Route,
        emptyTitle: 'Nenhuma rota finalizada',
        emptyDescription: 'As rotas finalizadas aparecerão aqui.',
    },
    {
        value: 'complaints',
        label: 'Denúncias',
        icon: TriangleAlert,
        emptyTitle: 'Nenhuma denúncia',
        emptyDescription: 'As denúncias de divergência de km aparecerão aqui.',
    },
    {
        value: 'fuels',
        label: 'Abastecimentos',
        icon: Fuel,
        emptyTitle: 'Nenhum abastecimento',
        emptyDescription: 'Os abastecimentos registrados aparecerão aqui.',
    },
    {
        value: 'oils',
        label: 'Trocas de óleo',
        icon: Droplets,
        emptyTitle: 'Nenhuma troca de óleo',
        emptyDescription: 'As trocas de óleo registradas aparecerão aqui.',
    },
    {
        value: 'repairs',
        label: 'Manutenções',
        icon: Wrench,
        emptyTitle: 'Nenhuma manutenção',
        emptyDescription: 'As manutenções registradas aparecerão aqui.',
    },
];

/** How long the search text rests before the list asks the server, in ms. */
const SEARCH_DELAY = 400;

/** Icon and title of each kind of service record. */
const SERVICE_CARDS = {
    fuel: { icon: Fuel, title: 'Abastecimento' },
    oil: { icon: Droplets, title: 'Troca de óleo' },
    repair: { icon: Wrench, title: 'Manutenção' },
} as const;

/** Key of an item in the list: the kind keeps ids of different collections apart. */
function itemKey(item: HistoryItem): string {
    return `${item.kind}-${item.id}`;
}

/** The line that sums up a service record: fuel and liters, oil type or description, and the cost. */
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

/** What a card shows, whatever the module. */
type CardContent = {
    icon: LucideIcon;
    title: string;
    lines: string[];
    badge?: { label: string; variant: 'outline' | 'secondary' };
};

/**
 * The text of the card of an item. Provisional until the definitive cards (I-34 for routes, I-35
 * for the other modules) replace it; `showDriver` adds who did it, for the supervisor.
 */
function describe(item: HistoryItem, showDriver: boolean): CardContent {
    switch (item.kind) {
        case 'route':
            return {
                icon: Route,
                title: `${item.vehicle.plate} · ${item.vehicle.model}`,
                lines: [
                    item.itinerary,
                    `Saída ${formatDateTime(item.dateDeparture)} · Retorno ${formatDateTime(item.dateReturn)}`,
                    `Km ${formatKm(item.kmDeparture)} → ${formatKm(item.kmReturn)}`,
                    ...(showDriver ? [item.driverName] : []),
                ],
            };
        case 'complaint':
            return {
                icon: TriangleAlert,
                title: `${item.vehicle.plate} · ${item.vehicle.model}`,
                lines: [
                    `Km ${formatKm(item.kmDeparture)} → ${formatKm(item.kmComplaint)}`,
                    `Registrado em ${formatDate(item.created)}`,
                    ...(item.reviewed ? [`Revisado em ${formatDate(item.reviewed)}`] : []),
                    ...(showDriver ? [item.driverName] : []),
                ],
                badge: {
                    label: { pendente: 'Pendente', aprovada: 'Aprovada', reprovada: 'Reprovada' }[
                        item.status
                    ],
                    variant: item.status === 'pendente' ? 'outline' : 'secondary',
                },
            };
        default:
            return {
                icon: SERVICE_CARDS[item.kind].icon,
                title: SERVICE_CARDS[item.kind].title,
                lines: [
                    `${item.vehicle.plate} · ${item.vehicle.model}`,
                    summarize(item),
                    `Km registrado: ${formatKm(item.km)} km`,
                    `${formatDateTime(item.created)} · ${item.authorName}`,
                ],
            };
    }
}

/**
 * History tab (RF17): five modules (Rotas, Denúncias, Abastecimentos, Trocas de óleo and
 * Manutenções) in chips under the search field, one list at a time. The search (plate or model,
 * and the driver for the supervisor) and the vehicle type chips, in a second row, stay fixed at
 * the top; the period chips scroll away with the list. They narrow the list and combine: no chip
 * selected means everything, and they stay when the module changes. The filtering is the server's and the list loads a page at a time as it is
 * scrolled (`PagedList`), so a long history is never read whole. A driver sees only their own
 * records and a supervisor everyone's, by the API rules; the routes are only the finalized ones
 * (RB10). The cards are provisional until the I-34 (routes) and I-35 (the other modules); the
 * pencil of a service record, only on the signed-in user's own (RB17), opens the edit screen.
 */
export default function HistoryScreen() {
    const navigation = useNavigation<RootNavigation>();
    const { user } = useAuth();
    const [module, setModule] = useState<HistoryModule>('routes');
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [type, setType] = useState<HistoryFilters['type']>(null);
    const [period, setPeriod] = useState<HistoryPeriod | null>(null);
    const info = MODULES.find((item) => item.value === module) ?? MODULES[0];
    const isSupervisor = user?.role === 'supervisor';
    const filtered = search.trim() !== '' || type !== null || period !== null;

    useEffect(() => {
        const timer = setTimeout(() => setSearch(query), SEARCH_DELAY);
        return () => clearTimeout(timer);
    }, [query]);

    function renderItem(item: HistoryItem) {
        const { icon: Icon, title, lines, badge } = describe(item, isSupervisor);
        const record = item.kind === 'route' || item.kind === 'complaint' ? null : item;

        return (
            <Card style={styles.card}>
                <View style={styles.top}>
                    <View style={styles.iconBox}>
                        <Icon color={palette.g20} size={sizes.icon} />
                    </View>
                    <View style={styles.texts}>
                        <Text style={styles.name}>{title}</Text>
                        {lines.map((line, index) => (
                            <Text key={index} style={styles.detail}>
                                {line}
                            </Text>
                        ))}
                    </View>
                    {badge && <Badge label={badge.label} variant={badge.variant} />}
                    {record && record.userId === user?.id && (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Editar registro"
                            hitSlop={6}
                            onPress={() =>
                                navigation.navigate('ServiceRecordEdit', {
                                    kind: record.kind,
                                    recordId: record.id,
                                })
                            }
                            style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
                        >
                            <Pencil color={colors.foreground} size={16} />
                        </Pressable>
                    )}
                </View>
            </Card>
        );
    }

    const header = (
        <View style={styles.header}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.chips}
            >
                {HISTORY_PERIODS.map((item) => (
                    <Chip
                        key={item.value}
                        label={item.label}
                        selected={period === item.value}
                        onPress={() => setPeriod(period === item.value ? null : item.value)}
                    />
                ))}
            </ScrollView>
        </View>
    );

    return (
        <View style={styles.screen}>
            <ListFilters
                searchLabel="Buscar no histórico"
                searchPlaceholder={
                    isSupervisor
                        ? 'Buscar por motorista, placa ou modelo'
                        : 'Buscar por placa ou modelo'
                }
                query={query}
                onQueryChange={setQuery}
                status={module}
                onStatusChange={setModule}
                statusOptions={MODULES}
                extraRow={VEHICLE_TYPES.map((item) => (
                    <Chip
                        key={item.value}
                        label={item.label}
                        selected={type === item.value}
                        onPress={() => setType(type === item.value ? null : item.value)}
                    />
                ))}
            />

            <PagedList<HistoryItem>
                queryKey={`${module}|${search.trim()}|${type ?? ''}|${period ?? ''}`}
                loadPage={(page) =>
                    listHistory(
                        module,
                        { query: search, byDriver: isSupervisor, type, period },
                        page,
                    )
                }
                keyExtractor={itemKey}
                renderItem={renderItem}
                header={header}
                errorTitle="Não foi possível carregar o histórico"
                emptyState={
                    filtered ? (
                        <EmptyState
                            icon={SearchX}
                            title="Nenhum registro encontrado"
                            description="Ajuste a busca ou os filtros para ver outros registros."
                        />
                    ) : (
                        <EmptyState
                            icon={info.icon}
                            title={info.emptyTitle}
                            description={info.emptyDescription}
                        />
                    )
                }
            />
        </View>
    );
}

/** Styles of the history: filters over a list of cards, on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    header: {
        gap: spacing.md,
        paddingBottom: spacing.lg,
    },
    chips: {
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    card: {
        padding: spacing.md,
    },
    edit: {
        width: sizes.iconButton,
        height: sizes.iconButton,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.background,
    },
    pressed: {
        opacity: 0.85,
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
