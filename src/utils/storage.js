import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  EXPENSES: '@travelcostassist_expenses',
  TRIPS: '@travelcostassist_trips',
  SETTINGS: '@travelcostassist_settings',
  USER_PROFILE: '@travelcostassist_user_profile',
};

// ==========================================
// Generic Storage Helpers
// ==========================================

const saveData = async (key, data) => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error(`Fehler beim Speichern (${key}):`, error);
    return false;
  }
};

const loadData = async (key, defaultValue = null) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : defaultValue;
  } catch (error) {
    console.error(`Fehler beim Laden (${key}):`, error);
    return defaultValue;
  }
};

const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Fehler beim Löschen (${key}):`, error);
    return false;
  }
};

// ==========================================
// Expense Functions
// ==========================================

export const saveExpenses = async (expenses) => {
  return saveData(STORAGE_KEYS.EXPENSES, expenses);
};

export const loadExpenses = async () => {
  return loadData(STORAGE_KEYS.EXPENSES, []);
};

export const addExpense = async (expense) => {
  const expenses = await loadExpenses();
  expenses.unshift(expense);
  return saveExpenses(expenses);
};

export const updateExpense = async (expenseId, updatedExpense) => {
  const expenses = await loadExpenses();
  const index = expenses.findIndex((e) => e.id === expenseId);
  if (index !== -1) {
    expenses[index] = { ...expenses[index], ...updatedExpense };
    return saveExpenses(expenses);
  }
  return false;
};

export const deleteExpense = async (expenseId) => {
  const expenses = await loadExpenses();
  const filtered = expenses.filter((e) => e.id !== expenseId);
  return saveExpenses(filtered);
};

export const getExpensesByTrip = async (tripId) => {
  const expenses = await loadExpenses();
  return expenses.filter((e) => e.tripId === tripId);
};

// ==========================================
// Trip Functions
// ==========================================

export const saveTrips = async (trips) => {
  return saveData(STORAGE_KEYS.TRIPS, trips);
};

export const loadTrips = async () => {
  return loadData(STORAGE_KEYS.TRIPS, []);
};

export const addTrip = async (trip) => {
  const trips = await loadTrips();
  trips.unshift(trip);
  return saveTrips(trips);
};

export const updateTrip = async (tripId, updatedTrip) => {
  const trips = await loadTrips();
  const index = trips.findIndex((t) => t.id === tripId);
  if (index !== -1) {
    trips[index] = { ...trips[index], ...updatedTrip };
    return saveTrips(trips);
  }
  return false;
};

export const deleteTrip = async (tripId) => {
  const trips = await loadTrips();
  const filtered = trips.filter((t) => t.id !== tripId);
  await saveTrips(filtered);
  // Also delete associated expenses
  const expenses = await loadExpenses();
  const filteredExpenses = expenses.filter((e) => e.tripId !== tripId);
  await saveExpenses(filteredExpenses);
  return true;
};

// ==========================================
// Settings Functions
// ==========================================

export const saveSettings = async (settings) => {
  return saveData(STORAGE_KEYS.SETTINGS, settings);
};

export const loadSettings = async () => {
  return loadData(STORAGE_KEYS.SETTINGS, {
    currency: 'EUR',
    currencySymbol: '€',
    language: 'de',
  });
};

// ==========================================
// User Profile Functions
// ==========================================

export const saveUserProfile = async (profile) => {
  return saveData(STORAGE_KEYS.USER_PROFILE, profile);
};

export const loadUserProfile = async () => {
  return loadData(STORAGE_KEYS.USER_PROFILE, {
    // Firmendaten
    companyName: '',
    companyStreet: '',
    companyZipCity: '',
    companyTaxId: '',
    // Personendaten
    name: '',
    email: '',
    department: '',
    employeeId: '',
    costCenter: '',
    iban: '',
  });
};

// ==========================================
// Clear All Data
// ==========================================

export const clearAllData = async () => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (error) {
    console.error('Fehler beim Löschen aller Daten:', error);
    return false;
  }
};

export default {
  saveExpenses,
  loadExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpensesByTrip,
  saveTrips,
  loadTrips,
  addTrip,
  updateTrip,
  deleteTrip,
  saveSettings,
  loadSettings,
  saveUserProfile,
  loadUserProfile,
  clearAllData,
};
