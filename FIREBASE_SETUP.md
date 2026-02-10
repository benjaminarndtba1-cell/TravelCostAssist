# Firebase Setup Anleitung für TravelCostAssist

## Schritt 1: Firebase-Projekt erstellen (5 Minuten)

### 1.1 Firebase Console öffnen
Gehe zu: **https://console.firebase.google.com/**

### 1.2 Neues Projekt erstellen
1. Klicke auf **"Projekt hinzufügen"** oder **"Create a project"**
2. **Projektname:** `TravelCostAssist`
3. **Google Analytics:** Deaktivieren (optional, nicht erforderlich)
4. Klicke **"Projekt erstellen"**
5. Warte bis das Projekt erstellt wurde (~30 Sekunden)

---

## Schritt 2: Firebase Services aktivieren

### 2.1 Authentication aktivieren
1. Linkes Menü → **"Authentication"** (Authentifizierung)
2. Klicke **"Jetzt starten"** / **"Get started"**
3. Tab **"Sign-in method"** / **"Anmeldemethode"**
4. Klicke auf **"E-Mail/Passwort"** → **"Aktivieren"**
5. Schalter auf **EIN**
6. **Speichern**

### 2.2 Firestore Database erstellen
1. Linkes Menü → **"Firestore Database"**
2. Klicke **"Datenbank erstellen"** / **"Create database"**
3. Wähle **"Produktionsmodus"** / **"Production mode"**
4. **Region wählen:**
   - Für Deutschland: **europe-west3 (Frankfurt)**
   - Alternativ: **europe-west1 (Belgien)**
5. Klicke **"Aktivieren"** / **"Enable"**

### 2.3 Storage aktivieren
1. Linkes Menü → **"Storage"**
2. Klicke **"Jetzt starten"** / **"Get started"**
3. Wähle **"Produktionsmodus"** / **"Production mode"**
4. **Gleiche Region** wie Firestore wählen
5. Klicke **"Fertig"** / **"Done"**

---

## Schritt 3: Web-App hinzufügen & Config kopieren

### 3.1 Web-App registrieren
1. In der Projektübersicht → Klicke auf **`</>`** (Web-Icon)
2. **App-Spitzname:** `TravelCostAssist Web`
3. **Firebase Hosting:** NICHT aktivieren (Haken NICHT setzen)
4. Klicke **"App registrieren"**

### 3.2 Firebase Config kopieren
Du siehst jetzt ein Code-Snippet wie dieses:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "travelcostassist-12345.firebaseapp.com",
  projectId: "travelcostassist-12345",
  storageBucket: "travelcostassist-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

**KOPIERE alle 6 Werte!**

---

## Schritt 4: Config in App einfügen

### 4.1 Öffne die Datei
Öffne: `src/config/firebase.js`

### 4.2 Ersetze die Platzhalter
Suche nach dieser Stelle (Zeile ~18-24):

```javascript
const firebaseConfig = {
  apiKey: "DEIN_API_KEY_HIER",                           // ← HIER
  authDomain: "DEIN_PROJECT_ID.firebaseapp.com",         // ← HIER
  projectId: "DEIN_PROJECT_ID",                          // ← HIER
  storageBucket: "DEIN_PROJECT_ID.appspot.com",          // ← HIER
  messagingSenderId: "DEINE_SENDER_ID",                  // ← HIER
  appId: "DEINE_APP_ID"                                  // ← HIER
};
```

**Ersetze** die Platzhalter mit deinen echten Werten aus Schritt 3.2.

**Beispiel:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "travelcostassist-12345.firebaseapp.com",
  projectId: "travelcostassist-12345",
  storageBucket: "travelcostassist-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### 4.3 Speichern
Speichere die Datei (`Ctrl+S` oder `Cmd+S`)

---

## Schritt 5: Security Rules deployen

### 5.1 Firestore Rules
1. Firebase Console → **Firestore Database** → Tab **"Regeln"** / **"Rules"**
2. **Ersetze** alles mit diesem Code:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users Collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Trips Collection
    match /trips/{tripId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Expenses Collection
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Settings Collection
    match /settings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Klicke **"Veröffentlichen"** / **"Publish"**

### 5.2 Storage Rules
1. Firebase Console → **Storage** → Tab **"Rules"**
2. **Ersetze** alles mit diesem Code:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Receipts Storage
    match /receipts/{userId}/{expenseId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow write: if request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }
  }
}
```

3. Klicke **"Veröffentlichen"** / **"Publish"**

---

## Schritt 6: NPM Packages installieren

Öffne ein Terminal und führe aus:

```bash
cd d:\Github\TravelCostAssist
npm install
```

Das installiert das Firebase SDK (bereits in package.json hinzugefügt).

---

## Schritt 7: App testen

```bash
npm start
```

Die App sollte jetzt starten! 🎉

---

## Wichtige Hinweise

### ✅ Firebase ist kostenlos
- **Spark Plan** ist für 5-20 Nutzer komplett kostenlos
- 50.000 Lese-Operationen pro Tag
- 20.000 Schreib-Operationen pro Tag
- 5 GB Storage
- Unbegrenzte Authentication

### 🔒 Sicherheit
- Firebase API Key ist **öffentlich** (steht im Code) - das ist OK!
- Sicherheit liegt in den **Security Rules**, nicht im API Key
- Jeder User sieht nur seine eigenen Daten

### 🌍 DSGVO-konform
- Durch Auswahl der EU-Region (Frankfurt/Belgien)
- Daten bleiben in Europa

---

## Probleme?

**Firebase Config nicht gefunden?**
1. Firebase Console → Projektübersicht (Zahnrad-Symbol oben links)
2. "Allgemein" → Runterscrollen zu "Deine Apps"
3. Web-App → Firebase SDK-Snippet → "Config"

**App startet nicht?**
1. Prüfe, ob `firebase` in `package.json` unter `dependencies` steht
2. Führe `npm install` erneut aus
3. Prüfe, ob die Config-Werte korrekt eingefügt wurden

**Authentication funktioniert nicht?**
1. Firebase Console → Authentication
2. Prüfe, ob "E-Mail/Passwort" aktiviert ist

---

## Nächste Schritte

Wenn Firebase konfiguriert ist, sage mir Bescheid - dann implementiere ich:
- ✅ Login & Registrierung Screens
- ✅ Firebase Storage Service
- ✅ Auth Context
- ✅ Navigation

Viel Erfolg! 🚀
