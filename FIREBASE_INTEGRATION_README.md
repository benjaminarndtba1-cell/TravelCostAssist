# Firebase Integration - Abschluss-Anleitung

## Status

Die Firebase-Integration ist zu **90% fertig** und einsatzbereit! ✅

### Was bereits implementiert wurde:

- ✅ **Firebase Konfiguration**: `src/config/firebase.js` mit Platzhaltern erstellt
- ✅ **Auth Context**: Vollständige Authentifizierungs-Logik in `src/context/AuthContext.js`
- ✅ **Login & Register Screens**: Fertige UI für Anmeldung und Registrierung
- ✅ **Forgot Password Screen**: Passwort-Reset-Funktion
- ✅ **Firebase Storage Service**: Kompletter Ersatz für AsyncStorage in `src/utils/firebaseStorage.js`
- ✅ **Receipt Upload Service**: Bild-Upload zu Firebase Storage in `src/utils/receiptUpload.js`
- ✅ **Security Rules**: Firestore und Storage Rules in `firestore.rules` und `storage.rules`
- ✅ **Navigation**: App.js mit Auth-Flow (Login → App oder umgekehrt)
- ✅ **Settings Screen**: Logout-Button und Firebase-Integration
- ✅ **Offline-Support**: Firebase Offline Persistence aktiviert

---

## Nächste Schritte (10% verbleibend)

Du musst nur noch **3 Dinge** erledigen:

### 1. Firebase-Projekt erstellen & Konfigurieren (15 Minuten)

Folge der **detaillierten Anleitung** in:
📄 **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**

**Kurzfassung:**
1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Erstelle Projekt "TravelCostAssist"
3. Aktiviere **Authentication** (E-Mail/Passwort)
4. Erstelle **Firestore Database** (Produktionsmodus, Region: Frankfurt)
5. Aktiviere **Storage** (gleiche Region)
6. Füge **Web-App** hinzu und kopiere die Config-Werte

### 2. Firebase Config einfügen (2 Minuten)

Öffne: **`src/config/firebase.js`**

Ersetze die Platzhalter-Werte (Zeile 17-22):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",                                 // ← AUS FIREBASE CONSOLE
  authDomain: "travelcostassist-12345.firebaseapp.com",  // ← AUS FIREBASE CONSOLE
  projectId: "travelcostassist-12345",                   // ← AUS FIREBASE CONSOLE
  storageBucket: "travelcostassist-12345.appspot.com",   // ← AUS FIREBASE CONSOLE
  messagingSenderId: "123456789012",                     // ← AUS FIREBASE CONSOLE
  appId: "1:123456789012:web:abc123"                     // ← AUS FIREBASE CONSOLE
};
```

### 3. Security Rules deployen (3 Minuten)

#### Firestore Rules:
1. Firebase Console → **Firestore Database** → Tab **"Regeln"** / **"Rules"**
2. **Kopiere** den Inhalt von **`firestore.rules`** (im Projekt-Root)
3. **Veröffentlichen** / **Publish**

#### Storage Rules:
1. Firebase Console → **Storage** → Tab **"Rules"**
2. **Kopiere** den Inhalt von **`storage.rules`** (im Projekt-Root)
3. **Veröffentlichen** / **Publish**

---

## Firebase Packages installieren

Die Firebase-Pakete wurden bereits zur `package.json` hinzugefügt:

```bash
cd d:\Github\TravelCostAssist
npm install
```

Falls npm SSL-Probleme macht:
```bash
npm config set strict-ssl false
npm config set registry http://registry.npmjs.org/
npm install
```

---

## App starten

Nach erfolgreicher Firebase-Konfiguration:

```bash
npm start
```

### Expo Go auf Smartphone:
1. Installiere **Expo Go** aus dem App Store / Play Store
2. Scanne den QR-Code im Terminal

### Erste Anmeldung:
1. App öffnet sich auf **Login Screen**
2. Klicke **"Jetzt registrieren"**
3. Registriere dich mit E-Mail und Passwort
4. Du wirst automatisch eingeloggt → **Dashboard**

---

## Datenbankstruktur (Firestore)

### Collections:

#### `users/{userId}`
Benutzerprofil mit Firmendaten und persönlichen Informationen

#### `trips/{tripId}`
Dienstreisen mit:
- `userId` (Referenz zum User)
- `name`, `destination`
- `startDateTime`, `endDateTime`
- `status`, `currency`
- `mealAllowances`

#### `expenses/{expenseId}`
Ausgaben mit:
- `userId`, `tripId`
- `category`, `grossAmount`, `netAmount`
- `date`, `description`
- `receiptUrls` (Array von Firebase Storage URLs)

#### `settings/{userId}`
App-Einstellungen (Währung, Sprache)

---

## Firebase Storage Struktur

```
receipts/
  └── {userId}/
      └── {expenseId}/
          ├── 1234567890_abc123.jpg
          ├── 1234567891_def456.jpg
          └── ...
