import {
    CircleDollarSign,
    Droplets,
    FileText,
    Fuel,
    Gauge,
    TriangleAlert,
    Wrench,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Button } from '../components/Button';
import { ChartView } from '../components/ChartView';
import { Card, CardDescription, CardHeader, CardSeparator, CardTitle } from '../components/Card';
import { ComplaintReportView } from '../components/ComplaintReportView';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { FormScrollView } from '../components/FormScrollView';
import { KmReportView } from '../components/KmReportView';
import { LoadingState } from '../components/LoadingState';
import { NoticeDialog } from '../components/NoticeDialog';
import {
    InactiveNote,
    ProportionBar,
    ReportGroup,
    ReportLine,
    ReportLines,
    TotalBox,
    VehicleHead,
} from '../components/ReportParts';
import { Select } from '../components/Select';
import type { SelectOption } from '../components/Select';
import { TextField } from '../components/TextField';
import { VEHICLE_TYPE_OPTIONS } from '../components/vehicleTypeOptions';
import type { VehicleType } from '../components/vehicleTypeOptions';
import { formatCurrency, formatDateInput } from '../schemas/masks';
import { reportPeriodSchema } from '../schemas/report';
import type { ComplaintReport } from '../services/complaintTotals';
import type { KmReport } from '../services/kmTotals';
import { buildCharts, SERVICE_COLORS } from '../services/reportCharts';
import {
    SharingUnavailableError,
    shareComplaintReportPdf,
    shareKmReportPdf,
    shareReportPdf,
} from '../services/reportPdf';
import {
    customRange,
    describeFilters,
    describeKmFilters,
    formatRange,
    loadComplaintReport,
    loadKmReport,
    loadReport,
    REPORT_PERIODS,
    REPORT_SERVICES,
    shortcutRange,
} from '../services/reports';
import type { ReportKind, ReportPeriod, ReportRange } from '../services/reports';
import { countLabel } from '../services/reportTotals';
import type { Report, ServiceTotal, VehicleTotals } from '../services/reportTotals';
import { parseServerError } from '../services/serverErrors';
import type { ServiceKind } from '../services/serviceRecords';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/** The report asked for: which one, what it is about, and which attempt it is, so that a retry is a new one. */
type Request = {
    kind: ReportKind;
    range: ReportRange | null;
    type: VehicleType | null;
    /** The service of the financial report, or `null` for all; always `null` in the others. */
    service: ServiceKind | null;
    attempt: number;
};

/** A report that came back, whichever of the three it is. */
type Loaded =
    | { kind: 'financial'; report: Report }
    | { kind: 'km'; report: KmReport }
    | { kind: 'complaints'; report: ComplaintReport };

/** How a request ended: with the report, or with the message of its failure. */
type Outcome = { status: 'error'; message: string } | { status: 'ready'; loaded: Loaded };

/** Options of the report select, each with its icon. */
const REPORT_OPTIONS: readonly SelectOption<ReportKind>[] = [
    { value: 'financial', label: 'Financeiro', icon: CircleDollarSign },
    { value: 'km', label: 'Km rodados', icon: Gauge },
    { value: 'complaints', label: 'Denúncias', icon: TriangleAlert },
];

/** Reads the report a request asks for. */
async function load(request: Request): Promise<Loaded> {
    switch (request.kind) {
        case 'financial':
            return { kind: 'financial', report: await loadReport(request) };
        case 'km':
            return { kind: 'km', report: await loadKmReport(request) };
        case 'complaints':
            return {
                kind: 'complaints',
                report: await loadComplaintReport(request),
            };
    }
}

/** How many records the report on the screen has: none means there is nothing to print. */
function recordCount(loaded: Loaded): number {
    switch (loaded.kind) {
        case 'financial':
            return loaded.report.count;
        case 'km':
            return loaded.report.routes;
        case 'complaints':
            return loaded.report.total;
    }
}

/** What the empty state says for each report: nothing in the period and the filters. */
const EMPTY: Record<ReportKind, { title: string; description: string }> = {
    financial: {
        title: 'Sem registros',
        description: 'Mude o período ou os filtros para ver os totais.',
    },
    km: {
        title: 'Sem rotas',
        description: 'Nenhuma rota finalizada neste período. Mude o período ou o tipo de veículo.',
    },
    complaints: {
        title: 'Sem denúncias',
        description: 'Nenhuma denúncia neste período. Mude o período ou os filtros.',
    },
};

