/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const decimal = (name, required = true) => new NumberField({ name, required, min: 0, max: 999999.99 });
    const created = () => new AutodateField({ name: "created", onCreate: true, onUpdate: false });
    const relation = (name, collection, required = true) =>
        new RelationField({ name, collectionId: collection.id, required, maxSelect: 1, cascadeDelete: false });
    const photo = (name, maxSize, required) =>
        new FileField({
            name,
            required,
            maxSelect: 1,
            maxSize,
            mimeTypes: ["image/jpeg", "image/png", "image/webp"],
            thumbs: ["100x100"],
        });

    const base = (name, fields, indexes = []) => {
        const collection = new Collection({ type: "base", name });
        collection.fields.add(...fields);
        collection.indexes = indexes;
        app.save(collection);
        return collection;
    };

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
    users.fields.add(new BoolField({ name: "active" }));
    app.save(users);

    const vehicles = base("vehicles", [
        new TextField({ name: "plate", required: true, max: 8 }),
        new BoolField({ name: "active" }),
        new SelectField({ name: "type", required: true, maxSelect: 1, values: ["carro", "moto", "caminhao", "van"] }),
        new TextField({ name: "model", required: true, max: 100 }),
        decimal("odometer", false),
        created(),
    ], ["CREATE UNIQUE INDEX `idx_vehicles_plate` ON `vehicles` (`plate` COLLATE NOCASE)"]);

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

    const complaints = base("complaints", [
        relation("route_current", routes),
        relation("route_previous", routes, false),
        created(),
        decimal("km_complaint"),
        new SelectField({ name: "status", required: true, maxSelect: 1, values: ["pendente", "aprovada", "reprovada"] }),
        photo("photo", 10485760, true),
        new DateField({ name: "reviewed" }),
    ], ["CREATE UNIQUE INDEX `idx_complaints_route_current` ON `complaints` (`route_current`)"]);

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
