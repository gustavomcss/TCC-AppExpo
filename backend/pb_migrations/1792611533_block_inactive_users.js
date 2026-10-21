/// <reference path="../pb_data/types.d.ts" />

/*
 * Blocks inactive users (I-07, RB18). The auth rule of `users` refuses the sign-in of an inactive
 * user, and every access rule of the base set (I-05) gets the condition that the signed-in user is
 * active. The second part is what cuts a session opened before the deactivation: the token stays
 * valid, but the rules stop matching it. A rule that is null (superuser only) stays null.
 *
 * The rollback restores the rules exactly as I-05 left them.
 */
migrate((app) => {
    const active = "@request.auth.active = true";

    for (const [name, rules] of Object.entries(baseRules())) {
        const collection = app.findCollectionByNameOrId(name);
        for (const [key, rule] of Object.entries(rules)) {
            collection[key] = rule === null ? null : `${active} && (${rule})`;
        }
        if (name === "users") {
            collection.authRule = "active = true";
        }
        app.save(collection);
    }
}, (app) => {
    for (const [name, rules] of Object.entries(baseRules())) {
        const collection = app.findCollectionByNameOrId(name);
        for (const [key, rule] of Object.entries(rules)) {
            collection[key] = rule;
        }
        if (name === "users") {
            collection.authRule = "";
        }
        app.save(collection);
    }
});

/**
 * The rules set by 1792601121_set_base_api_rules.js, which this migration wraps and restores.
 * Kept here because a migration cannot import another one.
 */
function baseRules() {
    const signedIn = '@request.auth.id != ""';
    const supervisor = '@request.auth.role = "supervisor"';
    const ownOrSupervisor = `user = @request.auth.id || ${supervisor}`;
    const complaintAuthorOrSupervisor = `route_current.user = @request.auth.id || ${supervisor}`;

    return {
        users: {
            listRule: `id = @request.auth.id || ${supervisor}`,
            viewRule: `id = @request.auth.id || ${supervisor}`,
            createRule: null,
            updateRule: null,
            deleteRule: null,
        },
        vehicles: {
            listRule: signedIn,
            viewRule: signedIn,
            createRule: supervisor,
            updateRule: `${supervisor} && @request.body.odometer:changed = false`,
            deleteRule: supervisor,
        },
        routes: { listRule: ownOrSupervisor, viewRule: ownOrSupervisor, createRule: signedIn, updateRule: null, deleteRule: null },
        complaints: {
            listRule: complaintAuthorOrSupervisor,
            viewRule: complaintAuthorOrSupervisor,
            createRule: "@request.body.route_current.user = @request.auth.id",
            updateRule: null,
            deleteRule: null,
        },
        fuels: { listRule: ownOrSupervisor, viewRule: ownOrSupervisor, createRule: signedIn, updateRule: null, deleteRule: null },
        oils: { listRule: ownOrSupervisor, viewRule: ownOrSupervisor, createRule: signedIn, updateRule: null, deleteRule: null },
        repairs: { listRule: ownOrSupervisor, viewRule: ownOrSupervisor, createRule: signedIn, updateRule: null, deleteRule: null },
    };
}
