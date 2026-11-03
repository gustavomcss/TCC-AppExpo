import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { StatusFilter } from '../services/listFilters';
import { colors, sizes, spacing } from '../theme';
import { Chip } from './Chip';
import { Input } from './Input';

/** One option of the situation filter: its value and the text of its chip. */
export type StatusOption<T extends string> = { value: T; label: string };

/**
 * Props of ListFilters: the search text and the situation filter, both held by the screen, and
 * an optional second row of chips for a filter that combines with it (the vehicle types). The
 * situation options default to Todos, Ativos and Inativos; a list whose items have another
 * situation (the routes: open or closed) gives its own `statusOptions`.
 */
export type ListFiltersProps<T extends string = StatusFilter> = {
    searchLabel: string;
    searchPlaceholder: string;
    query: string;
    onQueryChange: (query: string) => void;
    status?: T;
    onStatusChange?: (status: T) => void;
    statusOptions?: readonly StatusOption<T>[];
    extraRow?: ReactNode;
    extraControls?: ReactNode;
};

/** Options of the default situation filter, in the order the chips appear. */
const ACTIVE_FILTERS: readonly StatusOption<StatusFilter>[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'inactive', label: 'Inativos' },
];

/**
 * Search field (with a button to clear it) over the chips Todos, Ativos and Inativos (or the
 * given situation options), shared by the lists, and an optional second row for another filter,
 * so filters that combine sit on separate rows. Each row of chips scrolls sideways when they do
 * not fit. `extraControls` adds a row of the screen's own controls right under the search field,
 * side by side and sharing the width equally (the selects of the history). A screen that keeps
 * the situation chips elsewhere (the history, in its list) leaves out `onStatusChange`, and they
 * are not drawn. It only holds the controls: each screen narrows its own list with them.
 */
export function ListFilters<T extends string = StatusFilter>({
    searchLabel,
    searchPlaceholder,
    query,
    onQueryChange,
    status,
    onStatusChange,
    statusOptions = ACTIVE_FILTERS as readonly StatusOption<string>[] as readonly StatusOption<T>[],
    extraRow,
    extraControls,
}: ListFiltersProps<T>) {
    return (
        <View style={styles.filters}>
            <View>
                <Input
                    accessibilityLabel={searchLabel}
                    placeholder={searchPlaceholder}
                    value={query}
                    onChangeText={onQueryChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    style={query !== '' && styles.searchWithClear}
                />
                {query !== '' && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Limpar busca"
                        onPress={() => onQueryChange('')}
                        style={styles.clear}
                    >
                        <X color={colors.mutedForeground} size={20} />
                    </Pressable>
                )}
            </View>
            {extraControls && <View style={styles.controls}>{extraControls}</View>}
            {onStatusChange && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    style={styles.chipsScroll}
                    contentContainerStyle={styles.chips}
                >
                    {statusOptions.map((filter) => (
                        <Chip
                            key={filter.value}
                            label={filter.label}
                            selected={status === filter.value}
                            onPress={() => onStatusChange(filter.value)}
                        />
                    ))}
                </ScrollView>
            )}
            {extraRow && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    style={styles.chipsScroll}
                    contentContainerStyle={styles.chips}
                >
                    {extraRow}
                </ScrollView>
            )}
        </View>
    );
}

/**
 * Styles of the filters: the search field over the rows of chips, with the list's side padding. The
 * bottom padding is the gap to the list, which has none at the top: it stays between them while
 * the cards scroll under the edge of the list.
 */
const styles = StyleSheet.create({
    filters: {
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
    },
    searchWithClear: {
        paddingRight: sizes.control,
    },
    clear: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: sizes.control,
        height: sizes.control,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipsScroll: {
        marginHorizontal: -spacing.lg,
        flexGrow: 0,
    },
    chips: {
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    controls: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
});
