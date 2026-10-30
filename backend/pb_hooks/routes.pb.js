/// <reference path="../pb_data/types.d.ts" />

/*
 * Route rules that the API Rules of `routes` cannot express (I-18). Who may create, finalize or
 * close a route is in the rules (migration set_route_rules); the hooks below hold what needs the
 * database or the server clock.
 */

/*
 * The departure km (RB03) must be sent as a number. The field is not required, because PocketBase
 * rejects 0 on a required number and a route may start at 0 km, so without this a missing value
 * would be stored as 0. PocketBase also turns null, "" and text into 0 on a number field before
 * any hook runs, so a JSON body is read here as it arrived. This applies to every request.
 */
onRecordCreateRequest((e) => {
    /*
     * A JSON body is parsed again here. For form data, a field that was sent is read as the raw
     * string of the form, and one that is absent stays undefined.
     */
    let kmDeparture;
    try {
        kmDeparture = JSON.parse(toString(e.requestEvent.request.body))["km_departure"];
    } catch (err) {
        kmDeparture = e.requestInfo().body["km_departure"] === undefined ? undefined : e.requestEvent.request.formValue("km_departure");
    }
    let error = null;

    if (kmDeparture === undefined || kmDeparture === null || kmDeparture === "") {
        error = new ValidationError("validation_required", "Cannot be blank.");
    } else if (!(typeof kmDeparture === "number" || (typeof kmDeparture === "string" && /^-?\d+(\.\d+)?$/.test(kmDeparture)))) {
        error = new ValidationError("validation_invalid_value", "Must be a number.");
    }

    if (error) {
        throw new BadRequestError("Failed to create record.", { km_departure: error });
    }

    e.next();
}, "routes");

/*
 * At most one open route per vehicle (RB01) and per driver (RB02), and no route on an inactive
 * vehicle (RB12). Runs after the author hook has set `user`, on every create, superuser included,
 * and counts only `aberta` routes, so a `finalizada` or `encerrada` one never blocks. The unique
 * indexes idx_routes_open_vehicle and idx_routes_open_user (migration set_route_rules) are the
 * guarantee against two requests racing; this hook only gives the request a clear answer.
 */
onRecordCreate((e) => {
    if (e.record.getString("status") === "aberta") {
        const checks = [
            ["vehicle", "vehicle_in_open_route", "The vehicle already has an open route."],
            ["user", "user_in_open_route", "The driver already has an open route."],
        ];

        for (const [field, code, message] of checks) {
            const filter = $dbx.hashExp({ [field]: e.record.getString(field), status: "aberta" });
            if (e.app.countRecords("routes", filter) > 0) {
                throw new BadRequestError("Failed to create record.", { [field]: new ValidationError(code, message) });
            }
        }

        const vehicle = e.app.findRecordById("vehicles", e.record.getString("vehicle"));
        if (!vehicle.getBool("active")) {
            throw new BadRequestError("Failed to create record.", {
                vehicle: new ValidationError("vehicle_inactive", "An inactive vehicle cannot start a route."),
            });
        }
    }

    e.next();
}, "routes");

/*
 * A finalized route has a return km greater than the departure km (RB13). Checked on every save of
 * a `finalizada` route, so a later correction of either km (I-30) cannot break it either. While the
 * route has a `pendente` complaint (RB05), the return km must also be greater than the complaint km:
 * whichever way the review goes, the route then stays consistent (approving moves the departure km
 * to the complaint km, rejecting leaves it where it is).
 */
onRecordValidate((e) => {
    if (e.record.getString("status") === "finalizada") {
        const kmReturn = e.record.getFloat("km_return");
        let floor = e.record.getFloat("km_departure");

        if (kmReturn > floor) {
            const pending = e.app.findRecordsByFilter("complaints", "route_current = {:route} && status = 'pendente'", "", 1, 0, { route: e.record.id });
            if (pending.length > 0) {
                floor = Math.max(floor, pending[0].getFloat("km_complaint"));
            }
        }

        if (kmReturn <= floor) {
            throw new BadRequestError("Failed to validate record.", {
                km_return: new ValidationError("km_return_not_greater", "The return km must be greater than the departure km."),
            });
        }
    }

    e.next();
}, "routes");

/*
 * Finalizing a route (`aberta` to `finalizada`, RB17) stamps `date_return` with the server clock,
 * whatever the request sent, and makes the return km the current km of the vehicle (RB03). The
 * route and the vehicle are saved in one transaction, so if the vehicle cannot be saved the route
 * stays open and the odometer is never out of step with the last finalized route. Closing a route
 * administratively (`encerrada`, RB15) touches no km, so the odometer stays, and it is refused while
 * the route has a pending complaint (RB21, I-30). The odometer is never written by a request
 * (RB09); this hook and the approval of a complaint (complaints.pb.js) are the only writers. Runs
 * on every request, superuser included.
 *
 * The record is saved by the default handler that `e.next()` runs, with `e.app`. PocketBase does
 * not open a transaction around it, so `e.app` is swapped for the transactional app while the
 * handler runs and put back afterwards.
 */
onRecordUpdateRequest((e) => {
    const original = e.record.original();
    const finalizing = original.getString("status") === "aberta" && e.record.getString("status") === "finalizada";
    const closing = original.getString("status") === "aberta" && e.record.getString("status") === "encerrada";

    /*
     * A route with a pending complaint is not closed (RB21): the complaint is reviewed first, so
     * no pending complaint is left on a closed route and the review queue holds no route without
     * a return. Rejecting is always possible while the route is open, so there is no dead end.
     */
    if (closing && e.app.countRecords("complaints", $dbx.hashExp({ route_current: e.record.id, status: "pendente" })) > 0) {
        throw new BadRequestError("Failed to update record.", {
            status: new ValidationError("route_has_pending_complaint", "The route has a pending complaint. Review it before closing the route."),
        });
    }

    if (!finalizing) {
        e.next();
        return;
    }

    e.record.set("date_return", new DateTime());

    const requestApp = e.app;
    try {
        requestApp.runInTransaction((txApp) => {
            e.app = txApp;
            e.next();

            const vehicle = txApp.findRecordById("vehicles", e.record.getString("vehicle"));
            vehicle.set("odometer", e.record.getFloat("km_return"));
            txApp.save(vehicle);
        });
    } finally {
        e.app = requestApp;
    }
}, "routes");
