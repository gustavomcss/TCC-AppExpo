/** Situation filter shared by the management lists (drivers and vehicles). */
export type StatusFilter = 'all' | 'active' | 'inactive';

/** Lowercase text without accents, so "jose" finds "José" and "JOSÉ". */
export function fold(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Whether an item with this situation passes the situation filter. */
export function matchesStatus(active: boolean, status: StatusFilter): boolean {
    return status === 'all' || (status === 'active' ? active : !active);
}
