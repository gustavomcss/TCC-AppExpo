import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { modulesFor } from '../navigation/modules';
import type { ServiceModule } from '../navigation/modules';
import type { RootNavigation } from '../navigation/types';
import { getOpenRouteComplaint } from '../services/complaints';
import type { ComplaintStatus } from '../services/complaints';
import { countOpenRoutes, hasOpenRoute } from '../services/routes';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';

/** Text of the badge of the "Denúncia de km" card for each situation of the complaint. */
const COMPLAINT_BADGES: Record<ComplaintStatus, string> = {
    pendente: 'Pendente',
    aprovada: 'Aprovada',
    reprovada: 'Reprovada',
};

/**
 * Services tab: one card per module the user's role can use, each with the icon of its service.
 * The driver gets the operational services only; the supervisor also gets the administrative
 * ones, under their own heading (RF02, RF20). Hiding a card is only the interface: the API rules
 * refuse the same requests (RNF03). The "Rota" card carries the "Aberta" badge, over its top right
 * corner like a notification count, while the user has an open route, read again each time the
 * tab gets focus. A supervisor's "Encerramento de rotas" card carries, the same way, the count of
 * open routes of every driver. Both are notification badges, black with white text, unlike the
 * outline and muted badges that state a situation inside the screens. The "Denúncia de km" card
 * carries the situation of the complaint on the open route, in the same corner: "Pendente" is a
 * notification, black, and "Aprovada" and "Reprovada" are outcomes, muted, told apart by their
 * text. The other badge of the prototype (pending reviews) comes with the issue that has that data.
 */
export default function ServicesScreen() {
    const { user } = useAuth();
    const navigation = useNavigation<RootNavigation>();
    const [routeOpen, setRouteOpen] = useState(false);
    const [openCount, setOpenCount] = useState(0);
    const [complaintStatus, setComplaintStatus] = useState<ComplaintStatus | null>(null);
    const userId = user?.id;
    const isSupervisor = user?.role === 'supervisor';

    useFocusEffect(
        useCallback(() => {
            if (!userId) {
                return;
            }

            /* The badge is only a hint: if the request fails there is simply no badge. */
            hasOpenRoute(userId)
                .then(setRouteOpen)
                .catch(() => setRouteOpen(false));

            getOpenRouteComplaint(userId)
                .then((complaint) => setComplaintStatus(complaint?.status ?? null))
                .catch(() => setComplaintStatus(null));

            if (isSupervisor) {
                countOpenRoutes()
                    .then(setOpenCount)
                    .catch(() => setOpenCount(0));
            }
        }, [userId, isSupervisor]),
    );

    if (!user) {
        return null;
    }

    const modules = modulesFor(user.role);
    const operational = modules.filter((module) => !module.adminOnly);
    const administrative = modules.filter((module) => module.adminOnly);

    function renderCard(module: ServiceModule) {
        const Icon = module.icon;

        return (
            <Pressable
                key={module.key}
                accessibilityRole="button"
                accessibilityLabel={module.title}
                onPress={() => navigation.navigate(module.key)}
                style={({ pressed }) => pressed && styles.pressed}
            >
                <Card style={styles.card}>
                    <View style={styles.iconBox}>
                        <Icon color={palette.g20} size={sizes.icon} />
                    </View>
                    <View style={styles.texts}>
                        <Text style={styles.title}>{module.title}</Text>
                        <Text style={styles.description}>{module.description}</Text>
                    </View>
                </Card>
                {module.key === 'routes' && routeOpen && (
                    <View pointerEvents="none" style={styles.corner}>
                        <Badge label="Aberta" />
                    </View>
                )}
                {module.key === 'complaint' && complaintStatus && (
                    <View pointerEvents="none" style={styles.corner}>
                        <Badge
                            label={COMPLAINT_BADGES[complaintStatus]}
                            variant={complaintStatus === 'pendente' ? 'default' : 'secondary'}
                        />
                    </View>
                )}
                {module.key === 'routeClosure' && openCount > 0 && (
                    <View pointerEvents="none" style={styles.corner}>
                        <Badge label={String(openCount)} />
                    </View>
                )}
            </Pressable>
        );
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.group}>
                <Text style={styles.heading}>Operacionais</Text>
                <View style={styles.list}>{operational.map(renderCard)}</View>
            </View>

            {administrative.length > 0 && (
                <View style={styles.group}>
                    <Text style={styles.heading}>Administrativos</Text>
                    <View style={styles.list}>{administrative.map(renderCard)}</View>
                </View>
            )}
        </ScrollView>
    );
}

/** Styles of the services screen. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
    content: {
        padding: spacing.lg,
        gap: spacing.lg,
    },
    group: {
        gap: spacing.sm,
    },
    list: {
        gap: spacing.md,
    },
    heading: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.medium,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    card: {
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
    texts: {
        flex: 1,
    },
    title: {
        color: colors.foreground,
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
        lineHeight: 24,
    },
    description: {
        color: colors.mutedForeground,
        fontFamily: fontFamily.normal,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    corner: {
        position: 'absolute',
        top: -spacing.sm,
        right: spacing.lg,
    },
    pressed: {
        opacity: 0.85,
    },
});
