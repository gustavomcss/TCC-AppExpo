/// <reference path="../pb_data/types.d.ts" />

/*
 * Rules of user editing that the API Rules of `users` cannot express (I-11).
 *
 * A user with an open route is not deactivated (RB18), by anyone: the check runs on every request,
 * superuser included. Reactivating, and saving a user that is already inactive, are not affected.
 */
onRecordUpdateRequest((e) => {
    const wasActive = e.record.original().getBool("active");

    if (wasActive && !e.record.getBool("active")) {
        const openRoutes = $app.countRecords("routes", $dbx.hashExp({ user: e.record.id, status: "aberta" }));

        if (openRoutes > 0) {
            throw new BadRequestError("Failed to update record.", {
                active: new ValidationError("user_has_open_route", "Cannot deactivate a user with an open route."),
            });
        }
    }

    e.next();
}, "users");

/*
 * The e-mail of a user is fixed (RB19). The PocketBase flow that changes it by a confirmation link
 * is closed for everyone, since it would let a user change their own e-mail around the update rule.
 */
onRecordRequestEmailChangeRequest((e) => {
    throw new ForbiddenError("The e-mail of a user cannot be changed.");
}, "users");

/*
 * A user with records is not deleted (RB18). The required relations of routes, fuels, oils and
 * repairs already block it in the database, but with a bare 400 and no data, so the check runs
 * first to answer with a code the app can translate. Complaints are not counted: they hang from
 * a route, and a user with a complaint has the route.
 */
onRecordDeleteRequest((e) => {
    const filter = $dbx.hashExp({ user: e.record.id });
    const linked = ["routes", "fuels", "oils", "repairs"].some((name) => $app.countRecords(name, filter) > 0);

    if (linked) {
        throw new BadRequestError("Failed to delete record.", {
            id: new ValidationError("user_has_records", "Cannot delete a user with linked records."),
        });
    }

    e.next();
}, "users");
