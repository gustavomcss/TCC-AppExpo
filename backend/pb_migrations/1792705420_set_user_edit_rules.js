/// <reference path="../pb_data/types.d.ts" />

/*
 * Who can create and edit users (I-11, RB19). Everything is a rule on the `users` collection, so
 * the backend holds it even for a request that does not come from the app:
 *
 * - Create: only a supervisor, and only with the role "motorista" and not pre-verified.
 *   Supervisors are created by the superuser in the PocketBase panel.
 * - A user edits only their own photo and password. The old password is still asked for.
 * - A supervisor edits a driver's name, photo, active flag and password. E-mail and role are fixed,
 *   and so are the e-mail visibility and the verified flag.
 * - A supervisor never edits another supervisor. Their own record falls under the first item.
 * - The manage rule lets a supervisor set a driver's password without the old one. It does not
 *   cover the supervisor themself, so their own password change still asks for it.
 * - Deletion stays null (superuser only), since nothing is deleted by the app (RB17).
 *
 * All rules start with the active-user condition added by I-07 (RB18). Fields are protected with
 * `:changed`, so a form that sends back an unchanged value is still accepted. A deactivation with
 * an open route is refused by pb_hooks/users.pb.js, which a rule cannot express.
 *
 * The rollback closes the three rules again, as I-05 left them.
 */
migrate((app) => {
    const active = "@request.auth.active = true";
    const supervisor = '@request.auth.role = "supervisor"';
    const self = "id = @request.auth.id";

    /** Rule part that holds when none of the given body fields is being changed. */
    const unchanged = (...fields) => fields.map((field) => `@request.body.${field}:changed = false`).join(" && ");

    const otherDriver = `${supervisor} && id != @request.auth.id && role = "motorista"`;

    const users = app.findCollectionByNameOrId("users");
    users.createRule = `${active} && ${supervisor} && @request.body.role = "motorista" && @request.body.verified != true`;
    users.updateRule = `${active} && (` +
        `(${self} && ${unchanged("email", "emailVisibility", "verified", "name", "role", "active")}) || ` +
        `(${otherDriver} && ${unchanged("email", "emailVisibility", "verified", "role")}))`;
    users.manageRule = `${active} && ${otherDriver}`;
    app.save(users);
}, (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null;
    users.updateRule = null;
    users.manageRule = null;
    app.save(users);
});