/** Icon of the module of each service, as in the Services tab. */
const SERVICE_ICONS: Record<ServiceKind, LucideIcon> = {
    fuel: Fuel,
    oil: Droplets,
    repair: Wrench,
};

/** The services as the select lists them, each with its icon. */
const SERVICE_OPTIONS: readonly SelectOption<ServiceKind>[] = REPORT_SERVICES.map((item) => ({
    ...item,
    icon: SERVICE_ICONS[item.value],
}));

/** Width of the drawing of a chart until the screen is measured: about the inside of a card on a phone. */
const CHART_WIDTH = 320;

/** One line of a card: the service with its color, how many records and what they add up to. */
function ServiceLine({ kind, total }: { kind: ServiceKind; total: ServiceTotal }) {
    return (
        <ReportLine
            color={SERVICE_COLORS[kind]}
            name={REPORT_SERVICES.find((service) => service.value === kind)?.label ?? ''}
            detail={countLabel(total.count)}
            value={formatCurrency(total.total)}
        />
    );
}

/** A vehicle of the report: who it is, its total, and the total of each service (RF22). */
function VehicleCard({ line, kinds }: { line: VehicleTotals; kinds: readonly ServiceKind[] }) {
    return (
        <Card>
            <VehicleHead vehicle={line.vehicle} value={formatCurrency(line.total)} />
            <CardSeparator />
            <ReportLines>
                {kinds.map((kind) => (
                    <ServiceLine key={kind} kind={kind} total={line.services[kind]} />
                ))}
            </ReportLines>
            {!line.vehicle.active && <InactiveNote />}
        </Card>
    );
}

/**
 * Reports of the supervisor (RF22, RF23), one module with three reports chosen in a select: the
 * financial one, the km driven and the complaints. They share the period (a shortcut, or a custom
 * one with a first and a last day typed as DD/MM/AAAA) and the vehicle type; the financial report
 * adds the service. Nothing chosen in the period, the type or the service means all of them, and pressing the chosen option again clears it. The
 * server filters and the sums are made on the device (see `loadReport`, `loadKmReport` and
 * `loadComplaintReport`), from the same records the history lists, so the numbers match it.
 *
 * Financial: the cost of the fuelings, oil changes and repairs, with the total of each service,
 * the general total, the charts (cost by vehicle with two vehicles or more, by month with three
 * months or more) and a card per vehicle. Km: the km driven by the finalized routes and a card per
 * vehicle. Complaints: how many are pending, approved and rejected, and a card per vehicle and per
 * driver. A vehicle appears whenever it has records in the period, active or not (RB12). The bar
 * below has "Gerar PDF", which makes the PDF of the report on the screen with the same shell and
 * opens the share sheet, with a spinner on the button while it works; it is off while there is
 * no report with records to print.
 */
