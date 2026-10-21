import { registerRootComponent } from 'expo';

import App from './App';

/*
 * App entry point. registerRootComponent calls AppRegistry.registerComponent('main', () => App)
 * and makes sure the environment is set up appropriately, whether the app is loaded in Expo Go
 * or in a native build.
 */
registerRootComponent(App);
