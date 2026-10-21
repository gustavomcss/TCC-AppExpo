/// <reference path="../pb_data/types.d.ts" />

/*
 * RB20: an old plate (ABC-1323) and its Mercosul equivalent (ABC-1D23) are the same plate, so
 * only one of them can be registered. The equivalent of a plate changes only the fifth
 * character, a digit in the old format and the letter at the same position in A..J in the
 * Mercosul one (0 = A ... 9 = J). A letter after J has no old equivalent.
 *
 * Runs on every create and update, and only when the plate is new or changed, so a vehicle can
 * still be saved and can change to the equivalent of its own plate (the conversion). It answers
 * the same `validation_not_unique` code as an exact duplicate, on the `plate` field. The unique
 * index idx_vehicles_plate_canonical (migration restrict_plate_equivalence) is the guarantee
 * against two requests racing; this hook only gives the request a clear answer.
 */
onRecordValidate((e) => {
    const plate = e.record.getString("plate");
    const changed = e.record.isNew() || e.record.original().getString("plate") !== plate;
    const parts = /^([A-Z]{3}-[0-9])([A-Z0-9])([0-9]{2})$/.exec(plate);

    if (!changed || !parts) {
        e.next();
        return;
    }

    /* The plate itself and, when it has one, the equivalent in the other format. */
    const letters = "ABCDEFGHIJ";
    const candidates = [plate];
    if (/[0-9]/.test(parts[2])) {
        candidates.push(parts[1] + letters.charAt(Number(parts[2])) + parts[3]);
    } else if (letters.indexOf(parts[2]) >= 0) {
        candidates.push(parts[1] + letters.indexOf(parts[2]) + parts[3]);
    }

    const clashes = $app.findRecordsByFilter(
        "vehicles",
        "(plate = {:first} || plate = {:second}) && id != {:id}",
        "",
        1,
        0,
        { first: candidates[0], second: candidates[candidates.length - 1], id: e.record.id },
    );

    if (clashes.length > 0) {
        throw new BadRequestError("Failed to validate record.", {
            plate: new ValidationError("validation_not_unique", "Value must be unique."),
        });
    }

    e.next();
}, "vehicles");
