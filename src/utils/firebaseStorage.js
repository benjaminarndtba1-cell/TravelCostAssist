// Firebase Storage Service für TravelCostAssist
// Ersetzt AsyncStorage mit Firebase Firestore

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { auth, firestore } from '../config/firebase';
import { uploadReceipt, deleteReceipt } from './receiptUpload';

// ==========================================
// Helper Functions
// ==========================================

const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Benutzer nicht angemeldet');
  }
  return user.uid;
};

// Konvertiert Firestore Timestamp zu JavaScript Date
const convertTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // Fallback für String-Timestamps
  return new Date(timestamp);
};

// Konvertiert JavaScript Date zu Firestore Timestamp
const toFirestoreTimestamp = (date) => {
  if (!date) return null;
  if (date instanceof Timestamp) return date;
  if (date instanceof Date) return Timestamp.fromDate(date);
  if (typeof date === 'string') return Timestamp.fromDate(new Date(date));
  return null;
};

// ==========================================
// Expense Functions
// ==========================================

export const loadExpenses = async () => {
  try {
    const userId = getCurrentUserId();
    const expensesRef = collection(firestore, 'expenses');
    const q = query(
      expensesRef,
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const expenses = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: convertTimestamp(data.date),
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      };
    });

    // Clientseitig sortieren (vermeidet Composite Index Requirement)
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    return expenses;
  } catch (error) {
    console.error('Fehler beim Laden der Expenses:', error);
    return [];
  }
};

export const addExpense = async (expense) => {
  try {
    const userId = getCurrentUserId();

    // Receipt-Upload falls vorhanden
    let receiptUrls = [];
    if (expense.receiptUris && expense.receiptUris.length > 0) {
      // Upload alle Receipts zu Firebase Storage
      const uploadPromises = expense.receiptUris.map((uri) =>
        uploadReceipt(uri, expense.id || 'temp')
      );
      receiptUrls = await Promise.all(uploadPromises);
      receiptUrls = receiptUrls.filter((url) => url !== null); // Filter failed uploads
    }

    const expenseData = {
      ...expense,
      userId,
      receiptUrls, // Firebase Storage URLs
      receiptUris: undefined, // Alte lokale URIs entfernen
      date: toFirestoreTimestamp(expense.date),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Entferne undefined Felder
    Object.keys(expenseData).forEach(
      (key) => expenseData[key] === undefined && delete expenseData[key]
    );

    const docRef = await addDoc(collection(firestore, 'expenses'), expenseData);

    // Falls Receipt mit temp-ID hochgeladen wurde, aktualisiere mit echter ID
    if (receiptUrls.length > 0 && (expense.id === 'temp' || !expense.id)) {
      // Re-upload mit echter expense ID
      const newReceiptUrls = await Promise.all(
        expense.receiptUris.map((uri) => uploadReceipt(uri, docRef.id))
      );
      await updateDoc(docRef, {
        receiptUrls: newReceiptUrls.filter((url) => url !== null)
      });
    }

    return true;
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Expense:', error);
    return false;
  }
};

export const updateExpense = async (expenseId, updatedExpense) => {
  try {
    const userId = getCurrentUserId();
    const expenseRef = doc(firestore, 'expenses', expenseId);

    // Prüfen ob Expense dem User gehört
    const expenseDoc = await getDoc(expenseRef);
    if (!expenseDoc.exists() || expenseDoc.data().userId !== userId) {
      throw new Error('Keine Berechtigung zum Aktualisieren dieser Expense');
    }

    // Receipt-Upload falls neue Receipts vorhanden
    let receiptUrls = updatedExpense.receiptUrls || [];
    if (updatedExpense.receiptUris && updatedExpense.receiptUris.length > 0) {
      const uploadPromises = updatedExpense.receiptUris.map((uri) =>
        uploadReceipt(uri, expenseId)
      );
      const newUrls = await Promise.all(uploadPromises);
      receiptUrls = [...receiptUrls, ...newUrls.filter((url) => url !== null)];
    }

    const updateData = {
      ...updatedExpense,
      receiptUrls,
      receiptUris: undefined,
      updatedAt: Timestamp.now()
    };

    // Datum konvertieren falls vorhanden
    if (updateData.date) {
      updateData.date = toFirestoreTimestamp(updateData.date);
    }

    // Entferne undefined Felder
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    await updateDoc(expenseRef, updateData);
    return true;
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Expense:', error);
    return false;
  }
};

export const deleteExpense = async (expenseId) => {
  try {
    const userId = getCurrentUserId();
    const expenseRef = doc(firestore, 'expenses', expenseId);

    // Prüfen ob Expense dem User gehört
    const expenseDoc = await getDoc(expenseRef);
    if (!expenseDoc.exists() || expenseDoc.data().userId !== userId) {
      throw new Error('Keine Berechtigung zum Löschen dieser Expense');
    }

    // Lösche Receipts aus Storage
    const receiptUrls = expenseDoc.data().receiptUrls || [];
    if (receiptUrls.length > 0) {
      await Promise.all(receiptUrls.map((url) => deleteReceipt(url)));
    }

    // Lösche Expense Dokument
    await deleteDoc(expenseRef);
    return true;
  } catch (error) {
    console.error('Fehler beim Löschen der Expense:', error);
    return false;
  }
};

export const getExpensesByTrip = async (tripId) => {
  try {
    const userId = getCurrentUserId();
    const expensesRef = collection(firestore, 'expenses');
    const q = query(
      expensesRef,
      where('userId', '==', userId),
      where('tripId', '==', tripId)
    );

    const snapshot = await getDocs(q);
    const expenses = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: convertTimestamp(data.date),
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      };
    });

    // Clientseitig sortieren (vermeidet Composite Index Requirement)
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    return expenses;
  } catch (error) {
    console.error('Fehler beim Laden der Expenses für Trip:', error);
    return [];
  }
};

