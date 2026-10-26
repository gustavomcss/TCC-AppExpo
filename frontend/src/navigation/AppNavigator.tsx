import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { History, LayoutGrid, User } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import DriverDetailScreen from '../screens/DriverDetailScreen';
import DriverFormScreen from '../screens/DriverFormScreen';
import DriversScreen from '../screens/DriversScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ModuleScreen from '../screens/ModuleScreen';
import RouteDepartureScreen from '../screens/RouteDepartureScreen';
import ServicesScreen from '../screens/ServicesScreen';
import UserScreen from '../screens/UserScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import VehicleFormScreen from '../screens/VehicleFormScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import { colors, fontFamily, fontSize, palette, sizes } from '../theme';
import { modulesFor } from './modules';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

/** Height of the tab bar above the bottom safe area, in dp. */
const TAB_BAR_HEIGHT = 56;

/** Navigation theme taken from the app tokens, so headers and the tab bar match the screens. */
const navigationTheme: Theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.muted,
        card: colors.card,
        text: colors.foreground,
        border: colors.border,
    },
    fonts: {
        regular: { fontFamily: fontFamily.normal, fontWeight: 'normal' },
        medium: { fontFamily: fontFamily.medium, fontWeight: 'normal' },
        bold: { fontFamily: fontFamily.semibold, fontWeight: 'normal' },
        heavy: { fontFamily: fontFamily.bold, fontWeight: 'normal' },
    },
};

/** Options shared by the tab headers and the stack headers: centered text title, no icon. */
const headerOptions = {
    headerTitleAlign: 'center',
    headerTitleStyle: { fontFamily: fontFamily.semibold, fontSize: fontSize.lg },
} as const;

/** The three tabs both roles see (RF20): History, Services and User. */
function Tabs() {
    const { bottom } = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={{
                ...headerOptions,
                tabBarActiveTintColor: palette.g20,
                tabBarInactiveTintColor: palette.g60,
                tabBarStyle: {
                    height: TAB_BAR_HEIGHT + bottom,
                    paddingBottom: bottom,
                    paddingTop: 0,
                },
                tabBarItemStyle: { justifyContent: 'center', gap: 4 },
                tabBarLabel: ({ focused, color, children }) => (
                    <Text style={[styles.tabLabel, { color }, focused && styles.tabLabelActive]}>
                        {children}
                    </Text>
                ),
            }}
        >
            <Tab.Screen
                name="Histórico"
                component={HistoryScreen}
                options={{
                    tabBarIcon: ({ color }) => <History color={color} size={sizes.tabIcon} />,
                }}
            />
            <Tab.Screen
                name="Serviços"
                component={ServicesScreen}
                options={{
                    tabBarIcon: ({ color }) => <LayoutGrid color={color} size={sizes.tabIcon} />,
                }}
            />
            <Tab.Screen
                name="Usuário"
                component={UserScreen}
                options={{
                    tabBarIcon: ({ color }) => <User color={color} size={sizes.tabIcon} />,
                }}
            />
        </Tab.Navigator>
    );
}

/**
 * Navigation of the signed-in app: the tabs, with the service modules opened over them. Only the
 * modules of the user's role are registered, so the admin screens do not exist for a driver. That
 * is just the interface: the API rules are what refuse a driver's requests (RNF03).
 */
export default function AppNavigator() {
    const { user } = useAuth();
    const modules = user ? modulesFor(user.role) : [];

    return (
        <NavigationContainer theme={navigationTheme}>
            <Stack.Navigator
                screenOptions={{ ...headerOptions, headerBackButtonDisplayMode: 'minimal' }}
            >
                <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
                <Stack.Screen
                    name="ChangePassword"
                    component={ChangePasswordScreen}
                    options={{ title: 'Trocar senha' }}
                />

                {modules.map((module) => (
                    <Stack.Screen
                        key={module.key}
                        name={module.key}
                        options={{ title: module.title }}
                    >
                        {() => {
                            switch (module.key) {
                                case 'routes':
                                    return <RouteDepartureScreen />;
                                case 'drivers':
                                    return <DriversScreen />;
                                case 'vehicles':
                                    return <VehiclesScreen />;
                                default:
                                    return <ModuleScreen moduleKey={module.key} />;
                            }
                        }}
                    </Stack.Screen>
                ))}

                {user?.role === 'supervisor' && (
                    <>
                        <Stack.Screen
                            name="DriverNew"
                            component={DriverFormScreen}
                            options={{ title: 'Novo motorista' }}
                        />
                        <Stack.Screen
                            name="DriverDetail"
                            component={DriverDetailScreen}
                            options={{ title: 'Motorista' }}
                        />
                        <Stack.Screen
                            name="VehicleNew"
                            component={VehicleFormScreen}
                            options={{ title: 'Novo veículo' }}
                        />
                        <Stack.Screen
                            name="VehicleDetail"
                            component={VehicleDetailScreen}
                            options={{ title: 'Veículo' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

/** Styles of the tab labels: 12 dp, medium, and semibold on the tab in use. */
const styles = StyleSheet.create({
    tabLabel: {
        fontFamily: fontFamily.medium,
        fontSize: fontSize.xs,
        lineHeight: 16,
    },
    tabLabelActive: {
        fontFamily: fontFamily.semibold,
    },
});
