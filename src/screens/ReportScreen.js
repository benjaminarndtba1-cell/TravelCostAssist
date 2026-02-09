import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  Icon,
  Divider,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import theme from '../theme';
import {
  loadTrips,
  loadExpenses,
  loadUserProfile,
  loadSettings,
} from '../utils/storage';
import { generateReportPDF } from '../utils/reportGenerator';

const ReportScreen = () => {
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First of current month
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Data state
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Summary state
  const [summary, setSummary] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Load base data on focus
  useFocusEffect(
    useCallback(() => {
      const loadBase = async () => {
        const [profile, appSettings] = await Promise.all([
          loadUserProfile(),
          loadSettings(),
        ]);
        setUserProfile(profile);
        setSettings(appSettings);
      };
      loadBase();
    }, [])
  );

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

  const handleSearch = async () => {
    setLoading(true);
    const [trips, expenses] = await Promise.all([
      loadTrips(),
      loadExpenses(),
    ]);

    setAllExpenses(expenses);

    // Filter trips by date range overlap
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filtered = trips.filter((trip) => {
      const tripStart = new Date(trip.startDateTime);
      const tripEnd = new Date(trip.endDateTime);
      return tripStart <= endOfDay && tripEnd >= startDate;
    });

    filtered.sort(
      (a, b) => new Date(a.startDateTime) - new Date(b.startDateTime)
    );
    setFilteredTrips(filtered);

    // Calculate summary
    let totalGross = 0;
    let totalMeal = 0;
    let totalPositions = 0;

    filtered.forEach((trip) => {
      const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
      totalPositions += tripExpenses.length;
      totalGross += tripExpenses.reduce(
        (sum, e) => sum + (parseFloat(e.grossAmount || e.amount) || 0),
        0
      );
      totalMeal += trip.mealAllowances ? trip.mealAllowances.totalAmount : 0;
    });

    setSummary({
      tripCount: filtered.length,
      positionCount: totalPositions,
      totalGross,
      totalMeal,
      grandTotal: totalGross + totalMeal,
    });

    setHasSearched(true);
    setLoading(false);
  };

  const handleGeneratePDF = async () => {
    if (filteredTrips.length === 0) {
      setSnackbarMessage(
        'Keine Reisen im gewählten Zeitraum gefunden.'
      );
      setSnackbarVisible(true);
      return;
    }

    setGenerating(true);
    try {
      await generateReportPDF({
        trips: filteredTrips,
        expenses: allExpenses,
        userProfile,
        settings,
        startDate,
        endDate,
      });
      setSnackbarMessage('PDF wurde erfolgreich erstellt.');
      setSnackbarVisible(true);
    } catch (error) {
      setSnackbarMessage(
        'Fehler beim Erstellen der PDF: ' + error.message
      );
      setSnackbarVisible(true);
    }
    setGenerating(false);
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Range Selection */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <Icon
              source="calendar-range"
              size={22}
              color={theme.colors.primary}
            />
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Abrechnungszeitraum
            </Text>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text variant="bodySmall" style={styles.dateLabel}>
                Von
              </Text>
              <Button
                mode="outlined"
                icon="calendar"
                onPress={() => setShowStartPicker(true)}
                style={styles.dateButton}
                textColor={theme.colors.text}
                compact
              >
                {format(startDate, 'dd.MM.yyyy', { locale: de })}
              </Button>
            </View>
            <View style={styles.dateField}>
              <Text variant="bodySmall" style={styles.dateLabel}>
                Bis
              </Text>
              <Button
                mode="outlined"
                icon="calendar"
                onPress={() => setShowEndPicker(true)}
                style={styles.dateButton}
                textColor={theme.colors.text}
                compact
              >
                {format(endDate, 'dd.MM.yyyy', { locale: de })}
              </Button>
            </View>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onStartDateChange}
              locale="de-DE"
              maximumDate={endDate}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onEndDateChange}
              locale="de-DE"
              minimumDate={startDate}
              maximumDate={new Date()}
            />
          )}

          <Button
            mode="contained"
            icon="magnify"
            onPress={handleSearch}
            loading={loading}
            disabled={loading}
            style={styles.searchButton}
            buttonColor={theme.colors.primary}
            textColor="#FFFFFF"
          >
            Reisen anzeigen
          </Button>
        </Surface>

        {/* Summary */}
        {hasSearched && summary && (
          <Surface style={styles.section} elevation={1}>
            <View style={styles.sectionHeader}>
              <Icon
                source="calculator"
                size={22}
                color={theme.colors.primary}
              />
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Übersicht
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text variant="headlineSmall" style={styles.summaryValue}>
                  {summary.tripCount}
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  {summary.tripCount === 1 ? 'Reise' : 'Reisen'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text variant="headlineSmall" style={styles.summaryValue}>
                  {summary.positionCount}
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  Positionen
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.costRow}>
              <Text variant="bodyMedium" style={styles.costLabel}>
                Ausgaben (brutto)
              </Text>
              <Text variant="bodyMedium" style={styles.costValue}>
                {formatCurrency(summary.totalGross)}
              </Text>
            </View>
            <View style={styles.costRow}>
              <Text variant="bodyMedium" style={styles.costLabel}>
                Verpflegungspauschalen
              </Text>
              <Text variant="bodyMedium" style={styles.costValue}>
                {formatCurrency(summary.totalMeal)}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.costRow}>
              <Text variant="titleSmall" style={styles.grandTotalLabel}>
                Erstattungsbetrag
              </Text>
              <Text variant="titleLarge" style={styles.grandTotalValue}>
                {formatCurrency(summary.grandTotal)}
              </Text>
            </View>
          </Surface>
        )}

        {/* Trip List */}
        {hasSearched && filteredTrips.length > 0 && (
          <Surface style={styles.section} elevation={1}>
            <View style={styles.sectionHeader}>
              <Icon
                source="airplane"
                size={22}
                color={theme.colors.primary}
              />
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Reisen im Zeitraum
              </Text>
            </View>

            {filteredTrips.map((trip, idx) => {
              const tripExpenses = allExpenses.filter(
                (e) => e.tripId === trip.id
              );
              const tripTotal =
                tripExpenses.reduce(
                  (sum, e) =>
                    sum +
                    (parseFloat(e.grossAmount || e.amount) || 0),
                  0
                ) +
                (trip.mealAllowances
                  ? trip.mealAllowances.totalAmount
                  : 0);

              return (
                <View key={trip.id}>
                  {idx > 0 && <Divider style={styles.tripDivider} />}
                  <View style={styles.tripRow}>
                    <View style={styles.tripInfo}>
                      <Text
                        variant="bodyMedium"
                        style={styles.tripName}
                        numberOfLines={1}
                      >
                        {trip.name}
                      </Text>
                      <Text variant="bodySmall" style={styles.tripMeta}>
                        {trip.destination
                          ? trip.destination + ' · '
                          : ''}
                        {format(
                          new Date(trip.startDateTime),
                          'dd.MM.',
                          { locale: de }
                        )}
                        &ndash;
                        {format(
                          new Date(trip.endDateTime),
                          'dd.MM.yyyy',
                          { locale: de }
                        )}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={styles.tripPositions}
                      >
                        {tripExpenses.length}{' '}
                        {tripExpenses.length === 1
                          ? 'Position'
                          : 'Positionen'}
                      </Text>
                    </View>
                    <Text
                      variant="titleSmall"
                      style={styles.tripAmount}
                    >
                      {formatCurrency(tripTotal)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Surface>
        )}

        {/* Empty State */}
        {hasSearched && filteredTrips.length === 0 && (
          <Surface style={styles.section} elevation={1}>
            <View style={styles.emptyContainer}>
              <Icon
                source="calendar-blank"
                size={48}
                color={theme.colors.textLight}
              />
              <Text variant="bodyMedium" style={styles.emptyText}>
                Keine Reisen im gewählten Zeitraum gefunden.
              </Text>
            </View>
          </Surface>
        )}

        {/* Export Actions */}
        {hasSearched && filteredTrips.length > 0 && (
          <View style={styles.exportSection}>
            <Button
              mode="contained"
              icon="file-pdf-box"
              onPress={handleGeneratePDF}
              loading={generating}
              disabled={generating}
              style={styles.exportButton}
              contentStyle={styles.exportButtonContent}
              buttonColor={theme.colors.primary}
              textColor="#FFFFFF"
            >
              PDF erstellen und teilen
            </Button>
          </View>
        )}
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
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
    padding: theme.spacing.md,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm + 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm + 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },

  // Date pickers
  dateRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm + 4,
    marginBottom: theme.spacing.md,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    color: theme.colors.textLight,
    marginBottom: 4,
    fontSize: 11,
  },
  dateButton: {
    borderColor: theme.colors.border,
  },
  searchButton: {
    borderRadius: theme.roundness,
  },

  // Summary
  summaryGrid: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: theme.colors.divider,
  },
  summaryValue: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    marginVertical: theme.spacing.sm + 4,
    backgroundColor: theme.colors.divider,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  costLabel: {
    color: theme.colors.text,
  },
  costValue: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  grandTotalLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  grandTotalValue: {
    color: theme.colors.primary,
    fontWeight: '700',
  },

  // Trip list
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  tripInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  tripName: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  tripMeta: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  tripPositions: {
    color: theme.colors.textLight,
    fontSize: 11,
    marginTop: 1,
  },
  tripAmount: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  tripDivider: {
    backgroundColor: theme.colors.divider,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },

  // Export
  exportSection: {
    marginTop: theme.spacing.xs,
  },
  exportButton: {
    borderRadius: theme.roundness,
  },
  exportButtonContent: {
    paddingVertical: theme.spacing.sm,
  },
});

export default ReportScreen;