```

Jeder User kann nur seine eigenen Belege sehen und hochladen (Security Rules).

---

## Security & Datenschutz

### Firestore Security Rules:
- ✅ Jeder User sieht nur **eigene Daten**
- ✅ Kein Cross-User-Zugriff möglich
- ✅ Validierung auf Server-Seite

### Firebase Storage Rules:
- ✅ Nur der Owner kann Receipts hochladen/löschen
- ✅ Max. Dateigröße: 5 MB
- ✅ Nur Bilder erlaubt (`image/*`)

### DSGVO-konform:
- ✅ Daten werden in **EU-Region** gespeichert (Frankfurt)
- ✅ Firebase API Key ist **öffentlich** (OK, Security liegt in Rules!)
- ✅ Verschlüsselung mit TLS

---

## Offline-Support

Firebase Firestore hat **eingebauten Offline-Support**:

- ✅ Daten werden lokal gecached
- ✅ Änderungen im Offline-Modus werden in Queue gespeichert
- ✅ Automatische Synchronisation bei Reconnect

Aktiviert in `src/config/firebase.js` (Zeile 37-47).

---

## Migration von AsyncStorage zu Firebase (Optional)

Falls du bereits Daten in AsyncStorage hast, kannst du eine Migration implementieren:

1. Erstelle `src/utils/dataMigration.js`
2. Beim ersten Login: AsyncStorage-Daten auslesen
3. Zu Firebase Firestore hochladen
4. AsyncStorage löschen

**Hinweis:** Aktuell startet die App **ohne Migration** - alte AsyncStorage-Daten bleiben unangetastet.

---

## Troubleshooting

### App startet nicht?
1. Prüfe `package.json` → `"firebase": "^11.1.0"` vorhanden?
2. Führe `npm install` erneut aus
3. Prüfe Firebase Config in `src/config/firebase.js`

### Login funktioniert nicht?
1. Firebase Console → **Authentication**
2. Prüfe ob **"E-Mail/Passwort"** aktiviert ist
3. Prüfe Browser-Console / Expo-Logs auf Fehlermeldungen

### Firestore-Fehler "Permission Denied"?
1. Prüfe ob **Firestore Rules** korrekt deployed sind
2. Vergleiche mit `firestore.rules` im Projekt
3. Prüfe ob `userId` in Dokumenten gesetzt ist

### Receipt-Upload fehlgeschlagen?
1. Prüfe ob **Storage Rules** korrekt deployed sind
2. Vergleiche mit `storage.rules` im Projekt
3. Prüfe Datei-Größe (max. 5 MB)

### Netzwerk-Fehler?
1. Prüfe Internetverbindung
2. Prüfe Firebase API Key in `src/config/firebase.js`
3. Öffne Browser DevTools / Expo Logs

---

## Firebase Kosten

**Spark Plan (KOSTENLOS):**
- ✅ Unbegrenzte Authentication
- ✅ 1 GB Firestore Speicher
- ✅ 50.000 Reads/Tag
- ✅ 20.000 Writes/Tag
- ✅ 5 GB Storage
- ✅ 1 GB Download/Tag

**Für 5-20 Nutzer:** Komplett kostenlos! ✅

Blaze Plan (Pay-as-you-go) nur bei höherer Nutzung.

---

## Weitere Informationen

- **Firebase Docs:** https://firebase.google.com/docs
- **Firestore Docs:** https://firebase.google.com/docs/firestore
- **Security Rules:** https://firebase.google.com/docs/rules
- **Firebase Pricing:** https://firebase.google.com/pricing

---

## Support

Falls Probleme auftreten:
1. Prüfe [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
2. Prüfe Browser Console / Expo Logs
3. Prüfe Firebase Console → Usage & Logs

---

## Nächste Features (Optional)

Nach erfolgreicher Firebase-Integration könntest du implementieren:

- 🔄 **Realtime Listeners**: Änderungen erscheinen sofort (ohne Reload)
- 📧 **E-Mail-Verifikation**: Bestätigungs-E-Mail nach Registrierung
- 🔐 **Passwort-Richtlinien**: Mindestlänge, Sonderzeichen
- 👥 **Team-Features**: Mehrere Nutzer einer Firma können Trips teilen
- 📊 **Admin-Dashboard**: Auswertungen über alle Nutzer
- 🌐 **Mehrsprachigkeit**: Englisch, Französisch, etc.

---

Viel Erfolg! 🚀

Bei Fragen: Einfach nachfragen!
