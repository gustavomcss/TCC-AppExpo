import { StyleSheet, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { SERVICE_MODULES } from '../navigation/modules';
import type { ModuleKey } from '../navigation/modules';
import { colors } from '../theme';

/**
 * Provisional screen of a service module whose issue has not been done yet. Each module's own
 * issue replaces it in the root stack.
 */
export default function ModuleScreen({ moduleKey }: { moduleKey: ModuleKey }) {
    const module = SERVICE_MODULES.find((candidate) => candidate.key === moduleKey);

    return (
        <View style={styles.screen}>
            <EmptyState
                icon={module?.icon}
                title={module?.title ?? ''}
                description="Este serviço estará disponível em breve."
            />
        </View>
    );
}

/** Styles of the provisional module screen. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
});
