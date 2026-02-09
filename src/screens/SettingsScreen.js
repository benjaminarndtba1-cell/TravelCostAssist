import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Divider,
  Icon,
  List,
  RadioButton,
  Snackbar,
} from 'react-native-paper';
import theme from '../theme';
import {
  loadUserProfile,
  saveUserProfile,
  loadSettings,
  saveSettings,
  clearAllData,
  loadExpenses,
  loadTrips,
} from '../utils/storage';

const SettingsScreen = () => {
  // User profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Settings
  const [currency, setCurrency] = useState('EUR');

  // Stats
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalTrips, setTotalTrips] = useState(0);

  // Snackbar
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const profile = await loadUserProfile();
    setName(profile.name || '');
    setEmail(profile.email || '');
    setDepartment(profile.department || '');
    setEmployeeId(profile.employeeId || '');

    const settings = await loadSettings();
    setCurrency(settings.currency || 'EUR');

    const expenses = await loadExpenses();
    const trips = await loadTrips();
    setTotalExpenses(expenses.length);
    setTotalTrips(trips.length);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    const success = await saveUserProfile({
      name: name.trim(),
      email: email.trim(),
      department: department.trim(),
      employeeId: employeeId.trim(),
    });
    setProfileSaving(false);

    if (success) {
      setSnackbarMessage('Profil erfolgreich gespeichert.');
      setSnackbarVisible(true);
    } else {
      setSnackbarMessage('Fehler beim Speichern des Profils.');
      setSnackbarVisible(true);
    }
  };

  const handleCurrencyChange = async (newCurrency) => {
    setCurrency(newCurrency);
    await saveSettings({
      currency: newCurrency,
      currencySymbol: newCurrency === 'EUR' ? '€' : newCurrency === 'CHF' ? 'CHF' : '$',
      language: 'de',
    });
  };

  const handleExportCSV = () => {
    Alert.alert(
      'Export',
      'Die CSV-Export-Funktion wird in einer zukünftigen Version verfügbar sein.',
      [{ text: 'OK' }]
    );
  };

  const handleExportPDF = () => {
    Alert.alert(
      'Export',
      'Die PDF-Export-Funktion wird in einer zukünftigen Version verfügbar sein.',
      [{ text: 'OK' }]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Alle Daten löschen',
      'Möchten Sie wirklich alle gespeicherten Daten (Reisen, Ausgaben, Profil) unwiderruflich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: async () => {
            const success = await clearAllData();
            if (success) {
              setName('');
              setEmail('');
              setDepartment('');
              setEmployeeId('');
              setCurrency('EUR');
              setTotalExpenses(0);
              setTotalTrips(0);
              setSnackbarMessage('Alle Daten wurden gelöscht.');
              setSnackbarVisible(true);
            } else {
              setSnackbarMessage('Fehler beim Löschen der Daten.');
              setSnackbarVisible(true);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <Icon source="account-circle" size={24} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Benutzerprofil
            </Text>
          </View>
          <Divider style={styles.sectionDivider} />

          <TextInput
            mode="outlined"
            label="Name"
            value={name}
            onChangeText={setName}
            left={<TextInput.Icon icon="account" />}
            style={styles.input}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.primary}
          />

          <TextInput
            mode="outlined"
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email" />}
            style={styles.input}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.primary}
          />

          <TextInput
            mode="outlined"
            label="Abteilung"
            value={department}
            onChangeText={setDepartment}
            left={<TextInput.Icon icon="domain" />}
            style={styles.input}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.primary}
          />

          <TextInput
            mode="outlined"
            label="Personalnummer"
            value={employeeId}
            onChangeText={setEmployeeId}
            left={<TextInput.Icon icon="badge-account" />}
            style={styles.input}
            outlineColor={theme.colors.border}
            activeOutlineColor={theme.colors.primary}
          />

          <Button
            mode="contained"
            onPress={handleSaveProfile}
            loading={profileSaving}
            disabled={profileSaving}
            style={styles.saveProfileButton}
            buttonColor={theme.colors.primary}
            textColor="#FFFFFF"
            icon="content-save"
          >
            Profil speichern
          </Button>
        </Surface>

        {/* Currency Section */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <Icon source="currency-eur" size={24} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Währung
            </Text>
          </View>
          <Divider style={styles.sectionDivider} />

          <RadioButton.Group
            onValueChange={handleCurrencyChange}
            value={currency}
          >
            <RadioButton.Item
              label="Euro (EUR / €)"
              value="EUR"
              color={theme.colors.primary}
              style={styles.radioItem}
            />
            <RadioButton.Item
              label="Schweizer Franken (CHF)"
              value="CHF"
              color={theme.colors.primary}
              style={styles.radioItem}
            />
            <RadioButton.Item
              label="US-Dollar (USD / $)"
              value="USD"
              color={theme.colors.primary}
              style={styles.radioItem}
            />
          </RadioButton.Group>
        </Surface>

        {/* Export Section */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <Icon source="file-export" size={24} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Daten exportieren
            </Text>
          </View>
          <Divider style={styles.sectionDivider} />

          <List.Item
            title="Als CSV exportieren"
            description="Tabellenformat für Excel und andere Programme"
            left={(props) => <List.Icon {...props} icon="file-delimited" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleExportCSV}
            style={styles.listItem}
          />
          <Divider />
          <List.Item
            title="Als PDF exportieren"
            description="Druckfertige Reisekostenabrechnung"
            left={(props) => <List.Icon {...props} icon="file-pdf-box" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleExportPDF}
            style={styles.listItem}
          />
        </Surface>

        {/* Data Management */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <Icon source="database" size={24} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Datenverwaltung
            </Text>
          </View>
          <Divider style={styles.sectionDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {totalExpenses}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Ausgaben
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {totalTrips}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Reisen
              </Text>
            </View>
          </View>

          <Button
            mode="outlined"
            onPress={handleClearData}
            style={styles.deleteButton}
            textColor={theme.colors.error}
            icon="delete-forever"
          >
            Alle Daten löschen
          </Button>
        </Surface>

        {/* About Section */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <Icon
              source="information"
              size={24}
              color={theme.colors.primary}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Über die App
            </Text>
          </View>
          <Divider style={styles.sectionDivider} />

          <View style={styles.aboutContent}>
            <Text variant="titleMedium" style={styles.appName}>
              TravelCostAssist
            </Text>
            <Text variant="bodySmall" style={styles.appVersion}>
              Version 1.0.0
            </Text>
            <Text variant="bodyMedium" style={styles.appDescription}>
              Erfassen und verwalten Sie Ihre Reisekosten einfach und
              übersichtlich. Fotografieren Sie Belege, ordnen Sie Ausgaben
              Dienstreisen zu und behalten Sie den Überblick über Ihre
              Reisekostenabrechnung.
            </Text>
            <Divider style={styles.aboutDivider} />
            <Text variant="bodySmall" style={styles.copyright}>
              Reisekostenerfassung im Unternehmen
            </Text>
          </View>
        </Surface>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  section: {
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  sectionDivider: {
    backgroundColor: theme.colors.divider,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm + 4,
  },
  saveProfileButton: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    borderRadius: theme.roundness,
  },
  radioItem: {
    paddingHorizontal: theme.spacing.md,
  },
  listItem: {
    paddingHorizontal: theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.divider,
  },
  deleteButton: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderColor: theme.colors.error,
  },
  aboutContent: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  appName: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  appVersion: {
    color: theme.colors.textLight,
    marginTop: 2,
  },
  appDescription: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 22,
  },
  aboutDivider: {
    marginVertical: theme.spacing.md,
    width: '60%',
    backgroundColor: theme.colors.divider,
  },
  copyright: {
    color: theme.colors.textLight,
  },
});

export default SettingsScreen;
