import { formatCurrency } from '../schemas/masks';
import type { ComplaintStatus } from './complaints';
import type { MonthTotal, Report } from './reportTotals';
import type { ServiceKind } from './serviceRecords';

/** A shape of a chart, in the units of its own drawing: the screen and the PDF both draw these. */
export type Shape =
    | { type: 'rect'; x: number; y: number; width: number; height: number; fill: string }
    | { type: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string }
    | { type: 'polyline'; points: { x: number; y: number }[]; stroke: string; strokeWidth: number }
    | { type: 'polygon'; points: { x: number; y: number }[]; fill: string }
    | { type: 'circle'; cx: number; cy: number; r: number; fill: string }
    | {
          type: 'text';
          x: number;
          y: number;
          text: string;
          anchor: 'start' | 'middle' | 'end';
          size: number;
          weight: 400 | 500 | 600;
          fill: string;
      };

/** A chart ready to draw: what to say about it above, how big the drawing is, and its shapes. */
export type Chart = {
    title: string;
    description: string;
    width: number;
    height: number;
    shapes: Shape[];
};

/** The charts of a report; each is `null` when the report has too little to draw it. */
export type ReportCharts = { top: Chart | null; monthly: Chart | null };

/** Color of each service, the same as the proportion bar and the dots of the screen (palette g20, g80 and gC0). */
export const SERVICE_COLORS: Record<ServiceKind, string> = {
    fuel: '#202020',
    oil: '#808080',
    repair: '#C0C0C0',
};

/** Color of each situation of a complaint in the proportion bar and the dots of the complaints report: the same three grays. */
export const STATUS_COLORS: Record<ComplaintStatus, string> = {
    pendente: '#202020',
    aprovada: '#808080',
    reprovada: '#C0C0C0',
};

const TEXT = '#202020';
const MUTED = '#606060';
const GRID = '#E0E0E0';
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** How many vehicles the bar chart names; the others are added up in one bar. */
const TOP_LIMIT = 5;

/** What a service adds up to, per service, for one bar. */
type Bar = { label: string; total: number; parts: Record<ServiceKind, number> };

/**
 * The bars of the first chart: the vehicles that cost most, largest first, and, if there are more
 * than `TOP_LIMIT`, one last bar with the rest, so that the bars add up to the general total.
 * Sums are made in cents.
 */
function topBars(report: Report): Bar[] {
    const sorted = [...report.vehicles].sort(
        (a, b) => b.total - a.total || (a.vehicle.plate < b.vehicle.plate ? -1 : 1),
    );
    const bars: Bar[] = sorted.slice(0, TOP_LIMIT).map((line) => ({
        label: line.vehicle.plate,
        total: line.total,
        parts: {
            fuel: line.services.fuel.total,
            oil: line.services.oil.total,
            repair: line.services.repair.total,
        },
    }));
    const rest = sorted.slice(TOP_LIMIT);

    if (rest.length > 0) {
        const cents = { fuel: 0, oil: 0, repair: 0 };

        for (const line of rest) {
            for (const kind of ['fuel', 'oil', 'repair'] as const) {
                cents[kind] += Math.round(line.services[kind].total * 100);
            }
        }

        bars.push({
            label: `Outros (${rest.length})`,
            total: (cents.fuel + cents.oil + cents.repair) / 100,
            parts: { fuel: cents.fuel / 100, oil: cents.oil / 100, repair: cents.repair / 100 },
        });
    }

    return bars;
}

/**
 * Width of a text in Geom, estimated from the average advance of the letters of the labels (about
 * 0.53 of the size), good enough to center a legend and to reserve room for the axis labels.
 */
function textWidth(text: string, size: number): number {
    return text.length * size * 0.53;
}

/**
 * The legend of a chart: a dot and the name of each service in its color, centered in `width`,
 * 16 below `top`. Returns the shapes and the height the chart has with the legend. `size` is the
 * size of the text of the chart; the legend is 2 smaller.
 */
function legend(
    services: readonly { value: ServiceKind; label: string }[],
    width: number,
    top: number,
    size: number,
): { shapes: Shape[]; height: number } {
    const legendSize = size - 2;
    const radius = Math.round(legendSize * 0.33);
    const spacing = 16;
    const widths = services.map(({ label }) => radius * 2 + 6 + textWidth(label, legendSize));
    const total = widths.reduce((sum, item) => sum + item, 0) + spacing * (services.length - 1);
    const center = top + 16 + legendSize / 2;
    const shapes: Shape[] = [];
    let x = Math.max(0, (width - total) / 2);

    services.forEach(({ value, label }, index) => {
        shapes.push({
            type: 'circle',
            cx: x + radius,
            cy: center,
            r: radius,
            fill: SERVICE_COLORS[value],
        });
        shapes.push({
            type: 'text',
            x: x + radius * 2 + 6,
            y: center + legendSize * 0.35,
            text: label,
            anchor: 'start',
            size: legendSize,
            weight: 400,
            fill: MUTED,
        });
        x += widths[index] + spacing;
    });

    return { shapes, height: top + 16 + legendSize + 2 };
}

