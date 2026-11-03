import { CircleAlert, Droplets, FileText, Fuel, Wrench } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, CardDescription, CardHeader, CardSeparator, CardTitle } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { Select } from '../components/Select';
import type { SelectOption } from '../components/Select';
import { TextField } from '../components/TextField';
import { VEHICLE_TYPE_ICONS, VEHICLE_TYPE_OPTIONS } from '../components/vehicleTypeOptions';
import type { VehicleType } from '../components/vehicleTypeOptions';
import { formatCurrency, formatDateInput, formatDay } from '../schemas/masks';
import { reportPeriodSchema } from '../schemas/report';
import {
    customRange,
    loadReport,
    REPORT_PERIODS,
    REPORT_SERVICES,
    shortcutRange,
} from '../services/reports';
import type { ReportPeriod, ReportQuery, ReportRange } from '../services/reports';
import type { Report, ServiceTotal, VehicleTotals } from '../services/reportTotals';
import { parseServerError } from '../services/serverErrors';
import type { ServiceKind } from '../services/serviceRecords';
import { typeLabel } from '../services/vehicles';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';

/** A request for the report: what it is about and which attempt it is, so that a retry is a new one. */
type Request = ReportQuery & { attempt: number };

/** How a request ended: with the report, or with the message of its failure. */
type Outcome = { status: 'error'; message: string } | { status: 'ready'; report: Report };

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

/** Color of each service in the proportion bar and in the dots next to its line. */
const SERVICE_COLORS: Record<ServiceKind, string> = {
    fuel: palette.g20,
    oil: palette.g60,
    repair: palette.gA0,
};

/** "Nenhum registro", "1 registro" or "N registros". */
function countLabel(count: number): string {
    if (count === 0) {
        return 'Nenhum registro';
    }

    return count === 1 ? '1 registro' : `${count} registros`;
}

/** The day before a date, for showing the last day included in a range whose end is left out. */
function lastDay(range: ReportRange): Date {
    return new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate() - 1);
}

/** One line of a card: the service with its color, how many records and what they add up to. */
function ServiceLine({ kind, total }: { kind: ServiceKind; total: ServiceTotal }) {
    const label = REPORT_SERVICES.find((service) => service.value === kind)?.label;

    return (
        <View style={styles.line}>
            <View style={[styles.dot, { backgroundColor: SERVICE_COLORS[kind] }]} />
            <View style={styles.lineTexts}>
                <Text style={styles.lineName}>{label}</Text>
                <Text style={styles.lineCount}>{countLabel(total.count)}</Text>
            </View>
            <Text style={styles.lineValue}>{formatCurrency(total.total)}</Text>
        </View>
    );
}

/** A vehicle of the report: who it is, its total, and the total of each service (RF22). */
function VehicleCard({ line, kinds }: { line: VehicleTotals; kinds: readonly ServiceKind[] }) {
    const Icon = VEHICLE_TYPE_ICONS[line.vehicle.type];

    return (
        <Card>
            <View style={styles.vehicleTop}>
                <View style={styles.iconBox}>
                    <Icon color={palette.g20} size={sizes.icon} />
                </View>
                <View style={styles.lineTexts}>
                    <Text style={styles.vehiclePlate}>{line.vehicle.plate}</Text>
                    <Text style={styles.lineCount}>
                        {line.vehicle.model} · {typeLabel(line.vehicle.type)}
                    </Text>
                </View>
                <View style={styles.vehicleTotal}>
                    <Text style={styles.vehicleValue}>{formatCurrency(line.total)}</Text>
                </View>
            </View>
            <CardSeparator />
            <View style={styles.lines}>
                {kinds.map((kind) => (
                    <ServiceLine key={kind} kind={kind} total={line.services[kind]} />
                ))}
            </View>
            {!line.vehicle.active && (
                <View style={styles.inactive}>
                    <CircleAlert color={colors.mutedForeground} size={16} />
                    <Text style={styles.inactiveText}>Veículo inativo</Text>
                </View>
            )}
        </Card>
    );
}

