/// <reference path="../pb_data/types.d.ts" />

/*
 * RB20: an old plate (ABC-1323) and its Mercosul equivalent (ABC-1D23) are the same plate. This
 * adds a unique index over the plate with its fifth character always written as a digit (A..J
 * become 0..9), so the database itself refuses two vehicles that differ only by that character,
 * even when two requests arrive together. The hook vehicle_plate.pb.js checks the same thing
 * first, to answer with the `validation_not_unique` code on the `plate` field; the index is the
 * guarantee behind it.
 *
 * Vehicles already saved with equivalent plates make the migration fail, so remove them first.
 * The rollback drops the index.
 */
migrate((app) => {
    const vehicles = app.findCollectionByNameOrId("vehicles");

    const cases = "ABCDEFGHIJ"
        .split("")
        .map((letter, digit) => `WHEN '${letter}' THEN '${digit}'`)
        .join(" ");
    const canonical = `substr(\`plate\`, 1, 5) || CASE substr(\`plate\`, 6, 1) ${cases} ELSE substr(\`plate\`, 6, 1) END || substr(\`plate\`, 7)`;

    vehicles.indexes = [
        ...vehicles.indexes,
        `CREATE UNIQUE INDEX \`idx_vehicles_plate_canonical\` ON \`vehicles\` ((${canonical}))`,
    ];
    app.save(vehicles);
}, (app) => {
    const vehicles = app.findCollectionByNameOrId("vehicles");
    vehicles.indexes = vehicles.indexes.filter((index) => !index.includes("idx_vehicles_plate_canonical"));
    app.save(vehicles);
});