/**
 * Chart of the vehicles that cost most (RF22): one block per vehicle with its plate on the left
 * and its total on the right, as in the lines of the report, and under them a bar as wide as the
 * space allows, split into the services in the colors of the report. A legend, centered, closes
 * it when there is more than one service. Drawn only with two vehicles or more. `size` is the
 * size of the text, and the bars and the spaces follow it.
 */
function topChart(
    report: Report,
    services: readonly { value: ServiceKind; label: string }[],
    width: number,
    size: number,
): Chart | null {
    if (report.vehicles.length < 2) {
        return null;
    }

    const lineHeight = Math.round(size * 1.4);
    const barHeight = Math.round(size * 0.85);
    const gap = Math.round(size * 1.1);
    const rowHeight = lineHeight + 4 + barHeight + gap;
    const bars = topBars(report);
    const scale = width / Math.max(...bars.map((bar) => bar.total), 0.01);
    const shapes: Shape[] = [];

    bars.forEach((bar, index) => {
        const y = index * rowHeight;
        let x = 0;

        shapes.push({
            type: 'text',
            x: 0,
            y: y + size,
            text: bar.label,
            anchor: 'start',
            size,
            weight: 500,
            fill: TEXT,
        });
        shapes.push({
            type: 'text',
            x: width,
            y: y + size,
            text: formatCurrency(bar.total),
            anchor: 'end',
            size,
            weight: 600,
            fill: TEXT,
        });

        for (const { value } of services) {
            const part = bar.parts[value] * scale;

            if (part > 0) {
                shapes.push({
                    type: 'rect',
                    x,
                    y: y + lineHeight + 4,
                    width: part,
                    height: barHeight,
                    fill: SERVICE_COLORS[value],
                });
                x += part;
            }
        }
    });

    let height = bars.length * rowHeight - gap;

    if (services.length > 1) {
        const closing = legend(services, width, height, size);

        shapes.push(...closing.shapes);
        height = closing.height;
    }

    return {
        title: 'Custo por veículo',
        description: 'Os veículos de maior custo no período, por serviço.',
        width,
        height,
        shapes,
    };
}

/** The smallest round number (1, 2, 2.5, 5 or 10 times a power of ten) that is not below the value. */
function niceMax(value: number): number {
    if (value <= 0) {
        return 1;
    }

    const power = 10 ** Math.floor(Math.log10(value));

    return ([1, 2, 2.5, 5, 10].map((step) => step * power).find((max) => max >= value) ??
        10 * power) as number;
}

/** "nov/26" for November of 2026. */
function monthLabel({ year, month }: MonthTotal): string {
    return `${MONTHS[month]}/${String(year % 100).padStart(2, '0')}`;
}

/**
 * Chart of the cost by month (RF22): the services stacked, each as a band between its line and
 * the line of the services below it, so the top edge is the total of the month and the width of
 * each band is what that service cost. Three values of reference at the side, and a legend when
 * there is more than one service. Drawn only with three months or more, which leaves out "Este
 * mês" and "Mês anterior", where there is nothing to compare. The room for the labels follows
 * `size`, the size of the text.
 */
