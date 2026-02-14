// Firebase Configuration für TravelCostAssist
//
// API-Keys werden aus Umgebungsvariablen geladen (.env Datei).
// Siehe .env.example für die benötigten Variablen.

import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
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
