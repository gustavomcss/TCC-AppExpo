import {
    Geom_400Regular,
    Geom_500Medium,
    Geom_600SemiBold,
    Geom_700Bold,
    useFonts,
} from '@expo-google-fonts/geom';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { LoadingState } from './src/components/LoadingState';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
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
                <LoadingState />
            </View>
        );
    }

    return user ? <HomeScreen /> : <LoginScreen />;
}

/** Root component. Every screen except login requires a signed-in user; toasts show over all. */
export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <Routes />
            </ToastProvider>
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
