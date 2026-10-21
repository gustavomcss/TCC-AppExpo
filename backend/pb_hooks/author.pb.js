/// <reference path="../pb_data/types.d.ts" />

/*
 * The author of a route, fuel, oil or repair record is the signed-in user, never the value in
 * the request body (I-05). Whatever `user` the client sends is overwritten, and it may be left
 * out. Requests made as superuser keep the value they send.
 */
onRecordCreateRequest((e) => {
    if (e.auth && !e.hasSuperuserAuth()) {
        e.record.set("user", e.auth.id);
    }

    e.next();
}, "routes", "fuels", "oils", "repairs");
