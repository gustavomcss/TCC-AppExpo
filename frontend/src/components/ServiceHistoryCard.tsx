import type { LucideIcon } from 'lucide-react-native';
import { Droplets, Fuel, Pencil, Wrench } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { FUEL_TYPES } from '../schemas/fuel';
import { formatDateTime, formatDecimal, formatKm } from '../schemas/masks';
import type { ServiceRecord } from '../services/serviceRecords';
import { colors, radius, sizes } from '../theme';
import { Fact } from './Fact';
import {
    HistoryCard,
    HistoryCardFacts,
    HistoryCardFooter,
    HistoryCardNote,
    HistoryCardSeparator,
    HistoryCardTop,
} from './HistoryCardParts';

/** Icon of each kind of service record, the same as its module. */
const ICONS: Record<ServiceRecord['kind'], LucideIcon> = {
    fuel: Fuel,
    oil: Droplets,
    repair: Wrench,
};

/** The facts that are particular to each kind of record, after the shared km and cost. */
function kindFacts(record: ServiceRecord) {
    switch (record.kind) {
        case 'fuel': {
            const fuel =
                FUEL_TYPES.find((type) => type.value === record.type)?.label ?? record.type;

            return (
                <>
                    <Fact label="Combustível" value={fuel} />
                    <Fact label="Litros" value={`${formatDecimal(record.liters)} L`} />
                </>
            );
        }
        case 'oil':
            return <Fact label="Tipo do óleo" value={record.type} wide />;
        case 'repair':
            return <Fact label="Descrição" value={record.description} wide />;
    }
}

/**
 * Card of a fueling, oil change or repair in the history (RF17): the icon of the module,
 * "placa · modelo" with the author under it, then the km registered and the cost side by side, what
 * is particular to the kind (fuel and liters, oil type or description) and when it was registered. `onEdit`
 * adds the pencil that opens the edit screen; the screen passes it only for the signed-in user's
 * own records (RF21, RB17), so without it the card is read-only.
 */
export function ServiceHistoryCard({
    record,
    onEdit,
}: {
    record: ServiceRecord;
    onEdit?: () => void;
}) {
    return (
        <HistoryCard>
            <HistoryCardTop
                icon={ICONS[record.kind]}
                title={`${record.vehicle.plate} · ${record.vehicle.model}`}
                subtitle={record.authorName}
                right={
                    onEdit && (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Editar registro"
                            hitSlop={6}
                            onPress={onEdit}
                            style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
                        >
                            <Pencil color={colors.foreground} size={16} />
                        </Pressable>
                    )
                }
            />

            <HistoryCardSeparator />

            <HistoryCardFacts>
                <Fact label="Km registrado" value={formatKm(record.km)} />
                <Fact label="Valor" value={`R$ ${formatDecimal(record.cost)}`} />
                {kindFacts(record)}
            </HistoryCardFacts>

            <HistoryCardFooter>
                <HistoryCardNote>Registrado em {formatDateTime(record.created)}</HistoryCardNote>
            </HistoryCardFooter>
        </HistoryCard>
    );
}

/** Styles of the service record card. */
const styles = StyleSheet.create({
    edit: {
        width: sizes.iconButton,
        height: sizes.iconButton,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.background,
    },
    pressed: {
        opacity: 0.85,
    },
});
