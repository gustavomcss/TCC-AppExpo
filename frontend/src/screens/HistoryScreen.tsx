import { History } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme';

/** History tab. Placeholder until the history lists (I-33) fill it. */
export default function HistoryScreen() {
    return (
        <View style={styles.screen}>
            <EmptyState
                icon={History}
                title="Nenhum registro ainda"
                description="As rotas finalizadas e os registros feitos aparecerão aqui."
            />
        </View>
    );
}

/** Styles of the history screen. */
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.muted,
    },
});