// Für Kompatibilität (wird nicht mehr verwendet)
export const saveExpenses = async (expenses) => {
  console.warn('saveExpenses() ist mit Firebase nicht mehr notwendig');
  return true;
};

// ==========================================
// Trip Functions
// ==========================================

export const loadTrips = async () => {
  try {
    const userId = getCurrentUserId();
    const tripsRef = collection(firestore, 'trips');
    const q = query(
      tripsRef,
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const trips = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDateTime: convertTimestamp(data.startDateTime),
        endDateTime: convertTimestamp(data.endDateTime),
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      };
    });

    // Clientseitig sortieren (vermeidet Composite Index Requirement)
    trips.sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime));
    return trips;
  } catch (error) {
    console.error('Fehler beim Laden der Trips:', error);
    return [];
  }
};

export const addTrip = async (trip) => {
  try {
    const userId = getCurrentUserId();

    const tripData = {
      ...trip,
      userId,
      startDateTime: toFirestoreTimestamp(trip.startDateTime),
      endDateTime: toFirestoreTimestamp(trip.endDateTime),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Entferne undefined Felder
    Object.keys(tripData).forEach(
      (key) => tripData[key] === undefined && delete tripData[key]
    );

    await addDoc(collection(firestore, 'trips'), tripData);
    return true;
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Trip:', error);
    return false;
  }
};

export const updateTrip = async (tripId, updatedTrip) => {
  try {
    const userId = getCurrentUserId();
    const tripRef = doc(firestore, 'trips', tripId);

    // Prüfen ob Trip dem User gehört
    const tripDoc = await getDoc(tripRef);
    if (!tripDoc.exists() || tripDoc.data().userId !== userId) {
      throw new Error('Keine Berechtigung zum Aktualisieren dieser Trip');
    }

    const updateData = {
      ...updatedTrip,
      updatedAt: Timestamp.now()
    };

    // Timestamps konvertieren
    if (updateData.startDateTime) {
      updateData.startDateTime = toFirestoreTimestamp(updateData.startDateTime);
    }
    if (updateData.endDateTime) {
      updateData.endDateTime = toFirestoreTimestamp(updateData.endDateTime);
    }

    // Entferne undefined Felder
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    await updateDoc(tripRef, updateData);
    return true;
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Trip:', error);
    return false;
  }
};

export const deleteTrip = async (tripId) => {
  try {
    const userId = getCurrentUserId();
    const tripRef = doc(firestore, 'trips', tripId);

    // Prüfen ob Trip dem User gehört
    const tripDoc = await getDoc(tripRef);
    if (!tripDoc.exists() || tripDoc.data().userId !== userId) {
      throw new Error('Keine Berechtigung zum Löschen dieser Trip');
    }

    // Lösche alle zugehörigen Expenses (Cascade Delete)
    const expenses = await getExpensesByTrip(tripId);
    await Promise.all(expenses.map((expense) => deleteExpense(expense.id)));

    // Lösche Trip
    await deleteDoc(tripRef);
    return true;
  } catch (error) {
    console.error('Fehler beim Löschen der Trip:', error);
    return false;
  }
};

// Für Kompatibilität
export const saveTrips = async (trips) => {
  console.warn('saveTrips() ist mit Firebase nicht mehr notwendig');
  return true;
};

// ==========================================
// Settings Functions
// ==========================================

export const loadSettings = async () => {
  try {
    const userId = getCurrentUserId();
    const settingsRef = doc(firestore, 'settings', userId);
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      return settingsDoc.data();
    } else {
      // Standard-Einstellungen zurückgeben
      return {
        currency: 'EUR',
        currencySymbol: '€',
        language: 'de'
      };
    }
  } catch (error) {
    console.error('Fehler beim Laden der Settings:', error);
    return {
      currency: 'EUR',
      currencySymbol: '€',
      language: 'de'
    };
  }
};

