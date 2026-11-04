import {
    formatCurrency,
    formatDay,
    formatDistance,
    formatInitials,
    formatTime,
} from '../schemas/masks';
import { VEHICLE_TYPES } from '../schemas/vehicle';
import { complaintsLabel, COMPLAINT_STATUSES, roleLabel } from './complaintTotals';
import type {
    ComplaintReport,
    DriverComplaints,
    StatusCounts,
    VehicleComplaints,
} from './complaintTotals';
import type { KmReport, VehicleKm } from './kmTotals';
import { buildCharts, chartToSvg, SERVICE_COLORS, STATUS_COLORS } from './reportCharts';
import type { Chart } from './reportCharts';
import { vehicleIconSvg } from './reportIcons';
import { countLabel } from './reportTotals';
import type { Report, ReportVehicle, ServiceTotal, VehicleTotals } from './reportTotals';
import type { ServiceKind } from './serviceRecords';

/** One filter of a report as the user reads it: its name and its text. A `wide` one takes the whole row. */
export type ReportFilter = { label: string; text: string; wide?: boolean };

/** The filters of a report, in the order they are printed under the title. */
export type ReportFilters = readonly ReportFilter[];

/** A font file of the document, as base64, for one weight. */
export type ReportFontFace = { weight: number; base64: string };

/** What the report document is made of: the report, the filters it was asked with, and when it was issued. */
export type ReportDocumentInput = {
    report: Report;
    filters: ReportFilters;
    /** The services the report lists, in order; a service filtered out is not here. */
    services: readonly { value: ServiceKind; label: string }[];
    issuedAt: Date;
    /** Geom, carried inside the page; without it the document uses the font of the system. */
    fonts?: readonly ReportFontFace[];
};

/** Width of the drawing of a chart, in its own units: about the width of a card on the page, so the text keeps its size. */
const CHART_WIDTH = 480;

/** Size of the text of the charts: the same as the lines of the report (12px), so they read alike. */
const CHART_TEXT = 12;

/** Escapes the text of a record before it goes into the markup: a model is typed by a person. */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Label of a vehicle type as the user reads it ("caminhao" is "Caminhão"). */
function typeName(type: string): string {
    return VEHICLE_TYPES.find((item) => item.value === type)?.label ?? type;
}

/**
 * A group of blocks under a title. The title is kept in one piece with the first block, so a page
 * never ends on a title alone (`break-after: avoid` is not honored by every print engine when the
 * block that follows must not be split either).
 */
function titled(title: string, blocks: readonly string[]): string {
    const [first = '', ...rest] = blocks;

    return `<div class="keep"><h2>${title}</h2>
${first}</div>
${rest.join('\n')}`;
}

/** One line of a block: a colored dot, a name with an optional line of detail under it, and a value at the end. */
function line(color: string, name: string, detail: string | null, value: string): string {
    return `<div class="line">
    <span class="dot" style="background:${color}"></span>
    <span class="grow"><span class="name">${escapeHtml(name)}</span>${detail === null ? '' : `<br><span class="muted">${escapeHtml(detail)}</span>`}</span>
    <span class="value">${escapeHtml(value)}</span>
</div>`;
}

/** One line of a block: the service with its color, how many records and what they add up to. */
function serviceLine(kind: ServiceKind, label: string, total: ServiceTotal): string {
    return line(SERVICE_COLORS[kind], label, countLabel(total.count), formatCurrency(total.total));
}

/** A plain row of a block: a label at the start and a value at the end, with no dot. */
function fact(label: string, value: string): string {
    return `<div class="fact"><span>${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></div>`;
}

/**
 * The top of a vehicle block: the icon of its type in a gray box (as on screen), its plate and
 * "model · type" next to it and a value at the end.
 */
