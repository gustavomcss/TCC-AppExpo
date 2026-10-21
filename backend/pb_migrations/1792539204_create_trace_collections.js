/// <reference path="../pb_data/types.d.ts" />

/*
 * Creates the TRACE collections from the ER diagram (I-03): vehicles, routes, complaints,
 * fuels, oils and repairs, and extends the default "users" auth collection.
 *
 * API rules of the new collections stay null (superuser only) until I-05. No relation has
 * cascade delete, so a required relation blocks deleting the referenced record (RB12, RB18).
 */
migrate((app) => {
    /*
     * Km and money values are decimal 8,2 and never negative (RB16). The two-decimal limit is
     * enforced by pb_hooks/decimal_fields.pb.js. A required number rejects 0, so odometer and
     * km_departure, which may be 0, are not required.
     */
    /** Number field limited to 0..999999.99. */
    const decimal = (name, required = true) => new NumberField({ name, required, min: 0, max: 999999.99 });

    /** Server-generated creation timestamp; a value sent by the client is ignored (RNF05). */
    const created = () => new AutodateField({ name: "created", onCreate: true, onUpdate: false });

    /** Single relation without cascade delete. */
    const relation = (name, collection, required = true) =>
        new RelationField({ name, collectionId: collection.id, required, maxSelect: 1, cascadeDelete: false });

    /** Single image file field with a 100x100 thumbnail. */
    const photo = (name, maxSize, required) =>
        new FileField({
            name,
            required,
            maxSelect: 1,
            maxSize,
            mimeTypes: ["image/jpeg", "image/png", "image/webp"],
            thumbs: ["100x100"],
        });

    /*
     * Creates and saves a base collection. The Collection constructor ignores Field instances,
     * so the fields and indexes are set after it.
     */
    const base = (name, fields, indexes = []) => {
        const collection = new Collection({ type: "base", name });
        collection.fields.add(...fields);
        collection.indexes = indexes;
        app.save(collection);
        return collection;
    };

    /*
     * users: close the rules, make name required, rename avatar to photo and add role and
     * active. The default rules allow public sign-up and let users change their own role, so
     * they stay closed until I-05.
     */
    const users = app.findCollectionByNameOrId("users");
    users.listRule = null;
    users.viewRule = null;
    users.createRule = null;
    users.updateRule = null;
    users.deleteRule = null;

    const name = users.fields.getByName("name");
    name.required = true;

    const avatar = users.fields.getByName("avatar");
    if (avatar) {
        avatar.name = "photo";
        avatar.maxSize = 5242880;
        avatar.mimeTypes = ["image/jpeg", "image/png", "image/webp"];
        avatar.thumbs = ["100x100"];
    } else {
        users.fields.add(photo("photo", 5242880, false));
    }

    users.fields.add(new SelectField({ name: "role", required: true, maxSelect: 1, values: ["motorista", "supervisor"] }));
    /* A missing bool is false: whoever creates a user must send active = true. */
    users.fields.add(new BoolField({ name: "active" }));
    app.save(users);

    /* vehicles: the plate is unique regardless of letter case. */
    const vehicles = base("vehicles", [
        new TextField({ name: "plate", required: true, max: 8 }),
        new BoolField({ name: "active" }),
        new SelectField({ name: "type", required: true, maxSelect: 1, values: ["carro", "moto", "caminhao", "van"] }),
        new TextField({ name: "model", required: true, max: 100 }),
        decimal("odometer", false),
        created(),
    ], ["CREATE UNIQUE INDEX `idx_vehicles_plate` ON `vehicles` (`plate` COLLATE NOCASE)"]);

    /*
     * routes: date_departure is the creation time of the route. date_return is set by the
     * server when the route is finalized (I-19).
     */
    const routes = base("routes", [
        relation("user", users),
        relation("vehicle", vehicles),
        new SelectField({ name: "status", required: true, maxSelect: 1, values: ["aberta", "finalizada", "encerrada"] }),
        new TextField({ name: "itinerary", required: true, max: 500 }),
        new AutodateField({ name: "date_departure", onCreate: true, onUpdate: false }),
        decimal("km_departure", false),
        new TextField({ name: "obs_departure", max: 500 }),
        new DateField({ name: "date_return" }),
        decimal("km_return", false),
        new TextField({ name: "obs_return", max: 500 }),
    ]);

    /*
     * complaints: at most one per route (unique route_current). route_previous is optional
     * because the first route of a vehicle has no previous one. reviewed is the date and time
     * of the review, set by the server (I-29/I-30).
     */
    const complaints = base("complaints", [
        relation("route_current", routes),
        relation("route_previous", routes, false),
        created(),
        decimal("km_complaint"),
        new SelectField({ name: "status", required: true, maxSelect: 1, values: ["pendente", "aprovada", "reprovada"] }),
        photo("photo", 10485760, true),
        new DateField({ name: "reviewed" }),
    ], ["CREATE UNIQUE INDEX `idx_complaints_route_current` ON `complaints` (`route_current`)"]);

    /* fuels, oils and repairs: records written by a user for a vehicle. */
    base("fuels", [
        relation("user", users),
        relation("vehicle", vehicles),
        created(),
        decimal("km_fuel"),
        new SelectField({ name: "type", required: true, maxSelect: 1, values: ["gasolina", "aditivada", "etanol", "diesel"] }),
        decimal("liters"),
        decimal("cost"),
    ]);

    base("oils", [
        relation("user", users),
        relation("vehicle", vehicles),
        created(),
        decimal("km_oil"),
        new TextField({ name: "type", required: true, max: 100 }),
        decimal("cost"),
    ]);

    base("repairs", [
        relation("user", users),
        relation("vehicle", vehicles),
        created(),
        decimal("km_repair"),
        new TextField({ name: "description", required: true, max: 500 }),
        decimal("cost"),
    ]);
}, (app) => {
    /*
     * Rollback: drops the collections in reverse dependency order (it fails if they hold
     * records) and restores the default users collection.
     */
    for (const name of ["repairs", "oils", "fuels", "complaints", "routes", "vehicles"]) {
        app.delete(app.findCollectionByNameOrId(name));
    }

    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("active");
    users.fields.removeByName("role");

    const photo = users.fields.getByName("photo");
    photo.name = "avatar";
    photo.maxSize = 0;
    photo.thumbs = [];

    users.fields.getByName("name").required = false;

    users.listRule = "id = @request.auth.id";
    users.viewRule = "id = @request.auth.id";
    users.createRule = "";
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = "id = @request.auth.id";
    app.save(users);
});
