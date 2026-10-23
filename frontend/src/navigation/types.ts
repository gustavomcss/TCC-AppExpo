import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ModuleKey } from './modules';

/**
 * Screens of the root stack: the tabs, the password change opened from the User tab, one screen
 * per service module and the screens opened from a module's list (`DriverNew`, the registration
 * form, and `DriverDetail`, the edit of one driver). The admin modules and their forms are only
 * registered for a supervisor, so a driver has no route to them.
 */
export type RootStackParamList = {
    Tabs: undefined;
    ChangePassword: undefined;
    DriverNew: undefined;
    DriverDetail: { driverId: string };
} & Record<ModuleKey, undefined>;

/** Navigation prop of the root stack, for the screens that open a module. */
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
