import { formatCurrency, formatDay, formatTime } from '../schemas/masks';
import { VEHICLE_TYPES } from '../schemas/vehicle';
import { buildCharts, chartToSvg, SERVICE_COLORS } from './reportCharts';
import type { Chart } from './reportCharts';
import { countLabel } from './reportTotals';
import type { Report, ServiceTotal, VehicleTotals } from './reportTotals';
import type { ServiceKind } from './serviceRecords';

/** The filters of a report as the user reads them, one text each, to print under the title. */
export type ReportFilters = { period: string; type: string; service: string };

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

/** One line of a block: the service with its color, how many records and what they add up to. */
function serviceLine(kind: ServiceKind, label: string, total: ServiceTotal): string {
    return `<div class="line">
    <span class="dot" style="background:${SERVICE_COLORS[kind]}"></span>
    <span class="grow"><span class="name">${escapeHtml(label)}</span><br><span class="muted">${countLabel(total.count)}</span></span>
    <span class="value">${formatCurrency(total.total)}</span>
</div>`;
}

/** The block of one vehicle: who it is, its total, the total of each service and, if inactive, a note (RB12). */
function vehicleBlock(line: VehicleTotals, services: ReportDocumentInput['services']): string {
    const lines = services
        .map(({ value, label }) => serviceLine(value, label, line.services[value]))
        .join('\n');
    const inactive = line.vehicle.active ? '' : '<div class="note">Veículo inativo</div>';

    return `<section class="card vehicle">
    <div class="vehicle-top">
        <div class="grow">
            <div class="plate">${escapeHtml(line.vehicle.plate)}</div>
            <div class="muted">${escapeHtml(line.vehicle.model)} · ${typeName(line.vehicle.type)}</div>
        </div>
        <div class="plate">${formatCurrency(line.total)}</div>
    </div>
    <hr>
    <div class="lines">${lines}</div>
    ${inactive}
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
.chart-title { font-size: 13px; font-weight: 600; }
.note { margin-top: 8px; color: #606060; }
`;

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
    const issued = `${formatDay(issuedAt)}, ${formatTime(issuedAt)}`;
    const general = services
        .map(({ value, label }) => serviceLine(value, label, report.services[value]))
        .join('\n');
    const vehicles = report.vehicles.map((line) => vehicleBlock(line, services)).join('\n');
    const charts = Object.values(buildCharts(report, services, CHART_WIDTH, CHART_TEXT)).filter(
        (chart): chart is Chart => chart !== null,
    );

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório financeiro</title>
<style>${fontRules(fonts)}${STYLES}</style>
</head>
<body>
<div class="head">
    <h1>Relatório financeiro</h1>
    <div class="muted">TRACE · Emitido em ${issued}</div>
</div>

<section class="filters">
    <div class="filter wide"><span class="label">Período</span><span class="text">${escapeHtml(filters.period)}</span></div>
    <div class="filter"><span class="label">Tipo de veículo</span><span class="text">${escapeHtml(filters.type)}</span></div>
    <div class="filter"><span class="label">Tipo de serviço</span><span class="text">${escapeHtml(filters.service)}</span></div>
</section>

<section class="card">
    <div class="total-box">
        <div class="muted">Total no período</div>
        <div class="total">${formatCurrency(report.total)}</div>
    </div>
    ${proportionBar(report, services)}
    <div class="lines">${general}</div>
</section>

${charts.length > 0 ? '<h2>Gráficos</h2>' : ''}
${charts.map(chartCard).join('\n')}

<h2>Por veículo</h2>
${vehicles}
</body>
</html>`;
}
