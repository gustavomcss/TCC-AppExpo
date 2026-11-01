import type { RecordModel } from 'pocketbase';

import type { FuelValues } from '../schemas/fuel';
import { pb } from './pocketbase';

/** The three kinds of service record: fueling, oil change and repair at a workshop. */
export type ServiceKind = 'fuel' | 'oil' | 'repair';

/** Fields every service record has, with the vehicle and the author already expanded. */
type BaseRecord = {
    id: string;
    /** Id of the author, to tell the records of the signed-in user (RB17). */
    userId: string;
    authorName: string;
    vehicle: { plate: string; model: string };
    km: number;
    cost: number;
    /** Creation date, set by the server (RNF05). */
    created: string;
};

/** A fueling as the edit screen and the history show it. */
export type FuelRecord = BaseRecord & {
    kind: 'fuel';
    type: FuelValues['type'];
    liters: number;
};

/** An oil change as the edit screen and the history show it. */
export type OilRecord = BaseRecord & { kind: 'oil'; type: string };

/** A repair as the edit screen and the history show it. */
export type RepairRecord = BaseRecord & { kind: 'repair'; description: string };

/** Any service record. */
export type ServiceRecord = FuelRecord | OilRecord | RepairRecord;

/** Collection and km field of each kind, in the names the server uses. */
const COLLECTIONS = {
    fuel: { name: 'fuels', km: 'km_fuel' },
    oil: { name: 'oils', km: 'km_oil' },
    repair: { name: 'repairs', km: 'km_repair' },
} as const;

/** Relations read with every record: the vehicle and the author. */
const EXPAND = 'vehicle,user';

/** Maps a record of `fuels`, `oils` or `repairs`, read with `EXPAND`, to the app's shape. */
function toServiceRecord(kind: ServiceKind, record: RecordModel): ServiceRecord {
    const base: BaseRecord = {
        id: record.id,
        userId: record.user,
        authorName: record.expand?.user?.name ?? '',
        vehicle: {
            plate: record.expand?.vehicle?.plate ?? '',
            model: record.expand?.vehicle?.model ?? '',
        },
        km: record[COLLECTIONS[kind].km],
        cost: record.cost,
        created: record.created,
    };

    switch (kind) {
        case 'fuel':
            return { ...base, kind, type: record.type, liters: record.liters };
        case 'oil':
            return { ...base, kind, type: record.type };
        case 'repair':
            return { ...base, kind, description: record.description };
    }
}

/** Loads one service record for the edit screen. A record the user cannot read is a 404. */
export async function getServiceRecord(kind: ServiceKind, id: string): Promise<ServiceRecord> {
    const record = await pb.collection(COLLECTIONS[kind].name).getOne(id, { expand: EXPAND });

    return toServiceRecord(kind, record);
}

/**
 * Lists the fuelings, oil changes and repairs the user can read, the latest first: a driver gets
 * only their own, a supervisor everyone's (RF17). Provisional, until the history lists (I-33 and
 * I-35) bring the filters and the incremental loading.
 */
export async function listServiceRecords(): Promise<ServiceRecord[]> {
    const kinds = Object.keys(COLLECTIONS) as ServiceKind[];
    const lists = await Promise.all(
        kinds.map(async (kind) => {
            const records = await pb
                .collection(COLLECTIONS[kind].name)
                .getFullList({ expand: EXPAND, sort: '-created' });

            return records.map((record) => toServiceRecord(kind, record));
        }),
    );

    return lists.flat().sort((a, b) => b.created.localeCompare(a.created));
}