function vehicleTop(vehicle: ReportVehicle, value: string): string {
    return `<div class="vehicle-top">
        <div class="icon-box">${vehicleIconSvg(vehicle.type, 20)}</div>
        <div class="grow">
            <div class="plate">${escapeHtml(vehicle.plate)}</div>
            <div class="muted">${escapeHtml(vehicle.model)} · ${typeName(vehicle.type)}</div>
        </div>
        <div class="plate">${escapeHtml(value)}</div>
    </div>`;
}

/** The note under an inactive vehicle, or nothing for an active one (RB12). */
function inactiveNote(vehicle: ReportVehicle): string {
    return vehicle.active ? '' : '<div class="note">Veículo inativo</div>';
}

/** The block of one vehicle: who it is, its total, the total of each service and, if inactive, a note (RB12). */
function vehicleBlock(totals: VehicleTotals, services: ReportDocumentInput['services']): string {
    const lines = services
        .map(({ value, label }) => serviceLine(value, label, totals.services[value]))
        .join('\n');

    return `<section class="card vehicle">
    ${vehicleTop(totals.vehicle, formatCurrency(totals.total))}
    <hr>
    <div class="lines">${lines}</div>
    ${inactiveNote(totals.vehicle)}
</section>`;
}

/** The bar that shows how the general total splits among the services, drawn only when there is more than one. */
function proportionBar(report: Report, services: ReportDocumentInput['services']): string {
    if (services.length < 2 || report.total <= 0) {
        return '';
    }

    const parts = services
        .map(
            ({ value }) =>
                `<div style="flex:${report.services[value].total};background:${SERVICE_COLORS[value]}"></div>`,
        )
        .join('');

    return `<div class="stack">${parts}</div>`;
}

/** The card of a chart: its title and description over the drawing. */
function chartCard(chart: Chart): string {
    return `<section class="card">
    <div class="chart-title">${escapeHtml(chart.title)}</div>
    <div class="muted">${escapeHtml(chart.description)}</div>
    <hr>
    ${chartToSvg(chart)}
</section>`;
}

/** The `@font-face` rules that carry the fonts inside the page, as the printer cannot read the files of the app. */
function fontRules(fonts: readonly ReportFontFace[]): string {
    return fonts
        .map(
            ({ weight, base64 }) =>
                `@font-face { font-family: 'Geom'; font-weight: ${weight}; src: url(data:font/ttf;base64,${base64}) format('truetype'); }`,
        )
        .join('\n');
}

/** Styles of the document: gray scale like the app, a page margin, and blocks that never split across pages. */
const STYLES = `
@page { margin: 14mm; }
* { box-sizing: border-box; }
body {
    margin: 0;
    color: #202020;
    font-family: 'Geom', -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
h1 { margin: 0; font-size: 22px; }
h2 { margin: 20px 0 8px; font-size: 13px; color: #606060; break-after: avoid; page-break-after: avoid; }
hr { border: 0; border-top: 1px solid #E0E0E0; margin: 8px 0; }
.muted { color: #606060; }
.grow { flex: 1; }
.head { display: flex; justify-content: space-between; align-items: flex-end; }
.filters { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-top: 12px; padding: 10px 12px; border: 1px solid #E0E0E0; border-radius: 8px; }
.filter.wide { grid-column: 1 / -1; }
.filter .label { display: block; color: #606060; font-size: 11px; }
.filter .text { font-weight: 500; }
.keep { break-inside: avoid; page-break-inside: avoid; }
.card { border: 1px solid #E0E0E0; border-radius: 8px; padding: 10px 12px; margin-top: 10px; break-inside: avoid; page-break-inside: avoid; }
.total-box { text-align: center; }
.total { font-size: 24px; font-weight: 700; }
.stack { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: #E0E0E0; margin: 8px 0; }
.lines { margin-top: 8px; }
.line { display: flex; align-items: flex-start; gap: 10px; margin-top: 8px; }
.line:first-child { margin-top: 0; }
.dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 4px; }
.name { font-weight: 500; }
.value { font-weight: 600; text-align: right; }
.vehicle-top { display: flex; align-items: flex-start; gap: 10px; }
.plate { font-size: 14px; font-weight: 600; }
.icon-box { flex: none; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; background: #E0E0E0; color: #202020; }
.initials { flex: none; width: 34px; height: 34px; border-radius: 50%; background: #E0E0E0; color: #404040; font-size: 13px; font-weight: 600; line-height: 34px; text-align: center; }
.chart-title { font-size: 13px; font-weight: 600; }
.note { margin-top: 8px; color: #606060; }
.fact { display: flex; justify-content: space-between; gap: 10px; margin-top: 8px; }
.fact:first-child { margin-top: 0; }
`;

