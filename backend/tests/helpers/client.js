/*
 * Minimal HTTP client for the PocketBase API. It resolves to { status, body } without throwing
 * on 4xx/5xx, so a test can assert the status a rule is expected to produce.
 */
export function createClient(baseUrl, token = null) {
    /* Safety guard: tests create and delete data, so they never talk to a remote server. */
    const { hostname } = new URL(baseUrl);
    if (hostname !== "127.0.0.1" && hostname !== "localhost") {
        throw new Error(`Tests only accept 127.0.0.1 or localhost, got: ${baseUrl}`);
    }

    /** Sends one request. A FormData body is sent as multipart, anything else as JSON. */
    async function request(method, path, body) {
        const headers = {};
        if (token) {
            headers.Authorization = token;
        }

        let payload;
        if (body instanceof FormData) {
            payload = body;
        } else if (body !== undefined) {
            headers["Content-Type"] = "application/json";
            payload = JSON.stringify(body);
        }

        const response = await fetch(baseUrl + path, { method, headers, body: payload });
        const text = await response.text();
        return { status: response.status, body: text ? JSON.parse(text) : null };
    }

    return {
        get: (path) => request("GET", path),
        post: (path, body) => request("POST", path, body),
        patch: (path, body) => request("PATCH", path, body),
        delete: (path) => request("DELETE", path),
    };
}

/** Authenticates against an auth collection (users or _superusers) and returns a client with that token. */
export async function login(baseUrl, collection, identity, password) {
    const { status, body } = await createClient(baseUrl).post(`/api/collections/${collection}/auth-with-password`, {
        identity,
        password,
    });
    if (status !== 200) {
        throw new Error(`Login in ${collection} failed (${status}): ${JSON.stringify(body)}`);
    }
    return createClient(baseUrl, body.token);
}
