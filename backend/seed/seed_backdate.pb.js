/// <reference path="../pb_data/types.d.ts" />

/*
 * TEMPORARY hook, only to fill a database with demo data (seed/seed-report-data.sh and
 * seed/seed-demo.mjs). It is NOT in pb_hooks on purpose: copy it there while seeding and delete it
 * right after. Dates such as `created`, `date_departure` and `date_return` come from the server
 * (RNF05), and the API ignores any value sent by anyone, superuser included. This file gives a
 * superuser two ways to date a record in the past:
 *  - a create request that carries `seed_created` ("YYYY-MM-DD HH:MM:SS.000Z") has the record
 *    dated that way once it is saved (fuels, oils and repairs);
 *  - POST /api/seed/backdate sets whitelisted date columns of an existing record.
 * Any other request is left alone.
 */
onRecordCreateRequest((e) => {
    const created = e.requestInfo().body["seed_created"];

    e.next();

    if (created && e.hasSuperuserAuth()) {
        e.app.db()
            .newQuery("UPDATE {{" + e.collection.name + "}} SET created = {:created} WHERE id = {:id}")
            .bind({ created: String(created), id: e.record.id })
            .execute();
    }
}, "fuels", "oils", "repairs");

routerAdd(
    "GET",
    "/api/seed/ping",
    (e) => {
        return e.json(200, { seed: true });
    },
    $apis.requireSuperuserAuth(),
);

routerAdd(
    "POST",
    "/api/seed/backdate",
    (e) => {
        /* Date columns the endpoint may write, per collection (kept inside: handlers share no outer scope). */
        const allowed = {
            routes: ["date_departure", "date_return"],
            complaints: ["created", "reviewed"],
            fuels: ["created"],
            oils: ["created"],
            repairs: ["created"],
        };
        const body = e.requestInfo().body;
        const columns = allowed[body["collection"]];
        if (!columns) {
            throw new BadRequestError("Unknown collection.");
        }
        const values = body["set"] || {};
        for (const column of Object.keys(values)) {
            if (columns.indexOf(column) < 0) {
                throw new BadRequestError("Column not allowed: " + column);
            }
            if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(String(values[column]))) {
                throw new BadRequestError("Bad date format: " + column);
            }
            e.app
                .db()
                .newQuery("UPDATE {{" + body["collection"] + "}} SET " + column + " = {:value} WHERE id = {:id}")
                .bind({ value: String(values[column]), id: String(body["id"]) })
                .execute();
        }
        return e.json(200, { ok: true });
    },
    $apis.requireSuperuserAuth(),
);
