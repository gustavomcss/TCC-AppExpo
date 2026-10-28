/// <reference path="../pb_data/types.d.ts" />

/*
 * Complaint rules that the API Rules of `complaints` cannot express (I-27). Who may file one and
 * who may review it is in the rules (migration set_complaint_rules); the hooks below hold what
 * needs the database or the server clock. The km corrections made when a complaint is approved
 * are I-30.
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
 */
onRecordUpdateRequest((e) => {
    if (e.record.original().getString("status") === "pendente" && e.record.getString("status") !== "pendente") {
        e.record.set("reviewed", new DateTime());
    }

    e.next();
}, "complaints");
