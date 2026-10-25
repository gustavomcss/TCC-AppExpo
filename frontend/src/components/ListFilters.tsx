import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { StatusFilter } from '../services/listFilters';
import { colors, sizes, spacing } from '../theme';
import { Chip } from './Chip';
import { Input } from './Input';

/**
 * Props of ListFilters: the search text and the situation filter, both held by the screen, and
 * optional extra chips that a list adds after the situation ones (the vehicle types).
 */
export type ListFiltersProps = {
    searchLabel: string;
    searchPlaceholder: string;
    query: string;
    onQueryChange: (query: string) => void;
    status: StatusFilter;
    onStatusChange: (status: StatusFilter) => void;
    extraChips?: ReactNode;
};

/** Options of the situation filter, in the order the chips appear. */
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'inactive', label: 'Inativos' },
];

/**
 * Search field (with a button to clear it) over the chips Todos, Ativos and Inativos, shared by
 * the management lists, with room for more chips after them. The row of chips scrolls sideways
 * when they do not fit. It only holds the controls: each screen narrows its own list with them.
 */
export function ListFilters({
    searchLabel,
    searchPlaceholder,
    query,
    onQueryChange,
    status,
    onStatusChange,
    extraChips,
}: ListFiltersProps) {
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
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.chipsScroll}
                contentContainerStyle={styles.chips}
            >
                {STATUS_FILTERS.map((filter) => (
                    <Chip
                        key={filter.value}
                        label={filter.label}
                        selected={status === filter.value}
                        onPress={() => onStatusChange(filter.value)}
                    />
                ))}
                {extraChips}
            </ScrollView>
        </View>
    );
}

/** Styles of the filters: the search field over a row of chips, with the list's side padding. */
const styles = StyleSheet.create({
    filters: {
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
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
});