/** What every report document is made of: the title, the filters it was asked with, the body and when it was issued. */
type DocumentShell = {
    title: string;
    filters: ReportFilters;
    body: string;
    issuedAt: Date;
    fonts: readonly ReportFontFace[];
};

/**
 * Wraps the body of a report in the page every report shares: the title and the date of issue on
 * top, the filters under them, then the body. The same shell, fonts and styles make the three
 * reports read as one family.
 */
function documentHtml({ title, filters, body, issuedAt, fonts }: DocumentShell): string {
    const issued = `${formatDay(issuedAt)}, ${formatTime(issuedAt)}`;
    const items = filters
        .map(
            ({ label, text, wide }) =>
                `<div class="filter${wide ? ' wide' : ''}"><span class="label">${escapeHtml(label)}</span><span class="text">${escapeHtml(text)}</span></div>`,
        )
        .join('\n    ');

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${fontRules(fonts)}${STYLES}</style>
</head>
<body>
<div class="head">
    <h1>${escapeHtml(title)}</h1>
    <div class="muted">TRACE · Emitido em ${issued}</div>
</div>

<section class="filters">
    ${items}
</section>

${body}
</body>
</html>`;
}

/**
 * Builds the HTML the financial report is printed from (RF22). It has what the screen has, in the
 * same order and with the same numbers, because it is made from the report the screen shows: the
 * total and the total of each service, then one block per vehicle with its own total and the
 * total of each service. On top it has what the screen keeps in its filters: the period, the
 * vehicle type, the service and the date of issue. The charts of the screen come after the total.
 * The document is one sequence, with no forced page break: a card (the total, a chart or a
 * vehicle) never breaks across a page, so a long report breaks between cards.
 */
export function buildReportHtml({
    report,
    filters,
    services,
    issuedAt,
    fonts = [],
}: ReportDocumentInput) {
    const general = services
        .map(({ value, label }) => serviceLine(value, label, report.services[value]))
        .join('\n');
    const vehicles = report.vehicles.map((totals) => vehicleBlock(totals, services));
    const charts = Object.values(buildCharts(report, services, CHART_WIDTH, CHART_TEXT)).filter(
        (chart): chart is Chart => chart !== null,
    );

    return documentHtml({
        title: 'Relatório financeiro',
        filters,
        issuedAt,
        fonts,
        body: `<section class="card">
    <div class="total-box">
        <div class="muted">Total no período</div>
        <div class="total">${formatCurrency(report.total)}</div>
    </div>
    ${proportionBar(report, services)}
    <div class="lines">${general}</div>
</section>

${charts.length > 0 ? titled('Gráficos', charts.map(chartCard)) : ''}

${titled('Por veículo', vehicles)}`,
    });
}

/** What the km report document is made of: the report, the filters it was asked with, and when it was issued. */
export type KmDocumentInput = {
    report: KmReport;
    filters: ReportFilters;
    issuedAt: Date;
    fonts?: readonly ReportFontFace[];
};

/** The block of one vehicle in the km report: who it is, the km it drove and how many routes made them (RB12). */
function kmVehicleBlock({ vehicle, routes, km }: VehicleKm): string {
    return `<section class="card vehicle">
    ${vehicleTop(vehicle, formatDistance(km))}
    <hr>
    ${fact('Rotas finalizadas', String(routes))}
    ${inactiveNote(vehicle)}
</section>`;
}

/**
 * Builds the HTML the km report is printed from (RF23): the total km and routes of the period,
 * then one block per vehicle. Same shell, styles and cards as the financial report, with the
 * numbers of the screen.
 */
export function buildKmReportHtml({ report, filters, issuedAt, fonts = [] }: KmDocumentInput) {
    return documentHtml({
        title: 'Relatório de km rodados',
        filters,
        issuedAt,
        fonts,
        body: `<section class="card">
    <div class="total-box">
        <div class="muted">Km rodados no período</div>
        <div class="total">${formatDistance(report.km)}</div>
    </div>
    <hr>
    ${fact('Rotas finalizadas', String(report.routes))}
    ${fact('Veículos', String(report.vehicles.length))}
</section>

${titled('Por veículo', report.vehicles.map(kmVehicleBlock))}`,
    });
}

/** What the complaints report document is made of: the report, the filters it was asked with, and when it was issued. */
export type ComplaintDocumentInput = {
    report: ComplaintReport;
    filters: ReportFilters;
    issuedAt: Date;
    fonts?: readonly ReportFontFace[];
};

/** The three lines of a block, one per situation, with its count. */
function statusLines(counts: StatusCounts): string {
    return COMPLAINT_STATUSES.map(({ value, label }) =>
        line(STATUS_COLORS[value], label, null, String(counts[value])),
    ).join('\n');
}

/** The block of one vehicle in the complaints report: who it is, its complaints and how they stand (RB12). */
function complaintVehicleBlock({ vehicle, counts, total }: VehicleComplaints): string {
    return `<section class="card vehicle">
    ${vehicleTop(vehicle, complaintsLabel(total))}
    <hr>
    <div class="lines">${statusLines(counts)}</div>
    ${inactiveNote(vehicle)}
</section>`;
}

/** The block of one driver in the complaints report: their name, their complaints and how they stand. */
function complaintDriverBlock({ driver, counts, total }: DriverComplaints): string {
    return `<section class="card vehicle">
    <div class="vehicle-top">
        <div class="initials">${escapeHtml(formatInitials(driver.name))}</div>
        <div class="grow">
            <div class="plate">${escapeHtml(driver.name)}</div>
            <div class="muted">${roleLabel(driver.role)}</div>
        </div>
        <div class="plate">${complaintsLabel(total)}</div>
    </div>
    <hr>
    <div class="lines">${statusLines(counts)}</div>
</section>`;
}

/** The bar that shows how the complaints split among the three situations, drawn only when there are any. */
function statusBar(report: ComplaintReport): string {
    if (report.total <= 0) {
        return '';
    }

    const parts = COMPLAINT_STATUSES.map(
        ({ value }) =>
            `<div style="flex:${report.counts[value]};background:${STATUS_COLORS[value]}"></div>`,
    ).join('');

    return `<div class="stack">${parts}</div>`;
}

/**
 * Builds the HTML the complaints report is printed from (RF23): the total and the count of each
 * situation, then one block per vehicle and one per driver, each with its own count of each
 * situation. Same shell, styles and cards as the financial report, with the numbers of the screen.
 */
export function buildComplaintReportHtml({
    report,
    filters,
    issuedAt,
    fonts = [],
}: ComplaintDocumentInput) {
    return documentHtml({
        title: 'Relatório de denúncias',
        filters,
        issuedAt,
        fonts,
        body: `<section class="card">
    <div class="total-box">
        <div class="muted">Denúncias no período</div>
        <div class="total">${report.total}</div>
    </div>
    ${statusBar(report)}
    <div class="lines">${statusLines(report.counts)}</div>
</section>

${titled('Por veículo', report.vehicles.map(complaintVehicleBlock))}

${titled('Por motorista', report.drivers.map(complaintDriverBlock))}`,
    });
}