export const saveSettings = async (settings) => {
  try {
    const userId = getCurrentUserId();
    const settingsRef = doc(firestore, 'settings', userId);

    await setDoc(
      settingsRef,
      {
        ...settings,
        updatedAt: Timestamp.now()
      },
      { merge: true }
    );

    return true;
  } catch (error) {
    console.error('Fehler beim Speichern der Settings:', error);
    return false;
  }
};

// ==========================================
// User Profile Functions
// ==========================================

export const loadUserProfile = async () => {
  try {
    const userId = getCurrentUserId();
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      // Standard-Profil zurückgeben
      return {
        companyName: '',
        companyStreet: '',
        companyZipCity: '',
        companyTaxId: '',
        name: '',
        email: auth.currentUser?.email || '',
        department: '',
        employeeId: '',
        costCenter: '',
        iban: ''
      };
    }
  } catch (error) {
    console.error('Fehler beim Laden des User Profiles:', error);
    return {
      companyName: '',
      companyStreet: '',
      companyZipCity: '',
      companyTaxId: '',
      name: '',
      email: '',
      department: '',
      employeeId: '',
      costCenter: '',
      iban: ''
    };
  }
};

export const saveUserProfile = async (profile) => {
  try {
    const userId = getCurrentUserId();
    const userRef = doc(firestore, 'users', userId);

    await setDoc(
      userRef,
      {
        ...profile,
        updatedAt: Timestamp.now()
      },
      { merge: true }
    );

    return true;
  } catch (error) {
    console.error('Fehler beim Speichern des User Profiles:', error);
    return false;
  }
};

// ==========================================
// Clear All Data (für Logout/Reset)
// ==========================================

export const clearAllData = async () => {
  console.warn(
    'clearAllData() löscht bei Firebase keine Daten - nutze stattdessen Logout'
  );
  // Firebase Daten bleiben erhalten, User wird nur ausgeloggt
  return true;
};

// ==========================================
// Export Default
// ==========================================

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
  clearAllData
};
