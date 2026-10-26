/// <reference path="../pb_data/types.d.ts" />

/*
 * Creation rules of the service records, fuels, oils and repairs (I-19). Who may create one is in
 * the API Rules (migration set_base_api_rules): any active driver or supervisor. The author is set
 * by pb_hooks/author.pb.js, `created` by the server (RNF05), and the km of a record is only
 * informative, so nothing here touches the odometer of the vehicle (RB04, RB09).
 */

/*
 * A service record cannot be created for an inactive vehicle (RB12). An inactive vehicle leaves
 * the selections but keeps its history, so records already saved are not affected. Runs on every
 * create, superuser included. A vehicle that does not exist is left to the relation validation.
 */
onRecordCreate((e) => {
    let vehicle = null;
    try {
        vehicle = e.app.findRecordById("vehicles", e.record.getString("vehicle"));
    } catch (err) {
        /* Missing or unknown vehicle: the required relation field reports it. */
    }

    if (vehicle && !vehicle.getBool("active")) {
        throw new BadRequestError("Failed to create record.", {
            vehicle: new ValidationError("vehicle_inactive", "A service record cannot be created for an inactive vehicle."),
        });
    }

    e.next();
}, "fuels", "oils", "repairs");
