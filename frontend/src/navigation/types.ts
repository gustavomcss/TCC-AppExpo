import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ModuleKey } from './modules';

/**
 * Screens of the root stack: the tabs, and one screen per service module. The admin modules are
 * only registered for a supervisor, so a driver has no route to them.
 */
export type RootStackParamList = { Tabs: undefined } & Record<ModuleKey, undefined>;

/** Navigation prop of the root stack, for the screens that open a module. */
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
