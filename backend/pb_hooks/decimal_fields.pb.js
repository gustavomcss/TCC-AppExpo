/// <reference path="../pb_data/types.d.ts" />

/*
 * RB16: km and money values accept at most two decimal places. Runs on every create and update
 * of the data collections. The 0..999999.99 range is enforced by the number field itself.
 */
onRecordValidate((e) => {
    const fields = e.record.collection().fields;
    const errors = {};

    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        if (field.type() !== "number") {
            continue;
        }

        /* Scale to cents and compare with a tolerance to absorb floating point error. */
        const cents = e.record.getFloat(field.getName()) * 100;
        if (Math.abs(cents - Math.round(cents)) > 1e-6) {
            errors[field.getName()] = new ValidationError("validation_too_many_decimals", "Use at most two decimal places.");
        }
    }

    if (Object.keys(errors).length > 0) {
        throw new BadRequestError("Failed to validate record.", errors);
    }

    e.next();
}, "vehicles", "routes", "complaints", "fuels", "oils", "repairs");
