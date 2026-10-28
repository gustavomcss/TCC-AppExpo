/// <reference path="../pb_data/types.d.ts" />

/*
 * Complaint integrity rules (I-27, RB08, RB11, RB17).
 *
 * Create: only the author of `route_current` files a complaint (a complaint has no author field),
 * born `pendente`, without a review date and without `route_previous`, which the server fills
 * (pb_hooks/complaints.pb.js). That the route is `aberta`, that the km differs from the departure
 * km and that there is at most one complaint per route (unique index idx_complaints_route_current,
 * I-03) are held by the hook and the index, which answer with a code the app can translate.
 *
 * Update: only a supervisor, only on a `pendente` complaint, and only to review it, sending
 * `status` as `aprovada` or `reprovada`. Every other field stays fixed, and the review date is
 * stamped by the server, so a reviewed complaint is final. Nothing excludes the supervisor from
 * reviewing the complaint they filed themselves (RB08). Delete stays null (RB17).
 *
 * Every rule keeps the inactive-user condition added by I-07. The rollback restores the rules as
 * I-07 left them. List and view are not touched.
 */
migrate((app) => {
    const active = "@request.auth.active = true";

    /* The complaint is born pendente, not reviewed, and with the previous route left to the server. */
    const createRule = [
        "@request.body.route_current.user = @request.auth.id",
        '@request.body.status = "pendente"',
        "@request.body.reviewed:isset = false",
        "@request.body.route_previous:isset = false",
    ].join(" && ");

    /* Fields that never change after the complaint is created. */
    const fixed = ["route_current", "route_previous", "km_complaint", "photo", "created", "reviewed"].map(
        (field) => `@request.body.${field}:changed = false`,
    );

    const updateRule = [
        '@request.auth.role = "supervisor"',
        'status = "pendente"',
        '(@request.body.status = "aprovada" || @request.body.status = "reprovada")',
        ...fixed,
    ].join(" && ");

    const complaints = app.findCollectionByNameOrId("complaints");
    complaints.createRule = `${active} && (${createRule})`;
    complaints.updateRule = `${active} && (${updateRule})`;
    app.save(complaints);
}, (app) => {
    const complaints = app.findCollectionByNameOrId("complaints");
    complaints.createRule = "@request.auth.active = true && (@request.body.route_current.user = @request.auth.id)";
    complaints.updateRule = null;
    app.save(complaints);
});
