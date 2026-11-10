#!/usr/bin/env node
/**
 * Fills a TRACE database with fictional demo data (users, vehicles, routes, complaints, fuel, oil
 * and repair records) spread over the last six months, for the screenshots of the thesis and for
 * the demo. It goes through the real flows (routes are opened and finalized, complaints are
 * approved and rejected) so every rule and every km correction is applied by the server.
 *
 * Needs the superuser and the temporary hook seed/seed_backdate.pb.js loaded by the server while
 * it runs (dates are the server's, so the hook backdates them), plus ImageMagick (`convert`) to
 * draw the odometer photos of the complaints. With --auto-hook the script copies the hook into the
 * hooks folder itself, waits for the server to load it and removes it when it ends, even on an
 * error or Ctrl+C, so the hook never stays in a server's hooks folder. Without the flag, copy it
 * by hand and delete it afterwards. The hook only answers a superuser.
 *
 *   node seed/seed-demo.mjs --auto-hook            create the demo data
 *   node seed/seed-demo.mjs --clean --auto-hook    delete everything this script created
 *   node seed/seed-demo.mjs --reset --auto-hook    delete it and create it again (fresh dates)
 *
 * Also available from backend/ as `npm run seed`, `npm run seed:clean` and `npm run seed:reset`.
 * Against a server that is not on this machine the script asks you to confirm first; --yes skips it.
 *
 *   HOOKS_DIR      hooks folder the server watches (default: ../pb_hooks, next to this folder)
 *   DEMO_DOMAIN    domain of the demo users' e-mails (default: trace.com)
 *   PB_URL         server (default https://pb.wizecode.com.br)
 *   SU_EMAIL       superuser e-mail (asked if empty)
 *   SU_PASS        superuser password (asked if empty, never stored)
 *   DEMO_PASSWORD  password of the demo users, at least 8 characters (asked if empty)
 *   DRY_RUN=1      only prints the plan
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const PB_URL = (process.env.PB_URL || "https://pb.wizecode.com.br").replace(/\/$/, "");
const DRY_RUN = process.env.DRY_RUN === "1";
const CLEAN = process.argv.includes("--clean");
const AUTO_HOOK = process.argv.includes("--auto-hook");
const RESET = process.argv.includes("--reset");
const ASSUME_YES = process.argv.includes("--yes");
const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK_SOURCE = join(HERE, "seed_backdate.pb.js");
const HOOK_TARGET = join(process.env.HOOKS_DIR || join(HERE, "..", "pb_hooks"), "seed_backdate.pb.js");
/* Domain of the demo users' e-mails. The script only ever touches the exact addresses it creates, never the whole domain. */
const DOMAIN = process.env.DEMO_DOMAIN || "trace.com";
const HISTORY_DAYS = 178;
/* Brazil has no daylight saving time since 2019: local time is UTC-3 all year. */
const UTC_OFFSET_HOURS = 3;

/* ------------------------------------------------------------------ demo cast */

/** Demo users. `lastDay` is the oldest-to-newest cut: the driver only has routes up to that many days ago. */
const USERS = {
    renata: { name: "Renata Albuquerque", role: "supervisor" },
    carlos: { name: "Carlos Menezes", role: "motorista" },
    juliana: { name: "Juliana Prado", role: "motorista" },
    rafael: { name: "Rafael Tavares", role: "motorista" },
    fernanda: { name: "Fernanda Lopes", role: "motorista" },
    anderson: { name: "Anderson Cavalcante", role: "motorista" },
    patricia: { name: "Patrícia Nogueira", role: "motorista", leftDaysAgo: 50, inactive: true },
};

