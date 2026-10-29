import { File } from 'expo-file-system';
import type { RecordModel } from 'pocketbase';

import type { ComplaintValues } from '../schemas/complaint';
import { kmEqualsDepartureMessage } from '../schemas/complaint';
import { pb } from './pocketbase';
import { isNotFoundError } from './serverErrors';
import type { MessageOverrides } from './serverErrors';

/** Situation of a complaint: waiting for the supervisor, or decided by the review (RF15). */
export type ComplaintStatus = 'pendente' | 'aprovada' | 'reprovada';

/** A complaint as the driver sees it: what was reported and where it stands. */
export type Complaint = {
    id: string;
    status: ComplaintStatus;
    kmComplaint: number;
    /** Server date of the complaint, an ISO string. */
    created: string;
    /** Address of the photo of the odometer. */
    photoUrl: string;
};

/** Maps a `complaints` record to the complaint the screens show. */
function toComplaint(record: RecordModel): Complaint {
    return {
        id: record.id,
        status: record.status,
        kmComplaint: record.km_complaint,
        created: record.created,
        photoUrl: record.photo ? pb.files.getURL(record, record.photo) : '',
    };
}

/**
 * Messages of the complaint form that are more specific than the default translation of a code.
 * The limit of the photo is the one of the `complaints` collection, not the one of a profile photo.
 */
export function complaintMessageOverrides(kmDeparture: number): MessageOverrides {
    return {
        km_complaint: {
            km_equals_departure: kmEqualsDepartureMessage(kmDeparture),
        },
        photo: {
            validation_file_size_limit: 'A imagem é grande demais. O limite é 10 MB.',
        },
    };
}

/**
 * Reads the complaint of a route, or null when there is none (RB11 allows at most one). The
 * server answers 404 for the first list item that does not exist.
 */
export async function getRouteComplaint(routeId: string): Promise<Complaint | null> {
    try {
        const record = await pb
            .collection('complaints')
            .getFirstListItem(pb.filter('route_current = {:routeId}', { routeId }));

        return toComplaint(record);
    } catch (error) {
        if (isNotFoundError(error)) {
            return null;
        }
        throw error;
    }
}

/**
 * Reads the complaint of the open route of the driver, for the badge of the Services card, or
 * null when there is none. The filter names the user because a supervisor sees every complaint.
 * A complaint belongs to its route: once the route is finalized the badge is gone.
 */
export async function getOpenRouteComplaint(userId: string): Promise<Complaint | null> {
    const { items } = await pb.collection('complaints').getList(1, 1, {
        filter: pb.filter('route_current.user = {:userId} && route_current.status = "aberta"', {
            userId,
        }),
    });

    return items[0] ? toComplaint(items[0]) : null;
}

/**
 * Files a complaint on the open route (RF14). It goes as multipart, because of the photo, which
 * is read from the device as a `File` of expo-file-system (the global fetch of Expo does not
 * read a `{ uri, name, type }` object). The status is `pendente`, as the create rule demands;
 * the date is the server's, and `route_previous` is filled in by the server (RB06), so neither
 * is sent. The server refuses a second complaint on the route (`validation_not_unique` on
 * `route_current`), a route that is not open (`route_not_open`) and a km equal to the departure
 * km (`km_equals_departure`).
 */
export async function createComplaint(routeId: string, values: ComplaintValues): Promise<void> {
    const body = new FormData();
    body.append('route_current', routeId);
    body.append('km_complaint', String(values.km_complaint));
    body.append('status', 'pendente');
    body.append('photo', new File(values.photo.uri) as unknown as Blob);

    await pb.collection('complaints').create(body);
}
