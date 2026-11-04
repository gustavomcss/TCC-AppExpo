import { CircleAlert } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ReportVehicle } from '../services/reportTotals';
import { typeLabel } from '../services/vehicles';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';
import { Avatar } from './Avatar';
import { VEHICLE_TYPE_ICONS } from './vehicleTypeOptions';

/** A group of cards of a report under a gray title: 8 dp under the title and 12 dp between the cards. */
export function ReportGroup({ title, children }: { title: string; children: ReactNode }) {
    return (
        <View style={styles.group}>
            <Text style={styles.section}>{title}</Text>
            <View style={styles.list}>{children}</View>
        </View>
    );
}

/** The big number of a total card, centered under its label. */
export function TotalBox({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>{label}</Text>
            <Text style={styles.total}>{value}</Text>
        </View>
    );
}

/** A part of a proportion bar: its color and how much of the bar it takes. */
export type BarPart = { key: string; color: string; weight: number };

/** The bar that shows how a total splits among its parts, each one as wide as its weight. */
export function ProportionBar({ parts }: { parts: readonly BarPart[] }) {
    return (
        <View style={styles.stack}>
            {parts.map(({ key, color, weight }) => (
                <View key={key} style={{ flex: weight, backgroundColor: color }} />
            ))}
        </View>
    );
}

/** The lines of a card, 12 dp apart. */
export function ReportLines({ children }: { children: ReactNode }) {
    return <View style={styles.lines}>{children}</View>;
}

/** One line of a card: a colored dot, a name with an optional line of detail under it, and a value at the end. */
export function ReportLine({
    color,
    name,
    detail,
    value,
}: {
    color: string;
    name: string;
    detail?: string;
    value: string;
}) {
    return (
        <View style={styles.line}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <View style={styles.lineTexts}>
                <Text style={styles.lineName}>{name}</Text>
                {detail !== undefined && <Text style={styles.lineDetail}>{detail}</Text>}
            </View>
            <Text style={styles.lineValue}>{value}</Text>
        </View>
    );
}

/** A plain row of a card: a label at the start and a value at the end, with no dot. */
export function ReportFact({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.fact}>
            <Text style={styles.lineName}>{label}</Text>
            <Text style={styles.lineValue}>{value}</Text>
        </View>
    );
}

/** The top of a vehicle card: the icon of its type, its plate, "model · type", and a value at the end. */
export function VehicleHead({ vehicle, value }: { vehicle: ReportVehicle; value: string }) {
    const Icon = VEHICLE_TYPE_ICONS[vehicle.type];

    return (
        <View style={styles.vehicleTop}>
            <View style={styles.iconBox}>
                <Icon color={palette.g20} size={sizes.icon} />
            </View>
            <View style={styles.lineTexts}>
                <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
                <Text style={styles.lineDetail}>
                    {vehicle.model} · {typeLabel(vehicle.type)}
                </Text>
            </View>
            <Text style={styles.vehicleValue}>{value}</Text>
        </View>
    );
}

/**
 * The top of a driver card: the initials of their name in a gray box where a vehicle card has its
 * icon (always the initials, even for someone with a photo, so the report stays sober), the name,
 * their role under it, and a value at the end.
 */
export function DriverHead({ name, role, value }: { name: string; role: string; value: string }) {
    return (
        <View style={styles.vehicleTop}>
            <Avatar name={name} size={sizes.iconBox} />
            <View style={styles.lineTexts}>
                <Text style={styles.vehiclePlate}>{name}</Text>
                <Text style={styles.lineDetail}>{role}</Text>
            </View>
            <Text style={styles.vehicleValue}>{value}</Text>
        </View>
    );
}

/** The note at the foot of the card of an inactive vehicle, which still has its records in the report (RB12). */
export function InactiveNote() {
    return (
        <View style={styles.inactive}>
            <CircleAlert color={colors.mutedForeground} size={16} />
            <Text style={styles.inactiveText}>Veículo inativo</Text>
        </View>
    );
}

/** Styles of the parts that the three reports share. */
const styles = StyleSheet.create({
    group: {
        gap: spacing.sm,
    },
    list: {
        gap: spacing.md,
    },
    section: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
        lineHeight: 20,
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
    lineDetail: {
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
    fact: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
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
    vehicleValue: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
        lineHeight: 24,
        textAlign: 'right',
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
});