/** Demo vehicles. `drivers` are the people who drive each one; `start` is the odometer 6 months ago. */
const VEHICLES = {
    argo: { plate: "RTK-3C21", type: "carro", model: "Fiat Argo", start: 38200, drivers: ["rafael", "fernanda"] },
    gol: { plate: "PLM-7E58", type: "carro", model: "Vw Gol", start: 61500, drivers: ["fernanda", "rafael"] },
    master: { plate: "HBN-5A90", type: "van", model: "Renault Master", start: 74300, drivers: ["carlos", "anderson"] },
    sprinter: { plate: "KDR-2G14", type: "van", model: "Mercedes Sprinter", start: 52800, drivers: ["juliana", "carlos"] },
    atego: { plate: "MJX-8D37", type: "caminhao", model: "Mercedes Atego", start: 143900, drivers: ["anderson", "patricia"] },
    delivery: { plate: "TQZ-1B66", type: "caminhao", model: "Vw Delivery", start: 96400, drivers: ["anderson", "juliana"] },
    cg: { plate: "WNV-6H09", type: "moto", model: "Honda Cg 160", start: 12600, drivers: ["rafael", "carlos"] },
    factor: { plate: "GCS-9J72", type: "moto", model: "Yamaha Factor", start: 27100, drivers: ["patricia", "carlos"], inactive: true },
};

/**
 * The scripted routes, by days ago. They tell the story the screenshots need; every other route
 * comes from the random history around them. `final` is finalizada (default), aberta or encerrada.
 * A complaint is {delta, outcome, hoursAfter}: `delta` is the km informed minus the departure km.
 */
const SCRIPTED = [
    { d: 16, v: "gol", u: "fernanda", hour: 8, final: "encerrada", closedDaysLater: 2, itinerary: "Entrega de pedidos na zona norte" },
    { d: 14, v: "argo", u: "rafael", hour: 8, inc: 118, itinerary: "Visita a clientes no centro" },
    {
        d: 12, v: "argo", u: "rafael", hour: 9, inc: 164, itinerary: "Entrega de pedidos na zona norte",
        complaint: { delta: -18, outcome: "aprovada", hoursAfter: 2, reviewDaysLater: 1 }, fuel: true,
    },
    {
        d: 10, v: "gol", u: "fernanda", hour: 8, inc: 96, itinerary: "Atendimento técnico em Campinas",
        complaint: { delta: 35, outcome: "reprovada", hoursAfter: 2, reviewDaysLater: 1 },
    },
    { d: 7, v: "argo", u: "rafael", hour: 7, inc: 141, itinerary: "Reposição de estoque nas lojas", fuel: true, oil: true },
    { d: 4, v: "cg", u: "rafael", hour: 9, inc: 52, itinerary: "Entrega expressa no centro", fuel: true },
    { d: 2, v: "argo", u: "rafael", hour: 8, inc: 127, itinerary: "Coleta de mercadorias no centro de distribuição", repair: "Troca de pastilhas de freio", fuel: true, obsReturn: "Freio dianteiro com ruído, revisado na oficina" },
    {
        d: 3, v: "delivery", u: "anderson", hour: 8, final: "aberta", itinerary: "Transferência de carga entre filiais",
        obsDeparture: "Carga lacrada na saída", complaint: { delta: 40, outcome: "pendente", hoursAfter: 1 },
    },
    { d: 1, v: "sprinter", u: "juliana", hour: 14, final: "aberta", itinerary: "Visita técnica a clientes na zona sul", obsDeparture: "Levar o kit de ferramentas" },
    {
        d: 0, v: "master", u: "carlos", hour: 7, final: "aberta", itinerary: "Entrega de materiais em Campinas",
        complaint: { delta: -12, outcome: "pendente", hoursAfter: 1 },
    },
];

const ITINERARIES = [
    "Entrega de pedidos na zona norte", "Visita a clientes no centro", "Coleta de mercadorias no centro de distribuição",
    "Transferência de carga entre filiais", "Entrega de peças na zona sul", "Atendimento técnico em Campinas",
    "Entrega de materiais em Osasco", "Rota de cobrança na região do ABC", "Reposição de estoque nas lojas",
    "Entrega expressa no centro",
];
const OBS_DEPARTURE = ["Carga lacrada na saída", "Verificar a pressão dos pneus", "Cliente pediu entrega até as 16h"];
const OBS_RETURN = ["Sem intercorrências", "Trânsito intenso na marginal", "Entrega concluída, nota assinada", "Pneu dianteiro com desgaste"];
const OIL_TYPES = ["5w-30 sintético", "10w-40 semissintético", "15w-40 mineral", "20w-50 mineral"];
const REPAIRS = [
    ["Troca de pastilhas de freio", 380], ["Alinhamento e balanceamento", 160], ["Troca de pneus", 1400],
    ["Revisão da suspensão", 900], ["Troca da bateria", 520], ["Reparo do sistema elétrico", 650],
    ["Troca da embreagem", 1800], ["Troca da correia dentada", 750],
];
const KM_PER_ROUTE = { moto: [25, 90], carro: [40, 180], van: [70, 260], caminhao: [120, 420] };
const FUEL_BASE = { moto: 90, carro: 230, van: 320, caminhao: 650 };
const OIL_BASE = { moto: 70, carro: 220, van: 320, caminhao: 650 };
const REPAIR_MULT = { moto: 0.4, carro: 1, van: 1.3, caminhao: 2.2 };

