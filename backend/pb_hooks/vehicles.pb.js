/// <reference path="../pb_data/types.d.ts" />

/*
 * Rules of vehicle creation that the field definitions cannot express (I-08).
 *
 * The initial odometer (RB03) must be sent as a number. The field is not required, because
 * PocketBase rejects 0 on a required number and a new vehicle may have 0 km, so without this a
 * missing value would be stored as 0. PocketBase also turns null, "" and text into 0 on a number
 * field before any hook runs, so a JSON body is read here as it arrived. This applies to every
 * request.
 *
 * A vehicle registered by a user is always active: inactivating is an edit (RB12), never a way to
 * create one. Requests made as superuser keep the value they send.
 */
onRecordCreateRequest((e) => {
    /*
     * A JSON body is parsed again here. For form data, a field that was sent is read as the raw
     * string of the form, and one that is absent stays undefined.
     */
    let odometer;
    try {
        odometer = JSON.parse(toString(e.requestEvent.request.body))["odometer"];
    } catch (err) {
        odometer = e.requestInfo().body["odometer"] === undefined ? undefined : e.requestEvent.request.formValue("odometer");
    }
    let error = null;

    if (odometer === undefined || odometer === null || odometer === "") {
        error = new ValidationError("validation_required", "Cannot be blank.");
    } else if (!(typeof odometer === "number" || (typeof odometer === "string" && /^-?\d+(\.\d+)?$/.test(odometer)))) {
        error = new ValidationError("validation_invalid_value", "Must be a number.");
    }

    if (error) {
        throw new BadRequestError("Failed to create record.", { odometer: error });
    }

    if (e.auth && !e.hasSuperuserAuth()) {
        e.record.set("active", true);
    }

    e.next();
}, "vehicles");
