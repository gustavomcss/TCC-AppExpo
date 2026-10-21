/*
 * Factories for valid test data. Each one creates the record as superuser and throws if the
 * server refuses it, so a test only reaches the point it cares about when the scenario was
 * built correctly.
 */
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];

/** Tiny fake photo. PocketBase checks the type by content, so a JPEG header is enough. */
export function fakePhoto() {
    return new Blob([new Uint8Array([...JPEG_HEADER, ...new Array(64).fill(0)])], { type: "image/jpeg" });
}

/** Builds the multipart body of a complaint. Pass photo: null to omit the photo. */
export function complaintForm(fields) {
    const { photo = fakePhoto(), ...rest } = fields;
    const form = new FormData();
    for (const [name, value] of Object.entries({ status: "pendente", km_complaint: 990, ...rest })) {
        if (value !== undefined && value !== null) {
            form.append(name, String(value));
        }
    }
    if (photo) {
        form.append("photo", photo, "odometer.jpg");
    }
    return form;
}

/** Returns the factories bound to a superuser client. Fields in `overrides` replace the defaults. */
export function createFactories(admin) {
    let counter = 0;

    /** A plate in the AAA-0A00 format, different on every call (the server refuses any other format). */
    const nextPlate = () => {
        const n = ++counter;
        return `TS${String.fromCharCode(65 + (Math.floor(n / 10000) % 26))}-${String(n % 10000).padStart(4, "0")}`;
    };

    /** Creates a record as superuser and returns it, or throws with the server response. */
    async function create(collection, data) {
        const response = await admin.post(`/api/collections/${collection}/records`, data);
        if (response.status !== 200) {
            throw new Error(`Failed to create ${collection} (${response.status}): ${JSON.stringify(response.body)}`);
        }
        return response.body;
    }

    return {
        /** Creates a user. The returned record also carries email and password, for logging in. */
        async user({ role = "motorista", active = true } = {}) {
            const n = ++counter;
            const email = `${role}${n}@test.local`;
            const password = "senha12345";
            const record = await create("users", { email, password, passwordConfirm: password, name: `${role} ${n}`, role, active });
            return { ...record, email, password };
        },

        vehicle: (overrides = {}) =>
            create("vehicles", { plate: nextPlate(), type: "carro", model: "Gol", odometer: 1000, active: true, ...overrides }),

        route: ({ user, vehicle, ...overrides }) =>
            create("routes", { user: user.id, vehicle: vehicle.id, status: "aberta", itinerary: "Downtown", km_departure: 1000, ...overrides }),

        /** Creates a complaint through multipart, because it carries a photo. */
        async complaint(fields) {
            const response = await admin.post("/api/collections/complaints/records", complaintForm(fields));
            if (response.status !== 200) {
                throw new Error(`Failed to create complaints (${response.status}): ${JSON.stringify(response.body)}`);
            }
            return response.body;
        },

        fuel: ({ user, vehicle, ...overrides }) =>
            create("fuels", { user: user.id, vehicle: vehicle.id, km_fuel: 1010, type: "etanol", liters: 30.5, cost: 180.9, ...overrides }),

        oil: ({ user, vehicle, ...overrides }) =>
            create("oils", { user: user.id, vehicle: vehicle.id, km_oil: 1010, type: "5W30 synthetic", cost: 250, ...overrides }),

        repair: ({ user, vehicle, ...overrides }) =>
            create("repairs", { user: user.id, vehicle: vehicle.id, km_repair: 1010, description: "Brakes", cost: 400, ...overrides }),
    };
}
