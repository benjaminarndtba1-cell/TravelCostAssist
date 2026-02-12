import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent ruft AppRegistry.registerComponent('main', () => App); auf
// Es handled auch, dass die App sofort nach der Registrierung geladen wird
registerRootComponent(App);
