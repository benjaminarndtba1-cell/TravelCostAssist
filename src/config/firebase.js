// Firebase Configuration für TravelCostAssist
//
// API-Keys werden aus Umgebungsvariablen geladen (.env Datei).
// Siehe .env.example für die benötigten Variablen.

import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase Configuration aus Umgebungsvariablen (EXPO_PUBLIC_ Prefix)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Firebase App initialisieren
const app = initializeApp(firebaseConfig);

// Authentication mit AsyncStorage Persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Firestore mit Offline-Persistence (modular API v10+)
let firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({ forceOwnership: true })
    })
  });
} catch (err) {
  // Fallback falls bereits initialisiert
  const { getFirestore } = require('firebase/firestore');
  firestore = getFirestore(app);
}

// Firebase Storage
const storage = getStorage(app);

export { app, auth, firestore, storage };
export default app;
