import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
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
  'Reisen': { focused: 'airplane', unfocused: 'airplane' },
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
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
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

// Auth Stack für nicht-eingeloggte Benutzer
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// App Stack für eingeloggte Benutzer
function AppStack() {
  return (
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
        name="AusgabeBearbeiten"
        component={NewExpenseScreen}
        options={{
          headerTitle: 'Position bearbeiten',
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
  );
}

// Loading Screen während Auth-Check
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>Lade...</Text>
    </View>
  );
}

// Root Navigator - entscheidet zwischen Auth und App Stack
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? <AppStack /> : <AuthStack />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
          <StatusBar style="auto" translucent={false} />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