/* ------------------------------------------------------------------ helpers */

let seed = 4242;
/** Deterministic pseudo-random number in [0, 1): the same run gives the same data. */
const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (list) => list[Math.floor(random() * list.length)];

const slug = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, ".");
const emailOf = (key) => `${slug(USERS[key].name)}@${DOMAIN}`;

/** Filter that matches only the demo users' exact e-mail addresses, for the field `field` (e.g. `user.email`). */
const demoUsersFilter = (field) => `(${Object.keys(USERS).map((key) => `${field} = '${emailOf(key)}'`).join(" || ")})`;

/** The date of "today" in Brazil, as a UTC midnight timestamp. */
const today = () => {
    const local = new Date(Date.now() - UTC_OFFSET_HOURS * 3600e3);
    return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
};

/** The server's date format for a moment: `daysAgo` days back, at a Brazilian local hour, never in the future. */
const stamp = (daysAgo, hour, minute = 0, extraMinutes = 0) => {
    const base = today() - daysAgo * 86400e3 + (hour + UTC_OFFSET_HOURS) * 3600e3 + (minute + extraMinutes) * 60e3;
    /* Today's routes start a while ago, so an open route does not read as "just now". */
    const moment = Math.min(base, Date.now() - (daysAgo === 0 ? 90 : 5) * 60e3);
    return new Date(moment).toISOString().replace("T", " ");
};
const later = (dateText, minutes) => new Date(new Date(dateText.replace(" ", "T")).getTime() + minutes * 60e3).toISOString().replace("T", " ");
const isFuture = (dateText) => new Date(dateText.replace(" ", "T")).getTime() > Date.now();
const money = (cents) => (cents / 100).toFixed(2);

const prompt = (question, silent = false) =>
    new Promise((resolve) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        if (silent) {
            rl._writeToOutput = () => {};
        }
        process.stdout.write(question);
        rl.question("", (answer) => {
            rl.close();
            if (silent) process.stdout.write("\n");
            resolve(answer);
        });
    });

/* ------------------------------------------------------------------ API */

let token = "";
let requests = 0;

/** Calls the PocketBase API as superuser; throws with the server's answer on a failure. */
const api = async (method, path, body) => {
    requests += 1;
    const headers = { Authorization: token };
    let payload;
    if (body instanceof FormData) {
        payload = body;
    } else if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }
    const response = await fetch(PB_URL + path, { method, headers, body: payload });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`${method} ${path} -> ${response.status} ${text}`);
    }
    return text ? JSON.parse(text) : null;
};
const list = async (collection, filter, extra = "") => {
    const found = await api("GET", `/api/collections/${collection}/records?perPage=500&filter=${encodeURIComponent(filter)}${extra}`);
    return found.items;
};
const backdate = (collection, id, set) => api("POST", "/api/seed/backdate", { collection, id, set });

/* ------------------------------------------------------------------ clean */

