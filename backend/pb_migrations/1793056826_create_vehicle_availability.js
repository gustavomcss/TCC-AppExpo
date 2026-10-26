/// <reference path="../pb_data/types.d.ts" />

/*
 * Vehicle availability for the route start (I-20, RB01). A driver can only list their own routes,
 * so the app cannot tell from `routes` which vehicles another driver has out. This view answers
 * only that: its records are the ids of the vehicles that have an `aberta` route, and nothing else
 * (no driver, itinerary or km), so the privacy of the routes stays as the base rules left it (I-05).
 * Any active signed-in user can list it. The unique index of I-18 keeps at most one open route per
 * vehicle, so the ids are unique.
 *
 * The rollback drops the view.
 */
migrate((app) => {
    const collection = new Collection({
        type: "view",
        name: "vehicle_availability",
        listRule: '@request.auth.active = true && (@request.auth.id != "")',
        viewRule: '@request.auth.active = true && (@request.auth.id != "")',
        viewQuery: "SELECT vehicle AS id FROM routes WHERE status = 'aberta'",
    });
    app.save(collection);
}, (app) => {
    app.delete(app.findCollectionByNameOrId("vehicle_availability"));
});
