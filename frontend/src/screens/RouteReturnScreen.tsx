import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ChevronDown } from 'lucide-react-native';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormScrollView } from '../components/FormScrollView';
import { NoticeDialog } from '../components/NoticeDialog';
import { TextField } from '../components/TextField';
import { useToast } from '../contexts/ToastContext';
import type { RootNavigation } from '../navigation/types';
import { formatDateTime, formatDecimalInput, formatKm } from '../schemas/masks';
import { ROUTE_TEXT_MAX, createRouteReturnSchema, kmNotGreaterMessage } from '../schemas/route';
import type { RouteReturnInput, RouteReturnValues } from '../schemas/route';
import { finalizeRoute } from '../services/routes';
import type { OpenRoute } from '../services/routes';
import { applyServerError, isNotFoundError, isRuleError } from '../services/serverErrors';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/** How long the observation takes to open or close, in milliseconds. */
const COLLAPSE_DURATION = 220;

/** Fields of the form, in the names the server uses, so its field errors can be matched. */
const FIELDS = ['km_return', 'obs_return'] as const;

/** Props of RouteReturnScreen: the open route the driver is finalizing. */
export type RouteReturnScreenProps = {
    route: OpenRoute;
};

/**
 * Route return (RF09), the "Rota" module when the driver has an open route. A card summarizes the
 * route, vehicle included, which comes from the route and cannot be changed. The form asks for the
 * return km, which must be greater than the departure km (RB13), and an optional observation,
 * validated with Zod before sending; the valid form then asks for a confirmation (a reminder to
 * check what was filled in), and only the confirmed values are sent. Finalizing is one update of the route: the server stamps
 * the return date and makes the return km the current km of the vehicle (RB03), and a pending
 * complaint does not stop it (RB05). The app only gives feedback; the server refuses a return km
 * that is not greater, and a route that is no longer open (closed by the supervisor, RB15) opens
 * a notice and goes back. On success it shows a toast and goes back.
 */
export default function RouteReturnScreen({ route }: RouteReturnScreenProps) {
    const navigation = useNavigation<RootNavigation>();
    const toast = useToast();
    const [failure, setFailure] = useState({ visible: false, title: '', message: '' });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmed, setConfirmed] = useState<RouteReturnValues | null>(null);
    const [closedNotice, setClosedNotice] = useState(false);
    const schema = useMemo(() => createRouteReturnSchema(route.kmDeparture), [route.kmDeparture]);
    const {
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<RouteReturnInput, unknown, RouteReturnValues>({
        resolver: zodResolver(schema),
        defaultValues: { km_return: '', obs_return: '' },
    });

    /*
     * The form is validated first; the valid values wait for the driver to confirm, and are sent
     * once the dialog is gone (onHidden), because a failure opens another dialog and iOS cannot
     * present one over a Modal that is still on its way out.
     */
    const review = handleSubmit((values) => {
        setConfirmed(values);
        setConfirmOpen(true);
    });

    async function perform(values: RouteReturnValues) {
        setSaving(true);
        try {
            await finalizeRoute(route.id, values);
            toast.show('success', 'Retorno registrado.');
            navigation.goBack();
        } catch (error) {
            if (isNotFoundError(error)) {
                setClosedNotice(true);
                return;
            }

            const message = applyServerError(error, setError, FIELDS, {
                km_return: {
                    km_return_not_greater: kmNotGreaterMessage(route.kmDeparture),
                },
            });
            if (!message) {
                return;
            }
            setFailure({
                visible: true,
                title: isRuleError(error) ? 'Ação não permitida' : 'Não foi possível salvar',
                message,
            });
        } finally {
            setSaving(false);
        }
    }

    function cancelConfirm() {
        setConfirmed(null);
        setConfirmOpen(false);
    }

    function sendConfirmed() {
        if (confirmed) {
            setConfirmed(null);
            perform(confirmed);
        }
    }

    return (
        <View style={styles.screen}>
            <FormScrollView contentContainerStyle={styles.content}>
                <Card>
                    <View style={styles.summaryTop}>
                        <CardHeader style={styles.summaryTitle}>
                            <CardTitle>Rota aberta</CardTitle>
                            <CardDescription>
                                {route.vehicle.plate} · {route.vehicle.model}
                            </CardDescription>
                        </CardHeader>
                        <Badge label="Aberta" variant="success" />
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.grid}>
                        <Fact label="Km de saída" value={formatKm(route.kmDeparture)} />
                        <Fact label="Saída" value={formatDateTime(route.dateDeparture)} />
                        <Fact label="Itinerário" value={route.itinerary} wide />
                        <CollapsibleFact
                            label="Observação"
                            value={route.obsDeparture}
                            emptyText="Nenhuma observação"
                        />
                    </View>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Registrar retorno</CardTitle>
                        <CardDescription>Informe o km do veículo ao voltar.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Controller
                            control={control}
                            name="km_return"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Km de retorno"
                                    placeholder="000.000,00"
                                    value={value}
                                    onChangeText={(text) =>
                                        onChange(formatDecimalInput(text, value))
                                    }
                                    onBlur={onBlur}
                                    error={errors.km_return?.message}
                                    keyboardType="number-pad"
                                    suffix="km"
                                    editable={!saving}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="obs_return"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextField
                                    label="Observação (opcional)"
                                    placeholder="Alguma informação para o supervisor"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    error={errors.obs_return?.message}
                                    multiline
                                    maxLength={ROUTE_TEXT_MAX}
                                    showCount
                                    editable={!saving}
                                />
                            )}
                        />
                    </CardContent>
                </Card>
            </FormScrollView>

            <ActionBar>
                <Button title="Registrar retorno" onPress={() => review()} loading={saving} />
            </ActionBar>

            <ConfirmDialog
                visible={confirmOpen}
                title="Registrar retorno?"
                message="Confira o km de retorno e a observação antes de finalizar a rota. Depois de registrado, o retorno não poderá ser alterado."
                confirmLabel="Registrar retorno"
                destructive={false}
                onConfirm={() => setConfirmOpen(false)}
                onCancel={cancelConfirm}
                onHidden={sendConfirmed}
            />
            <NoticeDialog
                visible={failure.visible}
                title={failure.title}
                message={failure.message}
                onClose={() => setFailure((previous) => ({ ...previous, visible: false }))}
            />
            <NoticeDialog
                visible={closedNotice}
                title="Rota já encerrada"
                message="Esta rota não está mais aberta. O supervisor pode ter encerrado a rota."
                onClose={() => setClosedNotice(false)}
                onHidden={() => navigation.goBack()}
            />
        </View>
    );
}