/**
 * Financial report (RF22), a module of the supervisor. Groups the costs by vehicle, adding up the
 * fuelings, oil changes and repairs of the period: for each vehicle the total of each service and
 * its own total, and over them the general total, the sum of the vehicles. The period is a
 * shortcut (this month, last month, the last 3 or 6 months) or a custom one, with a first and a
 * last day typed as DD/MM/AAAA. The vehicles are narrowed by type and the services by choosing
 * one; nothing chosen in the period, in the type or in the service means all of them (the whole
 * history, every vehicle, every service), and pressing the chosen option again clears it. All
 * filters combine. The server filters and the sum is made on the device (see `loadReport`), so the totals
 * come from the same records the history lists. A vehicle appears whenever it has records in the
 * period, active or not (RB12).
 */
export default function ReportsScreen() {
    const [period, setPeriod] = useState<ReportPeriod | null>('month');
    const [fromText, setFromText] = useState('');
    const [toText, setToText] = useState('');
    const [type, setType] = useState<VehicleType | null>(null);
    const [service, setService] = useState<ServiceKind | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ request: Request; outcome: Outcome } | null>(null);

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

    /* A new object whenever something that changes the report changes, so an answer to an older request is told apart. */
    const request = useMemo<Request | null>(
        () => (waitingForDates ? null : { range, type, service, attempt }),
        [waitingForDates, range, type, service, attempt],
    );

    useEffect(() => {
        if (!request) {
            return;
        }

        let current = true;

        loadReport(request).then(
            (report) => current && setResult({ request, outcome: { status: 'ready', report } }),
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

    const kinds = REPORT_SERVICES.map((item) => item.value).filter(
        (kind) => service === null || kind === service,
    );

    function renderReport(report: Report) {
        if (report.count === 0) {
            return (
                <EmptyState
                    icon={FileText}
                    title="Sem registros"
                    description="Mude o período ou os filtros para ver os totais."
                />
            );
        }

        return (
            <>
                <Card>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Total no período</Text>
                        <Text style={styles.total}>{formatCurrency(report.total)}</Text>
                    </View>
                    {kinds.length > 1 && report.total > 0 && (
                        <View style={styles.stack}>
                            {kinds.map((kind) => (
                                <View
                                    key={kind}
                                    style={{
                                        flex: report.services[kind].total,
                                        backgroundColor: SERVICE_COLORS[kind],
                                    }}
                                />
                            ))}
                        </View>
                    )}
                    <View style={styles.lines}>
                        {kinds.map((kind) => (
                            <ServiceLine key={kind} kind={kind} total={report.services[kind]} />
                        ))}
                    </View>
                </Card>

                <Text style={styles.section}>Por veículo</Text>
                {report.vehicles.map((line) => (
                    <VehicleCard key={line.vehicle.id} line={line} kinds={kinds} />
                ))}
            </>
        );
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
        return outcome.status === 'ready' ? renderReport(outcome.report) : null;
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
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
        >
            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                    <CardDescription>
                        Escolha o período, o tipo de veículo e o serviço.
                    </CardDescription>
                </CardHeader>

                <CardSeparator />

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
                        <Text style={styles.hint}>
                            {formatDay(range.from)} a {formatDay(lastDay(range))}
                        </Text>
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
                </View>
            </Card>

            <View style={styles.result}>{renderResult()}</View>
        </ScrollView>
    );
}

/** Styles of the report: the filters card over the totals, on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        flexGrow: 1,
        padding: spacing.lg,
        gap: spacing.xl,
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
        gap: spacing.lg,
    },
    totalBox: {
        alignItems: 'center',
    },
    totalLabel: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.xs,
        lineHeight: 16,
    },
    total: {
        color: colors.foreground,
        fontFamily: fontFamily.bold,
        fontSize: fontSize.xl,
        lineHeight: 32,
    },
    stack: {
        flexDirection: 'row',
        height: 8,
        borderRadius: radius.full,
        overflow: 'hidden',
        backgroundColor: palette.gE0,
        marginVertical: spacing.sm,
    },
    lines: {
        gap: spacing.md,
    },
    line: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: radius.full,
        marginTop: 5,
    },
    lineTexts: {
        flex: 1,
    },
    lineName: {
        color: colors.foreground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    lineCount: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    lineValue: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.sm,
        lineHeight: 20,
        textAlign: 'right',
    },
    section: {
        marginTop: spacing.sm,
        color: colors.mutedForeground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    vehicleTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    iconBox: {
        width: sizes.iconBox,
        height: sizes.iconBox,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: palette.gE0,
    },
    vehiclePlate: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
        lineHeight: 24,
    },
    inactive: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    inactiveText: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    vehicleTotal: {
        alignItems: 'flex-end',
    },
    vehicleValue: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
        lineHeight: 24,
    },
});
