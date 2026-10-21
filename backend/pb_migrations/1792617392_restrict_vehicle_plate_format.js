/// <reference path="../pb_data/types.d.ts" />

/*
 * Restricts the plate of a vehicle to the AAA-0A00 format (I-08): three uppercase letters, a hyphen,
 * a digit, a letter or digit, and two digits, which covers the old (ABC-1234) and Mercosul
 * (ABC-1D23) plates in the 8 characters of the field. The app applies the same mask, but only the
 * server can refuse a request that skips it. Plates already saved are not checked until the
 * vehicle is saved again.
 *
 * The rollback removes the pattern.
 */
migrate((app) => {
    const vehicles = app.findCollectionByNameOrId("vehicles");
    vehicles.fields.getByName("plate").pattern = "^[A-Z]{3}-[0-9][A-Z0-9][0-9]{2}$";
    app.save(vehicles);
}, (app) => {
    const vehicles = app.findCollectionByNameOrId("vehicles");
    vehicles.fields.getByName("plate").pattern = "";
    app.save(vehicles);
});
