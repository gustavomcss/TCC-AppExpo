import {
    Geom_400Regular,
    Geom_500Medium,
    Geom_600SemiBold,
    Geom_700Bold,
    useFonts,
} from '@expo-google-fonts/geom';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import { colors } from './src/theme';

/**
 * Chooses the screen by session: a spinner while the fonts load and the session is restored, then
 * login or home. If the fonts fail to load the app still opens, with the system font.
 */
function Routes() {
    const { loading, user } = useAuth();
    const [fontsLoaded, fontError] = useFonts({
        Geom_400Regular,
        Geom_500Medium,
        Geom_600SemiBold,
        Geom_700Bold,
    });

    if (loading || !(fontsLoaded || fontError)) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return user ? <HomeScreen /> : <LoginScreen />;
}

/** Root component. Every screen except login requires a signed-in user. */
export default function App() {
    return (
        <AuthProvider>
            <Routes />
            <StatusBar style="auto" />
        </AuthProvider>
    );
}

/** Styles of the loading state. */
const styles = StyleSheet.create({
    loading: {
        flex: 1,
        backgroundColor: colors.muted,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
