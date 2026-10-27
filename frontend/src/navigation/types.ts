import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ModuleKey } from './modules';

/**
 * Screens of the root stack: the tabs, the password change opened from the User tab, one screen
 * per service module and the screens opened from a module's list (`DriverNew` and `VehicleNew`,
 * the registration forms, and `DriverDetail` and `VehicleDetail`, the edit of one driver or vehicle, and `RouteClosureDetail`,
 * the closing of one route). The admin modules and their forms are only registered for a supervisor, so a driver has no route to them.
 */
export type RootStackParamList = {
    Tabs: undefined;
    ChangePassword: undefined;
    DriverNew: undefined;
    DriverDetail: { driverId: string };
    VehicleNew: undefined;
    VehicleDetail: { vehicleId: string };
    RouteClosureDetail: { routeId: string };
} & Record<ModuleKey, undefined>;

/** Navigation prop of the root stack, for the screens that open a module. */
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