/** Deletes everything the script created, children first because the server refuses to orphan records. */
const clean = async () => {
    const owner = demoUsersFilter("user.email");
    for (const [collection, filter] of [
        ["complaints", demoUsersFilter("route_current.user.email")],
        ["routes", owner],
        ["fuels", owner],
        ["oils", owner],
        ["repairs", owner],
    ]) {
        const items = await list(collection, filter, "&fields=id");
        for (const item of items) await api("DELETE", `/api/collections/${collection}/records/${item.id}`);
        console.log(`${collection}: ${items.length} apagados`);
    }
    const plates = Object.values(VEHICLES).map((v) => `plate = '${v.plate}'`).join(" || ");
    for (const vehicle of await list("vehicles", plates, "&fields=id,plate")) {
        await api("DELETE", `/api/collections/vehicles/records/${vehicle.id}`).then(
            () => console.log(`veículo ${vehicle.plate} apagado`),
            (error) => console.error(`veículo ${vehicle.plate} ficou: ${error.message}`),
        );
    }
    for (const user of await list("users", demoUsersFilter("email"), "&fields=id,email")) {
        await api("DELETE", `/api/collections/users/records/${user.id}`).then(
            () => console.log(`usuário ${user.email} apagado`),
            (error) => console.error(`usuário ${user.email} ficou: ${error.message}`),
        );
    }
};

/* ------------------------------------------------------------------ odometer photo */

const photoDir = DRY_RUN ? "" : mkdtempSync(join(tmpdir(), "trace-seed-"));

/** Draws a dashboard with the odometer showing `km`, 4:3, as the photo that proves a complaint. */
const odometerPhoto = (km) => {
    const file = join(photoDir, `painel-${Math.round(km * 100)}.png`);
    const text = Number(km).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\./g, " ");
    execFileSync("convert", [
        "-size", "1200x900", "gradient:#2b2b2b-#0d0d0d",
        "-fill", "none", "-stroke", "#5a5a5a", "-strokewidth", "10", "-draw", "circle 600,470 600,120",
        "-stroke", "#8a8a8a", "-strokewidth", "4", "-draw", "circle 600,470 600,160",
        "-stroke", "#d83a2e", "-strokewidth", "14", "-draw", "line 600,470 760,330",
        "-stroke", "none", "-fill", "#1a1a1a", "-draw", "roundrectangle 330,610 870,740 18,18",
        "-fill", "#e9e9e9", "-font", "DejaVu-Sans-Bold", "-pointsize", "84", "-gravity", "northwest",
        "-annotate", "+368+626", `${text} km`,
        "-fill", "#9a9a9a", "-pointsize", "34", "-annotate", "+340+770", "ODOMETER",
        "-blur", "0x1.2", file,
    ]);
    return file;
};

/* ------------------------------------------------------------------ the story */

const state = { users: {}, vehicles: {}, odometer: {}, count: { routes: 0, complaints: 0, fuels: 0, oils: 0, repairs: 0 }, routesDone: {} };
const busy = new Set();
const out = new Set();
/* Drivers who keep an open route: they start no other one (RB02). */
const withOpenRoute = new Set();
const sums = { fuels: 0, oils: 0, repairs: 0 };

const createRecord = async (collection, body, createdAt) => {
    const record = await api("POST", `/api/collections/${collection}/records`, createdAt ? { ...body, seed_created: createdAt } : body);
    state.count[collection] += 1;
    return record;
};

/** Registers a service record the day of a route, done by the driver of that route. */
const serviceRecord = async (kind, plan, vehicleKey) => {
    const vehicle = VEHICLES[vehicleKey];
    const km = plan.kmDeparture + Math.floor(plan.inc * (kind === "fuels" ? 0.4 : 0.5));
    const at = later(plan.departedAt, kind === "fuels" ? between(60, 120) : between(25, 70));
    if (isFuture(at)) return;
    const base = { vehicle: state.vehicles[vehicleKey], user: state.users[plan.user] };
    if (kind === "fuels") {
        const cents = Math.round(FUEL_BASE[vehicle.type] * (0.8 + random() * 0.4) * 100);
        const choice = { moto: ["gasolina", 620], caminhao: ["diesel", 610], van: random() < 0.33 ? ["aditivada", 660] : ["diesel", 610], carro: pick([["etanol", 440], ["gasolina", 620], ["aditivada", 660]]) }[vehicle.type];
        await createRecord("fuels", { ...base, km_fuel: km, type: choice[0], liters: Number((cents / choice[1]).toFixed(2)), cost: Number(money(cents)) }, at);
        sums.fuels += cents;
    } else if (kind === "oils") {
        const cents = Math.round(OIL_BASE[vehicle.type] * (0.9 + random() * 0.2) * 100);
        await createRecord("oils", { ...base, km_oil: km, type: pick(OIL_TYPES), cost: Number(money(cents)) }, at);
        sums.oils += cents;
    } else {
        const [description, price] = plan.repair ? REPAIRS.find((r) => r[0] === plan.repair) : pick(REPAIRS);
        const cents = Math.round(price * REPAIR_MULT[vehicle.type] * (0.85 + random() * 0.3) * 100);
        await createRecord("repairs", { ...base, km_repair: km, description, cost: Number(money(cents)) }, at);
        sums.repairs += cents;
    }
};

