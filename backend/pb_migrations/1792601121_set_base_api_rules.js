/// <reference path="../pb_data/types.d.ts" />

/*
 * Baseline API rules per profile (I-05). A driver sees only their own records and a supervisor
 * sees everyone's. Routes, complaints, fuels, oils and repairs are never deleted by the app
 * (RB17), and the odometer of a vehicle cannot be changed by a request (RB09). The author of a
 * record is set by pb_hooks/author.pb.js.
 *
 * Rules left null stay superuser only, because each has its own issue: updates of routes (I-18),
 * complaints (I-27) and service records (I-31), and creation, update and deletion of users (I-11).
 * The inactive-user condition is added to every rule by I-07.
 */
migrate((app) => {
    const signedIn = '@request.auth.id != ""';
    const supervisor = '@request.auth.role = "supervisor"';

    /** The record belongs to the signed-in driver through its `user` field, or the user is a supervisor. */
    const ownOrSupervisor = `user = @request.auth.id || ${supervisor}`;

    /*
     * Rules by collection. A missing key means null (superuser only). The create rule of
     * complaints ties them to the route of the signed-in user, since a complaint has no author
     * field: its author is the user of route_current.
     */
    const rules = {
        users: {
            listRule: `id = @request.auth.id || ${supervisor}`,
            viewRule: `id = @request.auth.id || ${supervisor}`,
        },
        vehicles: {
            listRule: signedIn,
            viewRule: signedIn,
            createRule: supervisor,
            updateRule: `${supervisor} && @request.body.odometer:changed = false`,
            deleteRule: supervisor,
        },
        routes: { listRule: ownOrSupervisor, viewRule: ownOrSupervisor, createRule: signedIn },
        complaints: {
            listRule: `route_current.user = @request.auth.id || ${supervisor}`,
            viewRule: `route_current.user = @request.auth.id || ${supervisor}`,
            createRule: "@request.body.route_current.user = @request.auth.id",
        },
        fuels: { listRule: ownOrSupervisor, viewRule: ownOrSupervisor, createRule: signedIn },
        oils: { listRule: ownOrSupervisor, viewRule: ownOrSupervisor, createRule: signedIn },
        repairs: { listRule: ownOrSupervisor, viewRule: ownOrSupervisor, createRule: signedIn },
    };

    for (const [name, collectionRules] of Object.entries(rules)) {
        const collection = app.findCollectionByNameOrId(name);
        for (const key of ["listRule", "viewRule", "createRule", "updateRule", "deleteRule"]) {
            collection[key] = collectionRules[key] === undefined ? null : collectionRules[key];
        }
        app.save(collection);
    }
}, (app) => {
    /* Rollback: closes every rule again, as left by I-03. */
    for (const name of ["users", "vehicles", "routes", "complaints", "fuels", "oils", "repairs"]) {
        const collection = app.findCollectionByNameOrId(name);
        for (const key of ["listRule", "viewRule", "createRule", "updateRule", "deleteRule"]) {
            collection[key] = null;
        }
        app.save(collection);
    }
});
