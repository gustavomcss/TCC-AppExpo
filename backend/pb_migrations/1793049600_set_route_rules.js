/// <reference path="../pb_data/types.d.ts" />

/*
 * Route integrity rules (I-18, RB01, RB02, RB15, RB17).
 *
 * Create: a route is born `aberta`, without return data. The return is filled only when the route
 * is finalized, and `date_return` is always set by the server (pb_hooks/routes.pb.js).
 *
 * Update: only an `aberta` route can change, and only along the two allowed transitions. The author
 * finalizes it once, sending `km_return` and optionally `obs_return`. A supervisor closes it
 * administratively (`encerrada`) without touching the return fields. Everything else on the route
 * stays fixed, and a `finalizada` or `encerrada` route is not editable by anyone but the
 * superuser. Delete stays null (RB17).
 *
 * Two unique partial indexes keep at most one `aberta` route per vehicle (RB01) and per driver
 * (RB02) even when two requests race. A closed route (`finalizada` or `encerrada`) is outside them.
 * The migration fails if the data already holds two open routes of the same vehicle or driver:
 * close the extra ones before applying it.
 *
 * Every rule keeps the inactive-user condition added by I-07. The rollback restores the rules as
 * I-07 left them and drops the indexes.
 */
migrate((app) => {
    const active = "@request.auth.active = true";
    const signedIn = '@request.auth.id != ""';

    /* The route is created open and without return data. */
    const createRule = [
        signedIn,
        '@request.body.status = "aberta"',
        "@request.body.km_return:isset = false",
        "@request.body.obs_return:isset = false",
        "@request.body.date_return:isset = false",
    ].join(" && ");

    /* Fields that never change after the route is created. */
    const fixed = ["user", "vehicle", "itinerary", "km_departure", "obs_departure", "date_departure", "date_return"].map(
        (field) => `@request.body.${field}:changed = false`,
    );

    /* The author finalizes; a supervisor closes without return data. */
    const finalize = 'user = @request.auth.id && @request.body.status = "finalizada"';
    const close = [
        '@request.auth.role = "supervisor"',
        '@request.body.status = "encerrada"',
        "@request.body.km_return:changed = false",
        "@request.body.obs_return:changed = false",
    ].join(" && ");
    const updateRule = ['status = "aberta"', ...fixed, `((${finalize}) || (${close}))`].join(" && ");

    const routes = app.findCollectionByNameOrId("routes");
    routes.createRule = `${active} && (${createRule})`;
    routes.updateRule = `${active} && (${updateRule})`;
    routes.indexes = [
        ...routes.indexes,
        "CREATE UNIQUE INDEX `idx_routes_open_vehicle` ON `routes` (`vehicle`) WHERE `status` = 'aberta'",
        "CREATE UNIQUE INDEX `idx_routes_open_user` ON `routes` (`user`) WHERE `status` = 'aberta'",
    ];
    app.save(routes);
}, (app) => {
    const routes = app.findCollectionByNameOrId("routes");
    routes.createRule = '@request.auth.active = true && (@request.auth.id != "")';
    routes.updateRule = null;
    routes.indexes = routes.indexes.filter((index) => !index.includes("idx_routes_open_"));
    app.save(routes);
});