/** One label and value of the route summary, as in the prototype (the value at 16 dp); `wide` takes the whole row. */
function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
    return (
        <View style={[styles.fact, wide && styles.factWide]}>
            <Text style={styles.factLabel}>{label}</Text>
            <Text style={styles.factValue}>{value}</Text>
        </View>
    );
}

/**
 * Label with a chevron that opens and closes its text, closed at first. The text is always laid
 * out, in a box that is measured and kept out of the flow; what the card sees is a clipped box
 * whose height grows from 0 to the measured one, so the card follows the opening frame by frame
 * and nothing shows outside it. The text fades in and the chevron turns over the same progress.
 * When the text is empty it opens to `emptyText` in the muted color, so a missing observation
 * reads as "none" and not as something that failed to load.
 */
function CollapsibleFact({
    label,
    value,
    emptyText,
}: {
    label: string;
    value: string;
    emptyText: string;
}) {
    const [open, setOpen] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const [progress] = useState(() => new Animated.Value(0));

    function toggle() {
        Animated.timing(progress, {
            toValue: open ? 0 : 1,
            duration: COLLAPSE_DURATION,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
        }).start();
        setOpen(!open);
    }

    return (
        <View style={styles.factWide}>
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={toggle}
                hitSlop={spacing.sm}
                style={styles.collapsibleHeader}
            >
                <Text style={styles.factLabel}>{label}</Text>
                <Animated.View
                    style={{
                        transform: [
                            {
                                rotate: progress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '180deg'],
                                }),
                            },
                        ],
                    }}
                >
                    <ChevronDown color={colors.mutedForeground} size={20} />
                </Animated.View>
            </Pressable>

            <Animated.View
                style={[
                    styles.collapsibleBody,
                    {
                        height: progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, contentHeight],
                        }),
                    },
                ]}
            >
                <Animated.View
                    onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}
                    style={[styles.collapsibleContent, { opacity: progress }]}
                >
                    <Text style={value ? styles.factValue : styles.factEmpty}>
                        {value || emptyText}
                    </Text>
                </Animated.View>
            </Animated.View>
        </View>
    );
}

/** Styles of the return screen: two cards on the same gray background as the other screens. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        flexGrow: 1,
        padding: spacing.lg,
        gap: spacing.lg,
    },
    summaryTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    summaryTitle: {
        flex: 1,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.lg,
    },
    fact: {
        flexBasis: '45%',
        flexGrow: 1,
        gap: spacing.xs,
    },
    factWide: {
        flexBasis: '100%',
    },
    factLabel: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
    },
    collapsibleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    collapsibleBody: {
        overflow: 'hidden',
    },
    collapsibleContent: {
        position: 'absolute',
        left: 0,
        right: 0,
        paddingTop: spacing.xs,
    },
    factEmpty: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.base,
    },
    factValue: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
    },
});