/** Runs one route through its whole life: open, complaint, review, return or closing, then the dates. */
const runRoute = async (plan) => {
    const vehicleId = state.vehicles[plan.v];
    const userId = state.users[plan.u];
    const final = plan.final || "finalizada";
    const vehicle = VEHICLES[plan.v];
    const [lo, hi] = KM_PER_ROUTE[vehicle.type];
    plan.inc = plan.inc || between(lo, hi);
    plan.kmDeparture = state.odometer[plan.v];
    plan.user = plan.u;
    plan.hour = plan.hour ?? between(7, 11);
    plan.departedAt = stamp(plan.d, plan.hour, between(0, 59));

    const route = await createRecord("routes", {
        vehicle: vehicleId, user: userId, status: "aberta", itinerary: plan.itinerary,
        km_departure: plan.kmDeparture, obs_departure: plan.obsDeparture || (random() < 0.25 ? pick(OBS_DEPARTURE) : ""),
    });
    const dates = { date_departure: plan.departedAt };

    if (plan.complaint) {
        const kmComplaint = plan.kmDeparture + plan.complaint.delta;
        const complaint = new FormData();
        complaint.set("route_current", route.id);
        complaint.set("km_complaint", String(kmComplaint));
        complaint.set("status", "pendente");
        complaint.set("photo", new Blob([readFileSync(odometerPhoto(kmComplaint))], { type: "image/png" }), "painel.png");
        const created = await api("POST", "/api/collections/complaints/records", complaint);
        state.count.complaints += 1;
        const complaintDates = { created: later(plan.departedAt, plan.complaint.hoursAfter * 60 + between(5, 40)) };
        if (isFuture(complaintDates.created)) complaintDates.created = new Date(Date.now() - 10 * 60e3).toISOString().replace("T", " ");
        if (plan.complaint.outcome !== "pendente") {
            await api("PATCH", `/api/collections/complaints/records/${created.id}`, { status: plan.complaint.outcome });
            complaintDates.reviewed = stamp(plan.d - plan.complaint.reviewDaysLater, between(9, 11), between(0, 59));
            if (plan.complaint.outcome === "aprovada") plan.kmDeparture = kmComplaint;
        }
        await backdate("complaints", created.id, complaintDates);
    }

    if (final === "finalizada") {
        const kmReturn = plan.kmDeparture + plan.inc;
        await api("PATCH", `/api/collections/routes/records/${route.id}`, {
            status: "finalizada", km_return: kmReturn, obs_return: plan.obsReturn || (random() < 0.35 ? pick(OBS_RETURN) : ""),
        });
        dates.date_return = later(plan.departedAt, between(180, 520));
        if (isFuture(dates.date_return)) dates.date_return = stamp(plan.d, 23);
        state.odometer[plan.v] = kmReturn;
        for (const kind of ["fuels", "oils", "repairs"]) {
            const wanted = { fuels: plan.fuel ?? random() < 0.45, oils: plan.oil ?? false, repairs: Boolean(plan.repair) };
            if (wanted[kind]) await serviceRecord(kind, plan, plan.v);
        }
        state.routesDone[plan.v] = (state.routesDone[plan.v] || 0) + 1;
        const n = state.routesDone[plan.v];
        if (plan.oil === undefined && n % 4 === 0) await serviceRecord("oils", plan, plan.v);
        if (plan.repair === undefined && n % 7 === Object.keys(VEHICLES).indexOf(plan.v) % 7) await serviceRecord("repairs", plan, plan.v);
    } else if (final === "encerrada") {
        await api("PATCH", `/api/collections/routes/records/${route.id}`, { status: "encerrada" });
    } else {
        out.add(plan.v);
        withOpenRoute.add(plan.u);
    }
    await backdate("routes", route.id, dates);
    busy.add(`${plan.d}:${plan.u}`);
};