export default function ReportsScreen() {
    const [kind, setKind] = useState<ReportKind>('financial');
    const [period, setPeriod] = useState<ReportPeriod | null>('month');
    const [fromText, setFromText] = useState('');
    const [toText, setToText] = useState('');
    const [type, setType] = useState<VehicleType | null>(null);
    const [service, setService] = useState<ServiceKind | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ request: Request; outcome: Outcome } | null>(null);
    const [contentWidth, setContentWidth] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [failure, setFailure] = useState({ visible: false, message: '' });

    /* The custom period only counts once both dates are complete and valid; until then, no report. */
    const custom = useMemo(
        () => reportPeriodSchema.safeParse({ from: fromText, to: toText }),
        [fromText, toText],
    );
    const range = useMemo<ReportRange | null>(() => {
        if (period === null) {
            return null;
        }

        if (period !== 'custom') {
            return shortcutRange(period);
        }

        return custom.success ? customRange(custom.data.from, custom.data.to) : null;
    }, [period, custom]);
    const waitingForDates = period === 'custom' && range === null;

    /* An error is shown under a date only when its text is complete: half a date is not wrong yet. */
    const dateError = (name: 'from' | 'to') =>
        (name === 'from' ? fromText : toText).length === 10
            ? custom.error?.issues.find((issue) => issue.path[0] === name)?.message
            : undefined;

    /*
     * A new object whenever something that changes the report changes, so an answer to an older
     * request is told apart. The service only counts in the financial report, so changing it in
     * another one does not read anything again.
     */
    const request = useMemo<Request | null>(
        () =>
            waitingForDates
                ? null
                : {
                      kind,
                      range,
                      type,
                      service: kind === 'financial' ? service : null,
                      attempt,
                  },
        [waitingForDates, kind, range, type, service, attempt],
    );

    useEffect(() => {
        if (!request) {
            return;
        }

        let current = true;

        load(request).then(
            (loaded) => current && setResult({ request, outcome: { status: 'ready', loaded } }),
            (error) =>
                current &&
                setResult({
                    request,
                    outcome: { status: 'error', message: parseServerError(error).form ?? '' },
                }),
        );

        return () => {
            current = false;
        };
    }, [request]);

    /* The answer to the current request, or none while it is still loading. */
    const outcome = request && result?.request === request ? result.outcome : null;

    const services = REPORT_SERVICES.filter((item) => service === null || item.value === service);
    const kinds = services.map((item) => item.value);

    /* The PDF is made from the report on the screen, so it has the same numbers; the button is off otherwise. */
    const printable = request && outcome?.status === 'ready' && recordCount(outcome.loaded) > 0;

    async function generatePdf() {
        if (!request || outcome?.status !== 'ready' || generating) {
            return;
        }

        const { loaded } = outcome;
        const issuedAt = new Date();

        setGenerating(true);

        try {
            if (loaded.kind === 'financial') {
                await shareReportPdf({
                    report: loaded.report,
                    filters: describeFilters(period, request),
                    services,
                    issuedAt,
                });
            } else if (loaded.kind === 'km') {
                await shareKmReportPdf({
                    report: loaded.report,
                    filters: describeKmFilters(period, request),
                    issuedAt,
                });
            } else {
                await shareComplaintReportPdf({
                    report: loaded.report,
                    filters: describeKmFilters(period, request),
                    issuedAt,
                });
            }
        } catch (error) {
            setFailure({
                visible: true,
                message:
                    error instanceof SharingUnavailableError
                        ? 'Este aparelho não permite compartilhar arquivos.'
                        : 'Não foi possível gerar o PDF. Tente novamente.',
            });
        } finally {
            setGenerating(false);
        }
    }

    function renderFinancial(report: Report) {
        /* The drawing is as wide as the inside of a card (the border and the padding come off), so its text keeps the size of the app. */
        const chartWidth = contentWidth > 0 ? contentWidth - 2 * (1 + spacing.md) : CHART_WIDTH;
        const charts = buildCharts(report, services, chartWidth, fontSize.sm);
        const drawn = [charts.top, charts.monthly].filter((chart) => chart !== null);

        return (
            <>
                <Card>
                    <TotalBox label="Total no período" value={formatCurrency(report.total)} />
                    {kinds.length > 1 && report.total > 0 && (
                        <ProportionBar
                            parts={kinds.map((item) => ({
                                key: item,
                                color: SERVICE_COLORS[item],
                                weight: report.services[item].total,
                            }))}
                        />
                    )}
                    <ReportLines>
                        {kinds.map((item) => (
                            <ServiceLine key={item} kind={item} total={report.services[item]} />
                        ))}
                    </ReportLines>
                </Card>

                {drawn.length > 0 && (
                    <ReportGroup title="Gráficos">
                        {drawn.map((chart) => (
                            <Card key={chart.title}>
                                <CardHeader>
                                    <CardTitle>{chart.title}</CardTitle>
                                    <CardDescription>{chart.description}</CardDescription>
                                </CardHeader>
                                <CardSeparator />
                                <ChartView chart={chart} />
                            </Card>
                        ))}
                    </ReportGroup>
                )}

                <ReportGroup title="Por veículo">
                    {report.vehicles.map((line) => (
                        <VehicleCard key={line.vehicle.id} line={line} kinds={kinds} />
                    ))}
                </ReportGroup>
            </>
        );
    }

    function renderLoaded(loaded: Loaded) {
        if (recordCount(loaded) === 0) {
            return <EmptyState icon={FileText} {...EMPTY[loaded.kind]} />;
        }

        switch (loaded.kind) {
            case 'financial':
                return renderFinancial(loaded.report);
            case 'km':
                return <KmReportView report={loaded.report} />;
            case 'complaints':
                return <ComplaintReportView report={loaded.report} />;
        }
    }

    function renderResult() {
        if (!request) {
            return (
                <EmptyState
                    icon={FileText}
                    title="Informe o período"
                    description="Digite a data inicial e a final para ver os totais."
                />
            );
        }

        if (!outcome) {
            return <LoadingState message="Calculando totais…" />;
        }

        /* A failure is drawn by the screen itself, without the filters. */
        return outcome.status === 'ready' ? renderLoaded(outcome.loaded) : null;
    }

    if (outcome?.status === 'error') {
        return (
            <View style={styles.screen}>
                <ErrorState
                    title="Não foi possível carregar o relatório"
                    message={outcome.message}
                    onRetry={() => setAttempt((count) => count + 1)}
                />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <FormScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag">
                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                        <CardDescription>
                            Escolha o relatório, o período e os filtros.
                        </CardDescription>
                    </CardHeader>

                    <CardSeparator />

                    <Select
                        label="Relatório"
                        options={REPORT_OPTIONS}
                        value={kind}
                        onChange={setKind}
                    />

                    <View style={styles.field}>
                        <Select
                            label="Período"
                            placeholder="Todo o período"
                            options={REPORT_PERIODS}
                            value={period ?? undefined}
                            onChange={setPeriod}
                            onClear={() => setPeriod(null)}
                        />
                        {range && period !== 'custom' && (
                            <Text style={styles.hint}>{formatRange(range)}</Text>
                        )}
                    </View>

                    {period === 'custom' && (
                        <View style={styles.row}>
                            <View style={styles.control}>
                                <TextField
                                    label="De"
                                    placeholder="DD/MM/AAAA"
                                    keyboardType="number-pad"
                                    maxLength={10}
                                    value={fromText}
                                    onChangeText={(text) => setFromText(formatDateInput(text))}
                                    error={dateError('from')}
                                />
                            </View>
                            <View style={styles.control}>
                                <TextField
                                    label="Até"
                                    placeholder="DD/MM/AAAA"
                                    keyboardType="number-pad"
                                    maxLength={10}
                                    value={toText}
                                    onChangeText={(text) => setToText(formatDateInput(text))}
                                    error={dateError('to')}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.row}>
                        <View style={styles.control}>
                            <Select
                                label="Tipo de veículo"
                                placeholder="Todos os veículos"
                                hideLabel
                                options={VEHICLE_TYPE_OPTIONS}
                                value={type ?? undefined}
                                onChange={setType}
                                onClear={() => setType(null)}
                            />
                        </View>
                        {kind === 'financial' && (
                            <View style={styles.control}>
                                <Select
                                    label="Tipo de serviço"
                                    placeholder="Todos os serviços"
                                    hideLabel
                                    options={SERVICE_OPTIONS}
                                    value={service ?? undefined}
                                    onChange={setService}
                                    onClear={() => setService(null)}
                                />
                            </View>
                        )}
                    </View>
                </Card>

                <View
                    style={styles.result}
                    onLayout={(event) =>
                        setContentWidth(Math.floor(event.nativeEvent.layout.width))
                    }
                >
                    {renderResult()}
                </View>
            </FormScrollView>

            <ActionBar>
                <Button
                    title="Gerar PDF"
                    loading={generating}
                    disabled={!printable}
                    onPress={generatePdf}
                />
            </ActionBar>

            <NoticeDialog
                visible={failure.visible}
                title="Não foi possível gerar o PDF"
                message={failure.message}
                onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
            />
        </View>
    );
}

/** Styles of the screen: the filters card over the report, on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        flexGrow: 1,
        padding: spacing.lg,
        gap: spacing.md,
    },
    field: {
        gap: spacing.sm,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    control: {
        flex: 1,
    },
    hint: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.xs,
        lineHeight: 16,
    },
    result: {
        flex: 1,
        gap: spacing.xl,
    },
});
