// Firebase Configuration für TravelCostAssist
//
// WICHTIG: Ersetze die Platzhalter mit deinen echten Firebase-Werten!
// Gehe zu: https://console.firebase.google.com/
// → Projekt erstellen → Web-App hinzufügen → Config kopieren

import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCs0Li-_YDhflvN_ctMJKuyjrmAvdsE9Nk",
  authDomain: "travelcostassist.firebaseapp.com",
  projectId: "travelcostassist",
  storageBucket: "travelcostassist.firebasestorage.app",
  messagingSenderId: "892237387743",
  appId: "1:892237387743:web:bc80d9c63bcb9307a6566a"
};

// Firebase App initialisieren
const app = initializeApp(firebaseConfig);

// Authentication mit AsyncStorage Persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Firestore mit Offline-Unterstützung
const firestore = getFirestore(app);

// Offline Persistence aktivieren (nur für Web/React Native)
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(firestore, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  }).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore Persistence: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore Persistence: Not available in this browser');
    }
  });
}

// Firebase Storage
const storage = getStorage(app);

export { app, auth, firestore, storage };
export default app;