/** Walks the days from oldest to newest and runs the scripted routes plus the random history. */
const history = async () => {
    const nextDue = {};
    const blockedUntil = {};
    const gap = (d) => (d >= 21 ? between(11, 17) : between(4, 6));
    for (const key of Object.keys(VEHICLES)) nextDue[key] = HISTORY_DAYS - between(0, 12);
    for (let d = HISTORY_DAYS; d >= 0; d -= 1) {
        const weekday = new Date(today() - d * 86400e3).getUTCDay();
        const scripted = SCRIPTED.filter((plan) => plan.d === d);
        /* The people of the scripted routes are taken for the day before any random route picks them. */
        for (const plan of scripted) busy.add(`${d}:${plan.u}`);
        for (const key of Object.keys(VEHICLES)) {
            if (out.has(key)) continue;
            const plan = scripted.find((item) => item.v === key);
            if (plan) {
                await runRoute({ ...plan });
                if (plan.final === "encerrada") blockedUntil[key] = d - plan.closedDaysLater;
                nextDue[key] = d - gap(d);
                continue;
            }
            /* No random route in the 3 days before a scripted one, so the scripted route follows a known one. */
            const beforeScripted = SCRIPTED.some((item) => item.v === key && item.d < d && item.d >= d - 3);
            if (weekday === 0 || d > nextDue[key] || beforeScripted || (blockedUntil[key] ?? -1) >= d) continue;
            const driver = VEHICLES[key].drivers.find((u) => {
                const left = USERS[u].leftDaysAgo;
                return !busy.has(`${d}:${u}`) && !withOpenRoute.has(u) && (left === undefined || d >= left);
            });
            if (!driver) continue;
            const withComplaint = (state.routesDone[key] || 0) >= 1 && state.count.routes % 9 === 4 && d > 20;
            await runRoute({
                d, v: key, u: driver, itinerary: pick(ITINERARIES),
                complaint: withComplaint
                    ? { delta: pick([-22, -15, -8, 12, 19]), outcome: random() < 0.6 ? "aprovada" : "reprovada", hoursAfter: 2, reviewDaysLater: 1 }
                    : undefined,
            });
            nextDue[key] = d - gap(d);
        }
        if (d % 30 === 0) console.log(`  ... faltam ${d} dias (${state.count.routes} rotas)`);
    }
};

const create = async () => {
    if ((await list("users", demoUsersFilter("email"), "&fields=id")).length > 0) {
        throw new Error("Já existem usuários de demonstração. Rode com --clean antes.");
    }
    const password = process.env.DEMO_PASSWORD || (await prompt("Senha dos usuários de demonstração (8+ caracteres): ", true));
    if (password.length < 8) throw new Error("A senha precisa de 8 ou mais caracteres.");

    for (const [key, user] of Object.entries(USERS)) {
        const record = await api("POST", "/api/collections/users/records", {
            email: emailOf(key), emailVisibility: true, password, passwordConfirm: password, name: user.name, role: user.role, active: true,
        });
        state.users[key] = record.id;
    }
    for (const [key, vehicle] of Object.entries(VEHICLES)) {
        const record = await api("POST", "/api/collections/vehicles/records", {
            plate: vehicle.plate, type: vehicle.type, model: vehicle.model, odometer: vehicle.start, active: true,
        });
        state.vehicles[key] = record.id;
        state.odometer[key] = vehicle.start;
    }
    console.log(`Usuários e veículos criados. Rotas e registros (isso leva alguns minutos)...`);
    await history();

    for (const [key, vehicle] of Object.entries(VEHICLES)) {
        if (vehicle.inactive) await api("PATCH", `/api/collections/vehicles/records/${state.vehicles[key]}`, { active: false });
    }
    for (const [key, user] of Object.entries(USERS)) {
        if (user.inactive) await api("PATCH", `/api/collections/users/records/${state.users[key]}`, { active: false });
    }
    const total = sums.fuels + sums.oils + sums.repairs;
    console.log(`\nCriados: ${state.count.routes} rotas, ${state.count.complaints} denúncias, ${state.count.fuels} abastecimentos, ${state.count.oils} trocas de óleo, ${state.count.repairs} manutenções (${requests} requisições).`);
    console.log(`Total de custos R$ ${money(total)}: abastecimento ${Math.round((sums.fuels * 100) / total)}%, troca de óleo ${Math.round((sums.oils * 100) / total)}%, manutenção ${Math.round((sums.repairs * 100) / total)}%.`);
};

