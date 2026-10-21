import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

/** Root component. Placeholder screen until the real navigation is added. */
export default function App() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>TRACE</Text>
            <StatusBar style="auto" />
        </View>
    );
}

/** Styles of the placeholder screen. */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
    },
});
