/**
 * Paging over lists that are the concatenation of ordered queries, with no dependency of its own so
 * the same code runs in the app and in the backend tests.
 */

/** How many items each request of the supervisor's lists brings (the same as the history). */
export const LIST_PAGE_SIZE = 10;

/** One query of a list: a server filter and a server sort. */
export type Segment = { filter: string; sort: string };

/** One page of a list, and whether there are more items after it. */
export type SegmentedPage<T> = { items: T[]; hasMore: boolean };

/** Reads page `page` of `perPage` items of one segment; `totalItems` counts the whole segment. */
export type SegmentReader<T> = (
    segment: Segment,
    page: number,
    perPage: number,
) => Promise<{ items: T[]; totalItems: number }>;

/**
 * Reads one page of a list made of segments in sequence, each in its own order: the route closure
 * lists the open routes oldest first and then the closed ones newest first, and the review lists
 * the pending complaints oldest first and then the reviewed ones latest first. A single sort on the
 * server cannot express that (the situations do not sort in the order wanted), so the list is the
 * first segment followed by the second, and the page is a window of that sequence.
 *
 * The window starts at `(page - 1) * pageSize`. Each segment is read in pages of `pageSize` from
 * the page the window starts in, so a page that lies inside one segment costs one request; a page
 * that crosses from one segment to the next costs a few more (the end of the first and the start
 * of the second). `hasMore` is true when anything lies after the window; when the window ends
 * exactly at the end of a segment, the following segments are counted with one-item requests.
 * A record added meanwhile can shift the pages, so the caller removes repeated items (PagedList
 * does).
 */
export async function readSegmentedPage<T>(
    segments: readonly Segment[],
    page: number,
    pageSize: number,
    read: SegmentReader<T>,
): Promise<SegmentedPage<T>> {
    const items: T[] = [];
    /* Items of the sequence still to skip before the window starts. */
    let skip = (page - 1) * pageSize;
    let hasMore = false;
    /* Index of the first segment not looked at, once the window is full. */
    let rest = segments.length;

    for (let index = 0; index < segments.length; index++) {
        const first = Math.floor(skip / pageSize) + 1;
        const head = await read(segments[index], first, pageSize);

        /* The window starts after this whole segment. */
        if (skip >= head.totalItems) {
            skip -= head.totalItems;
            continue;
        }

        const need = pageSize - items.length;
        const offset = skip - (first - 1) * pageSize;
        let rows = head.items;

        /* A window that does not start on a page boundary reaches into the next page. */
        if (offset + need > rows.length && first * pageSize < head.totalItems) {
            rows = rows.concat((await read(segments[index], first + 1, pageSize)).items);
        }

        const taken = rows.slice(offset, offset + need);
        items.push(...taken);
        const end = skip + taken.length;
        skip = 0;

        if (items.length === pageSize) {
            hasMore = end < head.totalItems;
            rest = index + 1;
            break;
        }
    }

    for (let index = rest; !hasMore && index < segments.length; index++) {
        hasMore = (await read(segments[index], 1, 1)).totalItems > 0;
    }

    return { items, hasMore };
}
