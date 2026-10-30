/// <reference path="../pb_data/types.d.ts" />

/*
 * Complaint rules that the API Rules of `complaints` cannot express (I-27). Who may file one and
 * who may review it is in the rules (migration set_complaint_rules); the hooks below hold what
 * needs the database or the server clock, and the km corrections made when a complaint is
 * approved (I-30).
 */

/*
 * A complaint is filed only while its route is `aberta` (RB11), with a km different from the
 * departure km of that route (RB11), and `route_previous` is always the server's: the route that
 * came right before it on the same vehicle, whatever its status, or empty when there is none. The
 * app never sends it, so a complaint cannot point at a route of another vehicle (RB06). Runs on
 * every create, superuser included. A route that does not exist is left to the relation validation.
 * The one-per-route rule is the unique index idx_complaints_route_current.
 */
onRecordCreate((e) => {
    let route = null;
    try {
        route = e.app.findRecordById("routes", e.record.getString("route_current"));
    } catch (err) {
        /* Missing or unknown route: the required relation field reports it. */
    }

    if (route) {
        if (route.getString("status") !== "aberta") {
            throw new BadRequestError("Failed to create record.", {
                route_current: new ValidationError("route_not_open", "A complaint can only be filed while the route is open."),
            });
        }

        /* A missing km reads as 0 and is reported as required, so 0 never counts as equal. */
        const kmComplaint = e.record.getFloat("km_complaint");
        if (kmComplaint !== 0 && kmComplaint === route.getFloat("km_departure")) {
            throw new BadRequestError("Failed to create record.", {
                km_complaint: new ValidationError("km_equals_departure", "The km must differ from the departure km of the route."),
            });
        }

        /* The route is open, so every other route of the vehicle is an earlier one. */
        const earlier = e.app.findRecordsByFilter("routes", "vehicle = {:vehicle} && id != {:id}", "-date_departure", 1, 0, {
            vehicle: route.getString("vehicle"),
            id: route.id,
        });
        e.record.set("route_previous", earlier.length > 0 ? earlier[0].id : "");
    }

    e.next();
}, "complaints");

/*
 * Reviewing a complaint (`pendente` to `aprovada` or `reprovada`) stamps `reviewed` with the server
 * clock, whatever the request sent. The rules only let a supervisor send the new status, so this
 * runs once per complaint. Runs on every request, superuser included.
 *
 * Rejecting changes no km (RB07). Approving corrects the km in the same transaction as the review,
 * so the approval and its corrections happen together or not at all (I-30):
 *  - the departure km of the route of the complaint becomes the km of the complaint (RB06);
 *  - when `route_previous` is `finalizada`, its return km becomes the same value (RB06); when there
 *    is no previous route or it is `encerrada`, no other route changes;
 *  - when that previous route is the last `finalizada` route of the vehicle, the odometer becomes
 *    the new return km (RB03, RB07).
 * A correction that would leave a route inconsistent is refused as a whole with the one code
 * `km_correction_inconsistent` on `status` (RB14), and nothing is saved: the previous route would
 * end with a return km that is not greater than its departure km (RB13), or than the km of a
 * complaint of its own that is still pending. The message says when that complaint exists, so the
 * supervisor reviews it first.
 *
 * The record is saved by the default handler that `e.next()` runs, with `e.app`. PocketBase does
 * not open a transaction around it, so `e.app` is swapped for the transactional app while the
 * handler runs and put back afterwards (the same as the finalization of a route, routes.pb.js).
 * The corrections run after the review is saved, and the refusal rolls the review back with them.
 */
onRecordUpdateRequest((e) => {
    const reviewing = e.record.original().getString("status") === "pendente" && e.record.getString("status") !== "pendente";

    if (!reviewing) {
        e.next();
        return;
    }

    e.record.set("reviewed", new DateTime());

    if (e.record.getString("status") !== "aprovada") {
        e.next();
        return;
    }

    /* Applies the corrections of an approved complaint with the transactional app. */
    const correctKm = (txApp, complaint) => {
        const kmComplaint = complaint.getFloat("km_complaint");
        const route = txApp.findRecordById("routes", complaint.getString("route_current"));
        const previousId = complaint.getString("route_previous");
        const previous = previousId ? txApp.findRecordById("routes", previousId) : null;
        const correctsPrevious = previous !== null && previous.getString("status") === "finalizada";

        const refuse = (message) => {
            throw new BadRequestError("Failed to update record.", {
                status: new ValidationError("km_correction_inconsistent", message),
            });
        };

        /* The route of the complaint, when already finalized, keeps a return km above the new departure km. */
        if (route.getString("status") === "finalizada" && route.getFloat("km_return") <= kmComplaint) {
            refuse("The correction would leave the return km of the route not greater than its departure km.");
        }

        if (correctsPrevious) {
            /* The return km of the previous route stays above its departure km and above its own pending complaint. */
            let floor = previous.getFloat("km_departure");
            const pending = txApp.findRecordsByFilter("complaints", "route_current = {:route} && status = 'pendente'", "", 1, 0, { route: previous.id });
            if (pending.length > 0) {
                floor = Math.max(floor, pending[0].getFloat("km_complaint"));
            }

            if (kmComplaint <= floor) {
                refuse(
                    "The correction would leave the return km of the previous route not greater than its departure km." +
                        (pending.length > 0 ? " The previous route has a pending complaint: review it first." : ""),
                );
            }
        }

        route.set("km_departure", kmComplaint);
        txApp.save(route);

        if (correctsPrevious) {
            previous.set("km_return", kmComplaint);
            txApp.save(previous);

            const lastFinalized = txApp.findRecordsByFilter("routes", "vehicle = {:vehicle} && status = 'finalizada'", "-date_departure", 1, 0, {
                vehicle: previous.getString("vehicle"),
            });
            if (lastFinalized.length > 0 && lastFinalized[0].id === previous.id) {
                const vehicle = txApp.findRecordById("vehicles", previous.getString("vehicle"));
                vehicle.set("odometer", kmComplaint);
                txApp.save(vehicle);
            }
        }
    };

    const requestApp = e.app;
    try {
        requestApp.runInTransaction((txApp) => {
            e.app = txApp;
            e.next();
            correctKm(txApp, e.record);
        });
    } finally {
        e.app = requestApp;
    }
}, "complaints");