function monthlyChart(
    report: Report,
    services: readonly { value: ServiceKind; label: string }[],
    width: number,
    size: number,
): Chart | null {
    const months = report.months;

    if (months.length < 3) {
        return null;
    }

    const small = size - 2;
    const max = niceMax(Math.max(...months.map((month) => month.total)));
    const ticks = [0, max / 2, max];
    const labels = ticks.map((tick) => formatCurrency(tick).replace(/,00$/, ''));
    const left = Math.ceil(Math.max(...labels.map((label) => textWidth(label, small)))) + 10;
    const right = Math.ceil(textWidth('nov/26', small) / 2) + 4;
    const top = Math.ceil(small / 2) + 2;
    const plotWidth = width - left - right;
    const plotHeight = Math.round(size * 10);
    const base = top + plotHeight;
    const shapes: Shape[] = [];

    ticks.forEach((tick, index) => {
        const y = base - (tick / max) * plotHeight;

        shapes.push({ type: 'line', x1: left, y1: y, x2: width - right, y2: y, stroke: GRID });
        shapes.push({
            type: 'text',
            x: left - 6,
            y: y + small * 0.35,
            text: labels[index],
            anchor: 'end',
            size: small,
            weight: 400,
            fill: MUTED,
        });
    });

    const step = plotWidth / (months.length - 1);
    const xs = months.map((_, index) => left + index * step);

    /* The line of each service is the sum of it and the services listed before it, in cents. */
    const edges = services.map(({ value }, index) =>
        months.map((month) => {
            const cents = services
                .slice(0, index + 1)
                .reduce((sum, item) => sum + Math.round(month.services[item.value] * 100), 0);

            return base - (cents / 100 / max) * plotHeight;
        }),
    );

    /* Drawn from the top band down, so each lower band covers the lower part of the one above. */
    for (let index = services.length - 1; index >= 0; index -= 1) {
        shapes.push({
            type: 'polygon',
            points: [
                ...xs.map((x, month) => ({ x, y: edges[index][month] })),
                { x: xs[xs.length - 1], y: base },
                { x: xs[0], y: base },
            ],
            fill: SERVICE_COLORS[services[index].value],
        });
    }

    /* A thin white line between the bands, so that neighbouring grays can be told apart. */
    for (let index = 0; index < services.length - 1; index += 1) {
        shapes.push({
            type: 'polyline',
            points: xs.map((x, month) => ({ x, y: edges[index][month] })),
            stroke: '#FFFFFF',
            strokeWidth: 1.5,
        });
    }

    const stride = Math.ceil((textWidth('nov/26', small) + 10) / step);

    months.forEach((month, index) => {
        if (index % stride === 0) {
            shapes.push({
                type: 'text',
                x: xs[index],
                y: base + 8 + small * 0.8,
                text: monthLabel(month),
                anchor: 'middle',
                size: small,
                weight: 400,
                fill: MUTED,
            });
        }
    });

    let height = base + small + 12;

    if (services.length > 1) {
        const closing = legend(services, width, height, size);

        shapes.push(...closing.shapes);
        height = closing.height;
    }

    return {
        title: 'Custo por mês',
        description: 'Total de cada mês do período, por serviço.',
        width,
        height,
        shapes,
    };
}

/**
 * The charts of a report, for the screen and for the PDF alike, so both draw the same ones under
 * the same conditions. `services` are the services the report lists, in order; `width` is the
 * width of the drawing and `size` the size of its text, both in the units of the drawing, which
 * should be the points it is shown in so that the text keeps its size.
 */
export function buildCharts(
    report: Report,
    services: readonly { value: ServiceKind; label: string }[],
    width: number,
    size: number,
): ReportCharts {
    return {
        top: topChart(report, services, width, size),
        monthly: monthlyChart(report, services, width, size),
    };
}

/** Rounds a coordinate to two decimals, to keep the markup short. */
function round(value: number): number {
    return Math.round(value * 100) / 100;
}

/** Escapes text for the markup. */
function escapeText(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** One shape as SVG markup. */
function shapeToSvg(shape: Shape): string {
    switch (shape.type) {
        case 'rect':
            return `<rect x="${round(shape.x)}" y="${round(shape.y)}" width="${round(shape.width)}" height="${round(shape.height)}" fill="${shape.fill}"/>`;
        case 'line':
            return `<line x1="${round(shape.x1)}" y1="${round(shape.y1)}" x2="${round(shape.x2)}" y2="${round(shape.y2)}" stroke="${shape.stroke}" stroke-width="1"/>`;
        case 'polyline':
            return `<polyline points="${shape.points.map((point) => `${round(point.x)},${round(point.y)}`).join(' ')}" fill="none" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`;
        case 'polygon':
            return `<polygon points="${shape.points.map((point) => `${round(point.x)},${round(point.y)}`).join(' ')}" fill="${shape.fill}"/>`;
        case 'circle':
            return `<circle cx="${round(shape.cx)}" cy="${round(shape.cy)}" r="${shape.r}" fill="${shape.fill}"/>`;
        case 'text':
            return `<text x="${round(shape.x)}" y="${round(shape.y)}" text-anchor="${shape.anchor}" font-size="${shape.size}" font-weight="${shape.weight}" fill="${shape.fill}">${escapeText(shape.text)}</text>`;
    }
}

/** The chart as an inline SVG that fills the width it is placed in, for the PDF. */
export function chartToSvg(chart: Chart): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${chart.width} ${chart.height}" style="display:block;width:100%;height:auto">${chart.shapes.map(shapeToSvg).join('')}</svg>`;
}
