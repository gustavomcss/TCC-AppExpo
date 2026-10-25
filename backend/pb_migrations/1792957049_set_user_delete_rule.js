/// <reference path="../pb_data/types.d.ts" />

/*
 * Who can delete users (I-15, RB18, RB19). Only a supervisor deletes, only a driver other than
 * themself, and the rule starts with the active-user condition of I-07. A supervisor is never
 * deleted by the app, and neither is the signed-in user.
 *
 * A driver with records is not deleted: the relations of routes, fuels, oils and repairs are
 * required and without cascade delete (I-03), so the database blocks it. Complaints have no
 * author, only a route, so they are covered by the routes. pb_hooks/users.pb.js gives that
 * refusal a stable code.
 *
 * The rollback closes the rule again, as I-11 left it.
 */
migrate((app) => {
    const users = app.findCollectionByNameOrId("users");
    users.deleteRule =
        '@request.auth.active = true && @request.auth.role = "supervisor" && ' +
        'id != @request.auth.id && role = "motorista"';
    app.save(users);
}, (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.deleteRule = null;
    app.save(users);
});
