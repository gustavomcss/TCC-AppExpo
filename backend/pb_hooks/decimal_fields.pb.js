/// <reference path="../pb_data/types.d.ts" />

onRecordValidate((e) => {
    const fields = e.record.collection().fields;
    const errors = {};

    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        if (field.type() !== "number") {
            continue;
        }

        const cents = e.record.getFloat(field.getName()) * 100;
        if (Math.abs(cents - Math.round(cents)) > 1e-6) {
            errors[field.getName()] = new ValidationError("validation_too_many_decimals", "Use no máximo duas casas decimais.");
        }
    }

    if (Object.keys(errors).length > 0) {
        throw new BadRequestError("Failed to validate record.", errors);
    }

    e.next();
}, "vehicles", "routes", "complaints", "fuels", "oils", "repairs");
