// Auth Context für TravelCostAssist
// Verwaltet den Authentifizierungsstatus und bietet Login/Logout Funktionen

import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../config/firebase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Benutzer-Status bei App-Start überprüfen
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User eingeloggt - Profil aus Firestore laden
        try {
          const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userDoc.data()
            });
          } else {
            // Fallback falls kein Firestore-Profil existiert
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email
            });
          }
        } catch (err) {
          console.error('Fehler beim Laden des Benutzerprofils:', err);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email
          });
        }
      } else {
        // Nicht eingeloggt
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Registrierung
  const signUp = async (email, password, userData = {}) => {
    try {
      setError(null);
      setLoading(true);

      // Firebase Authentication - Benutzer erstellen
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Displayname setzen falls vorhanden
      if (userData.name) {
        await updateProfile(firebaseUser, {
          displayName: userData.name
        });
      }

      // Benutzerprofil in Firestore erstellen
      const userProfile = {
        email: email,
        name: userData.name || '',
        department: userData.department || '',
        employeeId: userData.employeeId || '',
        costCenter: userData.costCenter || '',
        iban: userData.iban || '',
        companyName: userData.companyName || '',
        companyStreet: userData.companyStreet || '',
        companyZipCity: userData.companyZipCity || '',
        companyTaxId: userData.companyTaxId || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(firestore, 'users', firebaseUser.uid), userProfile);

      // Standard-Einstellungen erstellen
      const defaultSettings = {
        currency: 'EUR',
        currencySymbol: '€',
        language: 'de',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(firestore, 'settings', firebaseUser.uid), defaultSettings);

      setUser({
        uid: firebaseUser.uid,
        email: email,
        ...userProfile
      });

      setLoading(false);
      return { success: true };
    } catch (err) {
      setLoading(false);

      // Fehlerbehandlung mit deutschen Meldungen
      let errorMessage = 'Registrierung fehlgeschlagen';

      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Diese E-Mail-Adresse wird bereits verwendet';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Ungültige E-Mail-Adresse';
          break;
        case 'auth/weak-password':
          errorMessage = 'Passwort zu schwach (mindestens 6 Zeichen)';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Netzwerkfehler - Bitte Internetverbindung prüfen';
          break;
        default:
          errorMessage = err.message || 'Registrierung fehlgeschlagen';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Login
  const signIn = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Profil aus Firestore laden
      const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          ...userDoc.data()
        });
      } else {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email
        });
      }

      setLoading(false);
      return { success: true };
    } catch (err) {
      setLoading(false);

      let errorMessage = 'Login fehlgeschlagen';

      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'E-Mail oder Passwort falsch';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Ungültige E-Mail-Adresse';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Dieser Account wurde deaktiviert';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Netzwerkfehler - Bitte Internetverbindung prüfen';
          break;
        default:
          errorMessage = err.message || 'Login fehlgeschlagen';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
      return { success: true };
    } catch (err) {
      const errorMessage = 'Logout fehlgeschlagen';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Passwort zurücksetzen
  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: 'Passwort-Reset-E-Mail wurde versendet'
      };
    } catch (err) {
      let errorMessage = 'Passwort-Reset fehlgeschlagen';

      switch (err.code) {
        case 'auth/invalid-email':
          errorMessage = 'Ungültige E-Mail-Adresse';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Kein Benutzer mit dieser E-Mail gefunden';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Netzwerkfehler - Bitte Internetverbindung prüfen';
          break;
        default:
          errorMessage = err.message || 'Passwort-Reset fehlgeschlagen';
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    logout,
    resetPassword,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
