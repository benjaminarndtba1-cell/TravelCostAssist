import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import DashboardScreen from './src/screens/DashboardScreen';
import NewExpenseScreen from './src/screens/NewExpenseScreen';
import TripsScreen from './src/screens/TripsScreen';
import TripDetailScreen from './src/screens/TripDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ReportScreen from './src/screens/ReportScreen';
import theme from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_ICONS = {
  'Übersicht': { focused: 'view-dashboard', unfocused: 'view-dashboard-outline' },
  'NeueAusgabe': { focused: 'plus-circle', unfocused: 'plus-circle-outline' },
  'Reisen': { focused: 'airplane', unfocused: 'airplane-outline' },
  'Einstellungen': { focused: 'cog', unfocused: 'cog-outline' },
};

const headerStyle = {
  backgroundColor: theme.colors.primary,
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 4,
};

const headerTitleStyle = {
  fontWeight: '600',
  fontSize: 18,
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle,
        headerTintColor: '#FFFFFF',
        headerTitleStyle,
      })}
    >
      <Tab.Screen
        name="Übersicht"
        component={DashboardScreen}
        options={{
          title: 'Übersicht',
          headerTitle: 'TravelCostAssist',
        }}
      />
      <Tab.Screen
        name="NeueAusgabe"
        component={NewExpenseScreen}
        options={{
          title: 'Neue Ausgabe',
          headerTitle: 'Neue Ausgabe erfassen',
        }}
      />
      <Tab.Screen
        name="Reisen"
        component={TripsScreen}
        options={{
          title: 'Reisen',
          headerTitle: 'Dienstreisen',
        }}
      />
      <Tab.Screen
        name="Einstellungen"
        component={SettingsScreen}
        options={{
          title: 'Einstellungen',
          headerTitle: 'Einstellungen',
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle,
              headerTintColor: '#FFFFFF',
              headerTitleStyle,
            }}
          >
            <Stack.Screen
              name="Main"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TripDetail"
              component={TripDetailScreen}
              options={{
                headerTitle: 'Reisedetails',
                headerBackTitle: 'Zurück',
              }}
            />
            <Stack.Screen
              name="NeueAusgabeStack"
              component={NewExpenseScreen}
              options={{
                headerTitle: 'Neue Position erfassen',
                headerBackTitle: 'Zurück',
              }}
            />
            <Stack.Screen
              name="Abrechnung"
              component={ReportScreen}
              options={{
                headerTitle: 'Reisekostenabrechnung',
                headerBackTitle: 'Zurück',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="light" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