/* ------------------------------------------------------------------ main */

/** True while this run owns a copy of the hook in the hooks folder, so only then is it removed. */
let hookInstalled = false;

/** Copies the hook into the hooks folder and waits (up to 15 s) for the server to load it. */
const installHook = async () => {
    copyFileSync(HOOK_SOURCE, HOOK_TARGET);
    hookInstalled = true;
    for (let attempt = 0; attempt < 30; attempt++) {
        try {
            await api("GET", "/api/seed/ping");
            console.log("Hook temporário carregado pelo servidor.");
            return;
        } catch (error) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }
    throw new Error(`O servidor não carregou o hook em ${HOOK_TARGET}. A pasta é a que ele observa (HOOKS_DIR)?`);
};

/** Removes the hook this run copied; it never touches a copy somebody else put there. */
const removeHook = () => {
    if (hookInstalled && existsSync(HOOK_TARGET)) {
        rmSync(HOOK_TARGET, { force: true });
        hookInstalled = false;
        console.log("Hook temporário removido.");
    }
};

/** Asks for a confirmation before writing to a server that is not on this machine (unless --yes). */
const confirmWrite = async (action) => {
    if (ASSUME_YES || /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(PB_URL)) return;
    const answer = await prompt(`Servidor ${PB_URL}. Vai ${action}. Digite "sim" para continuar: `);
    if (answer.trim().toLowerCase() !== "sim") throw new Error("Cancelado.");
};

process.on("SIGINT", () => {
    removeHook();
    process.exit(130);
});

const main = async () => {
    if (DRY_RUN) {
        console.log("DRY_RUN: nada é enviado.");
        console.log(`Usuários: ${Object.keys(USERS).map(emailOf).join(", ")}`);
        console.log(`Veículos: ${Object.values(VEHICLES).map((v) => `${v.plate} ${v.model}`).join(", ")}`);
        console.log(`Rotas roteirizadas: ${SCRIPTED.length}, mais o histórico aleatório de ${HISTORY_DAYS} dias.`);
        return;
    }
    await confirmWrite(CLEAN ? "apagar os dados de demonstração" : RESET ? "apagar e recriar os dados de demonstração" : "criar os dados de demonstração");
    const email = process.env.SU_EMAIL || (await prompt("E-mail do superusuário: "));
    const pass = process.env.SU_PASS || (await prompt("Senha do superusuário: ", true));
    const auth = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identity: email, password: pass }),
    });
    if (!auth.ok) throw new Error(`Login do superusuário recusado (${auth.status}).`);
    token = (await auth.json()).token;
    if (AUTO_HOOK) await installHook();
    try {
        await api("GET", "/api/seed/ping");
    } catch (error) {
        throw new Error("O hook seed/seed_backdate.pb.js não está ativo. Rode com --auto-hook, ou copie-o para a pasta de hooks do servidor e espere 2 s.");
    }
    if (CLEAN) {
        await clean();
        return;
    }
    if (RESET) {
        console.log("Apagando os dados de demonstração atuais...");
        await clean();
    }
    const strangers = (await list("vehicles", "id != ''", "&fields=plate")).filter((v) => !Object.values(VEHICLES).some((demo) => demo.plate === v.plate));
    if (strangers.length > 0) {
        console.warn(`Atenção: existem ${strangers.length} veículos que não são de demonstração (${strangers.map((v) => v.plate).join(", ")}). Eles aparecerão nas telas e nos relatórios.`);
    }
    await create();
    if (!AUTO_HOOK) console.log("\nAgora apague seed_backdate.pb.js de backend/pb_hooks.");
};

main()
    .catch((error) => {
        console.error(`\nErro: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(() => {
        removeHook();
        if (photoDir) rmSync(photoDir, { recursive: true, force: true });
    });
