import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { modulesFor } from '../navigation/modules';
import type { ServiceModule } from '../navigation/modules';
import type { RootNavigation } from '../navigation/types';
import { colors, fontFamily, fontSize, palette, radius, sizes, spacing } from '../theme';

/**
 * Services tab: one card per module the user's role can use, each with the icon of its service.
 * The driver gets the operational services only; the supervisor also gets the administrative
 * ones, under their own heading (RF02, RF20). Hiding a card is only the interface: the API rules
 * refuse the same requests (RNF03). The status badges of the prototype (open route, pending
 * reviews) come with the issues that have that data.
 */
export default function ServicesScreen() {
    const { user } = useAuth();
    const navigation = useNavigation<RootNavigation>();

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
    pressed: {
        opacity: 0.85,
    },
});
