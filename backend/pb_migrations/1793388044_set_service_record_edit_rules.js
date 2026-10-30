/// <reference path="../pb_data/types.d.ts" />

/*
 * Edit rules of the service records, fuels, oils and repairs (I-31, RB04, RB17).
 *
 * Update: only the author, and only the non-sensitive fields (fuels: type, liters and cost; oils:
 * type and cost; repairs: description and cost). The vehicle, the km and the author stay fixed, so a
 * request that changes any of them is refused. The creation date is an autodate set on create only,
 * so a `created` in the body is ignored rather than refused (RNF05); it stays in the list as a
 * guard. Not even a supervisor edits the record of someone else. The fields are guarded with
 * `:changed`, so a form that sends back the value already saved is accepted. The km is informative
 * (RB04), and the odometer of the vehicle is never touched by an edit. Editing is also allowed
 * after the vehicle is inactivated, because the vehicle itself does not change (RB12 only bars new
 * records).
 *
 * Delete stays null (RB17). Routes (I-18) and complaints (I-27) already change only along their
 * planned flows, so their rules are not touched here.
 *
 * Every rule keeps the inactive-user condition added by I-07. The rollback closes the update rule
 * again, as I-05 left it. Create, list, view and delete are not touched.
 */
migrate((app) => {
    const active = "@request.auth.active = true";

    /* The km field of each collection. */
    const kmFields = { fuels: "km_fuel", oils: "km_oil", repairs: "km_repair" };

    for (const [name, km] of Object.entries(kmFields)) {
        /* Fields that never change after the record is created. */
        const fixed = ["user", "vehicle", km, "created"].map((field) => `@request.body.${field}:changed = false`);
        const updateRule = ["user = @request.auth.id", ...fixed].join(" && ");

        const collection = app.findCollectionByNameOrId(name);
        collection.updateRule = `${active} && (${updateRule})`;
        app.save(collection);
    }
}, (app) => {
    for (const name of ["fuels", "oils", "repairs"]) {
        const collection = app.findCollectionByNameOrId(name);
        collection.updateRule = null;
        app.save(collection);
    }
});
