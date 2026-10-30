import { File } from 'expo-file-system';
import type { RecordModel } from 'pocketbase';

import type { ComplaintValues } from '../schemas/complaint';
import { kmEqualsDepartureMessage } from '../schemas/complaint';
import { formatKm } from '../schemas/masks';
import { fold } from './listFilters';
import { pb } from './pocketbase';
import { isNotFoundError } from './serverErrors';
import type { MessageOverrides } from './serverErrors';
import { toVehicle } from './vehicles';
import type { Vehicle } from './vehicles';

/** Situation of a complaint: waiting for the supervisor, or decided by the review (RF15). */
export type ComplaintStatus = 'pendente' | 'aprovada' | 'reprovada';

/** A complaint as the driver sees it: what was reported and where it stands. */
export type Complaint = {
    id: string;
    status: ComplaintStatus;
    kmComplaint: number;
    /** Server date of the complaint, an ISO string. */
    created: string;
    /** Server date of the review, an ISO string, or an empty string while the complaint is pending. */
    reviewed: string;
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
        reviewed: record.reviewed,
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

/** Situation of a route as the review reads it. */
type RouteStatus = 'aberta' | 'finalizada' | 'encerrada';

/** The route right before the reported one on the same vehicle, with the km a correction would touch. */
export type PreviousRoute = {
    status: RouteStatus;
    kmDeparture: number;
    kmReturn: number;
};

/** A complaint as the supervisor reviews it: what was reported, by whom, on which route and vehicle. */
export type ReviewComplaint = Complaint & {
    driverName: string;
    vehicle: Vehicle;
    /** Departure km of the reported route, the one the complaint corrects (RB06). */
    kmDeparture: number;
    /** The previous route of the vehicle (`route_previous`, set by the server), or null when there is none. */
    previous: PreviousRoute | null;
    /** Whether the previous route has a complaint of its own still pending. */
    previousPending: boolean;
};

/** Everything the review shows, expanded in one request: the driver and vehicle of the route, and the previous route. */
const REVIEW_EXPAND = 'route_current.user,route_current.vehicle,route_previous';

/**
 * Maps a `complaints` record read with `REVIEW_EXPAND` to the complaint the review screens show.
 * `pendingRouteIds` holds the routes that have a pending complaint, to tell if the previous route
 * has one.
 */
function toReviewComplaint(record: RecordModel, pendingRouteIds: Set<string>): ReviewComplaint {
    const route = record.expand?.route_current;
    const previous = record.expand?.route_previous;

    return {
        ...toComplaint(record),
        driverName: route?.expand?.user?.name ?? '',
        vehicle: toVehicle(route?.expand?.vehicle),
        kmDeparture: route?.km_departure ?? 0,
        previous: previous
            ? {
                  status: previous.status,
                  kmDeparture: previous.km_departure,
                  kmReturn: previous.km_return,
              }
            : null,
        previousPending: previous ? pendingRouteIds.has(previous.id) : false,
    };
}

/**
 * Lists the complaints of the review module (RF15): the pending ones first, oldest first because
 * those are the ones waiting longest, and then the reviewed ones, the latest review first. Only a
 * supervisor sees the complaints of every driver.
 */
export async function listReviewComplaints(): Promise<ReviewComplaint[]> {
    const records = await pb
        .collection('complaints')
        .getFullList({ sort: 'created', expand: REVIEW_EXPAND });
    const pendingRouteIds = new Set(
        records.filter((record) => record.status === 'pendente').map((r) => r.route_current),
    );
    const complaints = records.map((record) => toReviewComplaint(record, pendingRouteIds));

    return [
        ...complaints.filter((complaint) => complaint.status === 'pendente'),
        ...complaints
            .filter((complaint) => complaint.status !== 'pendente')
            .sort((a, b) => b.reviewed.localeCompare(a.reviewed)),
    ];
}

/** Loads one complaint for the review detail. The server answers 404 for one the caller cannot see. */
export async function getReviewComplaint(id: string): Promise<ReviewComplaint> {
    const record = await pb.collection('complaints').getOne(id, { expand: REVIEW_EXPAND });
    const previousId: string = record.expand?.route_previous?.id ?? '';
    const pending = previousId
        ? await pb.collection('complaints').getList(1, 1, {
              filter: pb.filter('route_current = {:previousId} && status = "pendente"', {
                  previousId,
              }),
          })
        : null;

    return toReviewComplaint(
        record,
        new Set(pending && pending.totalItems > 0 ? [previousId] : []),
    );
}

/** Situation filter of the review list: every complaint, only the pending ones or only the reviewed ones. */
export type ReviewStatusFilter = 'all' | 'pendente' | 'revisada';

/**
 * Narrows the loaded list by situation and by a search text that must appear in the driver's
 * name, the plate or the model of the vehicle, ignoring case and accents. It works on what the
 * list already holds, so typing sends no request. The hyphen of the plate is optional in the
 * text: "abc1d" finds ABC-1D23.
 */
export function filterReviewComplaints(
    complaints: ReviewComplaint[],
    query: string,
    status: ReviewStatusFilter,
): ReviewComplaint[] {
    const term = fold(query.trim());
    const plateTerm = term.replace('-', '');

    return complaints.filter((complaint) => {
        if (status === 'pendente' && complaint.status !== 'pendente') {
            return false;
        }
        if (status === 'revisada' && complaint.status === 'pendente') {
            return false;
        }

        return (
            term === '' ||
            fold(complaint.driverName).includes(term) ||
            (plateTerm !== '' &&
                fold(complaint.vehicle.plate).replace('-', '').includes(plateTerm)) ||
            fold(complaint.vehicle.model).includes(term)
        );
    });
}

/** Counts the pending complaints of every driver, for the badge of the review card (supervisor only). */
export async function countPendingComplaints(): Promise<number> {
    const { totalItems } = await pb.collection('complaints').getList(1, 1, {
        filter: 'status = "pendente"',
    });

    return totalItems;
}

/**
 * Tells why approving the complaint would be refused by the server (RB14), or null when it would
 * not. Approving corrects the departure km of the reported route to the km informed (RB06) and,
 * when the previous route of the vehicle is `finalizada`, its return km to the same value; that
 * return must stay above the departure km of the previous route. The app checks it first, with
 * the km the supervisor already reads, so the button can be off with the reason written on the
 * screen; the server stays the rule, and answers the same if the data changed in the meantime.
 * When the previous route has a complaint of its own pending, the message says to review it
 * first, since approving that one can change the departure km this check reads.
 */
export function approvalBlockedReason(complaint: ReviewComplaint): string | null {
    const { previous } = complaint;

    if (!previous || previous.status !== 'finalizada') {
        return null;
    }
    if (complaint.kmComplaint > previous.kmDeparture) {
        return null;
    }

    const reason = `O km informado (${formatKm(complaint.kmComplaint)}) não é maior que o km de saída da rota anterior do veículo (${formatKm(previous.kmDeparture)}). A aprovação tornaria o km de retorno dessa rota menor ou igual ao de saída.`;

    return complaint.previousPending
        ? `${reason} A rota anterior possui denúncia pendente, que pode alterar esse km de saída: revise-a primeiro. Neste momento, apenas a reprovação está disponível.`
        : `${reason} Apenas a reprovação está disponível.`;
}

/**
 * Reviews a pending complaint (RF15). Only the status is sent: the server stamps the review date
 * and, on approval, applies the km corrections in the same transaction (RB06, RB07, I-30). The
 * update rule lets only a supervisor do it, and only on a `pendente` complaint, so one that was
 * already reviewed by someone else answers 404.
 */
export async function reviewComplaint(
    complaintId: string,
    status: Exclude<ComplaintStatus, 'pendente'>,
): Promise<void> {
    await pb.collection('complaints').update(complaintId, { status });
}
