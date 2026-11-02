import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { parseServerError } from '../services/serverErrors';
import { colors, fontFamily, fontSize, spacing } from '../theme';
import { Button } from './Button';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

/** One page of a list, and whether there are more after it. */
export type Page<T> = { items: T[]; hasMore: boolean };

/**
 * Props of PagedList. `queryKey` names the query behind the list: when it changes the list starts
 * over from the first page. `loadPage` reads a page of that query (it always sees the latest
 * filters of the screen). `header` scrolls with the list, and `emptyState` shows when the query
 * has no results.
 */
export type PagedListProps<T> = {
    queryKey: string;
    loadPage: (page: number) => Promise<Page<T>>;
    keyExtractor: (item: T) => string;
    renderItem: (item: T) => ReactElement;
    header?: ReactElement;
    emptyState: ReactNode;
    errorTitle: string;
};

/**
 * What the list holds for the query named by `key`: the first request in progress, its failure,
 * or the pages loaded so far.
 */
type State<T> = { key: string } & (
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | {
          status: 'ready';
          items: T[];
          /** How many pages are loaded. */
          pages: number;
          hasMore: boolean;
          loadingMore: boolean;
          /** The last request for a further page failed; the footer offers to try again. */
          moreFailed: boolean;
      }
);

/**
 * List that loads a page at a time and asks for the next one as the end nears (RF17), shared by
 * the history modules. A new `queryKey` clears the list and starts over; a response that arrives
 * after the query changed is dropped. The list is read again each time the screen gets focus
 * (pages already loaded, in place), so an edit just saved is there when its screen goes back.
 * While it loads, fails or has nothing to show, the state takes the place of the cards under the
 * header, so the filters stay on screen.
 */
export function PagedList<T>({
    queryKey,
    loadPage,
    keyExtractor,
    renderItem,
    header,
    emptyState,
    errorTitle,
}: PagedListProps<T>) {
    const [state, setState] = useState<State<T>>({ key: queryKey, status: 'loading' });
    /* What belongs to the query in use: a state of an older query shows as loading. */
    const view: State<T> = state.key === queryKey ? state : { key: queryKey, status: 'loading' };

    /* The latest values, for the callbacks that outlive a render. */
    const latest = useRef({ state, queryKey, loadPage });
    useEffect(() => {
        latest.current = { state, queryKey, loadPage };
    });
    /* Identifies the current request: a response of an older one is ignored. */
    const requestId = useRef(0);
    const loadingMore = useRef(false);
    const loadedOnce = useRef(false);

    const reset = useCallback(async (key: string) => {
        const id = ++requestId.current;

        try {
            const first = await latest.current.loadPage(1);
            if (id !== requestId.current) {
                return;
            }
            loadedOnce.current = true;
            setState({
                key,
                status: 'ready',
                items: first.items,
                pages: 1,
                hasMore: first.hasMore,
                loadingMore: false,
                moreFailed: false,
            });
        } catch (error) {
            if (id === requestId.current) {
                setState({ key, status: 'error', message: parseServerError(error).form ?? '' });
            }
        }
    }, []);

    useEffect(() => {
        reset(queryKey);
    }, [queryKey, reset]);

    /* Asks for the next page. After a failure only the retry button (`retry`) asks again. */
    const loadMore = useCallback(
        async (retry = false) => {
            const { state: current, queryKey: key } = latest.current;
            if (
                current.key !== key ||
                current.status !== 'ready' ||
                !current.hasMore ||
                loadingMore.current ||
                (current.moreFailed && !retry)
            ) {
                return;
            }

            const id = requestId.current;
            loadingMore.current = true;
            setState({ ...current, loadingMore: true, moreFailed: false });

            try {
                const next = await latest.current.loadPage(current.pages + 1);
                if (id !== requestId.current) {
                    return;
                }
                /* A record added meanwhile shifts the pages, so one may come twice. */
                const known = new Set(current.items.map(keyExtractor));
                setState({
                    ...current,
                    items: [
                        ...current.items,
                        ...next.items.filter((item) => !known.has(keyExtractor(item))),
                    ],
                    pages: current.pages + 1,
                    hasMore: next.hasMore,
                    loadingMore: false,
                    moreFailed: false,
                });
            } catch {
                if (id === requestId.current) {
                    setState({ ...current, loadingMore: false, moreFailed: true });
                }
            } finally {
                loadingMore.current = false;
            }
        },
        [keyExtractor],
    );

    /* Reads the loaded pages again in place; a failure keeps what is on screen. */
    const refresh = useCallback(async () => {
        const { state: current, queryKey: key } = latest.current;
        if (current.key !== key || current.status !== 'ready') {
            return;
        }

        const id = ++requestId.current;

        try {
            const pages = await Promise.all(
                Array.from({ length: current.pages }, (_, index) =>
                    latest.current.loadPage(index + 1),
                ),
            );
            if (id !== requestId.current) {
                return;
            }
            setState({
                ...current,
                items: pages.flatMap((page) => page.items),
                hasMore: pages[pages.length - 1].hasMore,
                loadingMore: false,
                moreFailed: false,
            });
        } catch {
            if (id === requestId.current) {
                setState({ ...current, loadingMore: false });
            }
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            /* The first load belongs to the query effect. */
            if (loadedOnce.current) {
                refresh();
            }
        }, [refresh]),
    );

    function retryFirstPage() {
        setState({ key: queryKey, status: 'loading' });
        reset(queryKey);
    }

    function renderEmpty() {
        if (view.status === 'loading') {
            return <LoadingState />;
        }

        if (view.status === 'error') {
            return (
                <ErrorState title={errorTitle} message={view.message} onRetry={retryFirstPage} />
            );
        }

        return emptyState;
    }

    function renderFooter() {
        if (view.status !== 'ready') {
            return undefined;
        }

        if (view.loadingMore) {
            return <ActivityIndicator style={styles.footer} color={colors.primary} />;
        }

        if (view.moreFailed) {
            return (
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Não foi possível carregar mais registros.</Text>
                    <Button
                        title="Tentar novamente"
                        variant="outline"
                        onPress={() => loadMore(true)}
                    />
                </View>
            );
        }

        return undefined;
    }

    return (
        <FlatList
            data={view.status === 'ready' ? view.items : []}
            keyExtractor={keyExtractor}
            renderItem={({ item }) => <View style={styles.row}>{renderItem(item)}</View>}
            ListHeaderComponent={header}
            ListEmptyComponent={<View style={styles.empty}>{renderEmpty()}</View>}
            ListFooterComponent={renderFooter()}
            ItemSeparatorComponent={Separator}
            onEndReached={() => loadMore()}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.content}
        />
    );
}

/** Space between two cards. */
function Separator() {
    return <View style={styles.separator} />;
}

/** Styles of PagedList: the content grows to the screen, so the state under the header is centered. */
const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        paddingBottom: spacing.lg,
    },
    row: {
        paddingHorizontal: spacing.lg,
    },
    separator: {
        height: spacing.md,
    },
    empty: {
        flex: 1,
    },
    footer: {
        gap: spacing.md,
        padding: spacing.lg,
    },
    footerText: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        textAlign: 'center',
    },
});
