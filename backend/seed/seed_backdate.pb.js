/// <reference path="../pb_data/types.d.ts" />

/*
 * TEMPORARY hook, only to fill a database with demo data for the financial report. It is NOT in
 * pb_hooks on purpose: copy it there while seeding (seed/seed-report-data.sh) and delete it
 * right after. Fuel, oil and repair records get their `created` from the server (RNF05), and
 * the API ignores a `created` sent by anyone, superuser included. With this hook, a superuser
 * request that carries `seed_created` ("YYYY-MM-DD HH:MM:SS.000Z") has the record dated that
 * way once it is saved. Any other request is left alone.
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
