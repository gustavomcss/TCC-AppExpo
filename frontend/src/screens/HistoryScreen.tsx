import { useNavigation } from '@react-navigation/native';
import type { LucideIcon } from 'lucide-react-native';
import { Droplets, Fuel, Route, SearchX, TriangleAlert, Wrench } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '../components/Chip';
import { ComplaintHistoryCard } from '../components/ComplaintHistoryCard';
import { EmptyState } from '../components/EmptyState';
import { ListFilters } from '../components/ListFilters';
import type { StatusOption } from '../components/ListFilters';
import { PagedList } from '../components/PagedList';
import { RouteHistoryCard } from '../components/RouteHistoryCard';
import { Select } from '../components/Select';
import { ServiceHistoryCard } from '../components/ServiceHistoryCard';
import { VEHICLE_TYPE_OPTIONS } from '../components/vehicleTypeOptions';
import { useAuth } from '../contexts/AuthContext';
import type { RootNavigation } from '../navigation/types';
import { HISTORY_PERIODS, listHistory } from '../services/history';
import type {
    HistoryFilters,
    HistoryItem,
    HistoryModule,
    HistoryPeriod,
} from '../services/history';
import { colors, spacing } from '../theme';

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

/** Key of an item in the list: the kind keeps ids of different collections apart. */
function itemKey(item: HistoryItem): string {
    return `${item.kind}-${item.id}`;
}

/**
 * History tab (RF17): five modules (Rotas, Denúncias, Abastecimentos, Trocas de óleo and
 * Manutenções), one list at a time. Fixed at the top stay the search (plate or model, and the
 * driver for the supervisor) and, under it, a row with the vehicle type select (left) and the
 * period select (right); the module chips come next and scroll away with the cards. The module,
 * the search and the selects narrow the list and combine: nothing selected in a select means
 * everything, pressing the chosen option again clears it, and they stay when the module changes.
 * The filtering is the server's
 * and the list loads a page at a time as it is scrolled (`PagedList`), so a long history is never
 * read whole. A driver sees only their own records and a supervisor everyone's, by the API rules;
 * the routes are only the finalized ones (RB10). Each module has its card (`RouteHistoryCard`,
 * `ComplaintHistoryCard` and `ServiceHistoryCard`); the pencil of a service record, only on the
 * signed-in user's own (RB17), opens the edit screen.
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
        if (item.kind === 'route') {
            return <RouteHistoryCard route={item} />;
        }

        if (item.kind === 'complaint') {
            return <ComplaintHistoryCard complaint={item} />;
        }

        return (
            <ServiceHistoryCard
                record={item}
                onEdit={
                    item.userId === user?.id
                        ? () =>
                              navigation.navigate('ServiceRecordEdit', {
                                  kind: item.kind,
                                  recordId: item.id,
                              })
                        : undefined
                }
            />
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
                {MODULES.map((item) => (
                    <Chip
                        key={item.value}
                        label={item.label}
                        selected={module === item.value}
                        onPress={() => setModule(item.value)}
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
                extraControls={
                    <>
                        <View style={styles.control}>
                            <Select
                                label="Tipo de veículo"
                                placeholder="Tipo de veículo"
                                hideLabel
                                options={VEHICLE_TYPE_OPTIONS}
                                value={type ?? undefined}
                                onChange={setType}
                                onClear={() => setType(null)}
                            />
                        </View>
                        <View style={styles.control}>
                            <Select
                                label="Período"
                                placeholder="Todo o período"
                                hideLabel
                                options={HISTORY_PERIODS}
                                value={period ?? undefined}
                                onChange={setPeriod}
                                onClear={() => setPeriod(null)}
                            />
                        </View>
                    </>
                }
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
    control: {
        flex: 1,
    },
    header: {
        paddingBottom: spacing.lg,
    },
    chips: {
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
});
