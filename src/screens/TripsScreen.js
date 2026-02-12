import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import {
  Text,
  FAB,
  TextInput,
  Button,
  Icon,
  Snackbar,
  Divider,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
// Einfache ID-Generierung ohne crypto.getRandomValues() (React Native kompatibel)
const generateId = () =>
  Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
import theme from '../theme';
import { loadTrips, addTrip, deleteTrip, loadExpenses } from '../utils/storage';
import { TRIP_STATUS } from '../utils/categories';
import { calculateMealAllowances, formatAbsenceDuration } from '../utils/verpflegungspauschalen';
import TripCard from '../components/TripCard';

const combineDateAndTime = (date, time) => {
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
};

const TripsScreen = ({ navigation }) => {
  const [trips, setTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // New trip form state
  const [tripName, setTripName] = useState('');
  const [tripDestination, setTripDestination] = useState('');
  const [tripCompany, setTripCompany] = useState('');
  const [tripContact, setTripContact] = useState('');
  const [tripStartDate, setTripStartDate] = useState(new Date());
  const [tripEndDate, setTripEndDate] = useState(new Date());
  const [tripStartTime, setTripStartTime] = useState(new Date());
  const [tripEndTime, setTripEndTime] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);


  // Preview of meal allowances based on current date/time selection
  const mealAllowancePreview = useMemo(() => {
    const start = combineDateAndTime(tripStartDate, tripStartTime);
    const end = combineDateAndTime(tripEndDate, tripEndTime);
    if (end <= start) return null;
    return calculateMealAllowances(start.toISOString(), end.toISOString());
  }, [tripStartDate, tripStartTime, tripEndDate, tripEndTime]);

  const absenceDurationText = useMemo(() => {
    const start = combineDateAndTime(tripStartDate, tripStartTime);
    const end = combineDateAndTime(tripEndDate, tripEndTime);
    const diffMs = end - start;
    if (diffMs <= 0) return null;
    const hours = diffMs / (1000 * 60 * 60);
    return formatAbsenceDuration(hours);
  }, [tripStartDate, tripStartTime, tripEndDate, tripEndTime]);

  const loadData = useCallback(async () => {
    const loadedTrips = await loadTrips();
    const loadedExpenses = await loadExpenses();

    // Enrich trips with expense data and meal allowances total
    const enrichedTrips = loadedTrips.map((trip) => {
      const tripExpenses = loadedExpenses.filter((e) => e.tripId === trip.id);
      const totalAmount = tripExpenses.reduce(
        (sum, e) => sum + (parseFloat(e.amount) || 0),
        0
      );
      const mealAllowancesTotal = trip.mealAllowances
        ? trip.mealAllowances.totalAmount
        : 0;
      return {
        ...trip,
        totalAmount,
        expenseCount: tripExpenses.length,
        mealAllowancesTotal,
      };
    });

    setTrips(enrichedTrips);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const resetForm = () => {
    setTripName('');
    setTripDestination('');
    setTripCompany('');
    setTripContact('');
    setTripStartDate(new Date());
    setTripEndDate(new Date());
    setTripStartTime(new Date());
    setTripEndTime(new Date());
  };

  const handleCreateTrip = async () => {
    if (!tripName.trim()) {
      Alert.alert('Fehlende Eingabe', 'Bitte geben Sie einen Reisenamen ein.');
      return;
    }

    const startDateTime = combineDateAndTime(tripStartDate, tripStartTime);
    const endDateTime = combineDateAndTime(tripEndDate, tripEndTime);

    if (endDateTime <= startDateTime) {
      Alert.alert('Ungültige Zeiten', 'Das Reiseende muss nach dem Reisebeginn liegen.');
      return;
    }

    setSaving(true);

    try {
      const mealAllowances = calculateMealAllowances(
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );

      const newTrip = {
        id: generateId(),
        name: tripName.trim(),
        destination: tripDestination.trim(),
        company: tripCompany.trim(),
        contact: tripContact.trim(),
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        status: TRIP_STATUS.DRAFT,
        currency: 'EUR',
        mealAllowances,
        createdAt: new Date().toISOString(),
      };

      const success = await addTrip(newTrip);

      if (success) {
        setModalVisible(false);
        resetForm();
        setSnackbarMessage('Reise erfolgreich erstellt!');
        setSnackbarVisible(true);
        await loadData();
      } else {
        Alert.alert('Fehler', 'Fehler beim Erstellen der Reise.');
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Reise:', error);
      Alert.alert('Fehler', `Reise konnte nicht erstellt werden: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrip = (trip) => {
    Alert.alert(
      'Reise l\u00f6schen',
      `M\u00f6chten Sie die Reise "${trip.name}" und alle zugeh\u00f6rigen Ausgaben wirklich l\u00f6schen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'L\u00f6schen',
          style: 'destructive',
          onPress: async () => {
            await deleteTrip(trip.id);
            setSnackbarMessage('Reise wurde gel\u00f6scht.');
            setSnackbarVisible(true);
            await loadData();
          },
        },
      ]
    );
  };

  // Date picker handlers
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setTripStartDate(selectedDate);
      if (selectedDate > tripEndDate) {
        setTripEndDate(selectedDate);
      }
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setTripEndDate(selectedDate);
    }
  };

  // Time picker handlers
  const onStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setTripStartTime(selectedTime);
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      setTripEndTime(selectedTime);
    }
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon source="airplane-off" size={64} color={theme.colors.textLight} />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        Keine Reisen vorhanden
      </Text>
      <Text variant="bodyMedium" style={styles.emptyText}>
        {'Erstellen Sie Ihre erste Dienstreise, um Ausgaben erfassen zu k\u00f6nnen.'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text variant="titleMedium" style={styles.headerTitle}>
        Ihre Dienstreisen
      </Text>
      <Text variant="bodySmall" style={styles.headerSubtitle}>
        {trips.length} {trips.length === 1 ? 'Reise' : 'Reisen'} gesamt
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}
            onLongPress={() => handleDeleteTrip(item)}
          />
        )}
        ListHeaderComponent={trips.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={[
          styles.listContent,
          trips.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Create Trip Modal */}
      <Modal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                Neue Reise erstellen
              </Text>
              <Text variant="bodySmall" style={styles.modalSubtitle}>
                Erfassen Sie die Eckdaten Ihrer Dienstreise
              </Text>
            </View>

            <Divider style={styles.modalDivider} />

            <View style={styles.modalBody}>
              <TextInput
                mode="outlined"
                label="Reisename *"
                placeholder="z.B. Kundentermin M\u00fcnchen"
                value={tripName}
                onChangeText={setTripName}
                left={<TextInput.Icon icon="briefcase" />}
                style={styles.modalInput}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.primary}
              />

              <TextInput
                mode="outlined"
                label="Reiseziel"
                placeholder="z.B. M\u00fcnchen"
                value={tripDestination}
                onChangeText={setTripDestination}
                left={<TextInput.Icon icon="map-marker" />}
                style={styles.modalInput}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.primary}
              />

              <TextInput
                mode="outlined"
                label="Firma"
                placeholder="z.B. Musterfirma GmbH"
                value={tripCompany}
                onChangeText={setTripCompany}
                left={<TextInput.Icon icon="office-building" />}
                style={styles.modalInput}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.primary}
              />

              <TextInput
                mode="outlined"
                label="Ansprechpartner"
                placeholder="z.B. Max Mustermann"
                value={tripContact}
                onChangeText={setTripContact}
                left={<TextInput.Icon icon="account" />}
                style={styles.modalInput}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.primary}
              />

              {/* Start Date and Time */}
              <Text variant="bodySmall" style={styles.dateLabel}>
                Reisebeginn
              </Text>
              <View style={styles.dateTimeRow}>
                <Button
                  mode="outlined"
                  icon="calendar"
                  onPress={() => setShowStartDatePicker(true)}
                  style={styles.dateButton}
                  textColor={theme.colors.text}
                >
                  {format(tripStartDate, 'dd.MM.yyyy', { locale: de })}
                </Button>
                <Button
                  mode="outlined"
                  icon="clock-outline"
                  onPress={() => setShowStartTimePicker(true)}
                  style={styles.timeButton}
                  textColor={theme.colors.text}
                >
                  {format(tripStartTime, 'HH:mm', { locale: de })}
                </Button>
              </View>
              {showStartDatePicker && (
                <DateTimePicker
                  value={tripStartDate}
                  mode="date"
                  display="default"
                  onChange={onStartDateChange}
                  locale="de-DE"
                />
              )}
              {showStartTimePicker && (
                <DateTimePicker
                  value={tripStartTime}
                  mode="time"
                  display="default"
                  onChange={onStartTimeChange}
                  locale="de-DE"
                  is24Hour={true}
                />
              )}

              {/* End Date and Time */}
              <Text variant="bodySmall" style={styles.dateLabel}>
                Reiseende
              </Text>
              <View style={styles.dateTimeRow}>
                <Button
                  mode="outlined"
                  icon="calendar"
                  onPress={() => setShowEndDatePicker(true)}
                  style={styles.dateButton}
                  textColor={theme.colors.text}
                >
                  {format(tripEndDate, 'dd.MM.yyyy', { locale: de })}
                </Button>
                <Button
                  mode="outlined"
                  icon="clock-outline"
                  onPress={() => setShowEndTimePicker(true)}
                  style={styles.timeButton}
                  textColor={theme.colors.text}
                >
                  {format(tripEndTime, 'HH:mm', { locale: de })}
                </Button>
              </View>
              {showEndDatePicker && (
                <DateTimePicker
                  value={tripEndDate}
                  mode="date"
                  display="default"
                  onChange={onEndDateChange}
                  locale="de-DE"
                  minimumDate={tripStartDate}
                />
              )}
              {showEndTimePicker && (
                <DateTimePicker
                  value={tripEndTime}
                  mode="time"
                  display="default"
                  onChange={onEndTimeChange}
                  locale="de-DE"
                  is24Hour={true}
                />
              )}

              {/* Absence duration and Verpflegungspauschale preview */}
              {absenceDurationText && (
                <View style={styles.previewContainer}>
                  <Divider style={styles.previewDivider} />
                  <View style={styles.previewRow}>
                    <Icon source="clock-outline" size={18} color={theme.colors.textSecondary} />
                    <Text variant="bodySmall" style={styles.previewLabel}>
                      Abwesenheitsdauer
                    </Text>
                    <Text variant="bodyMedium" style={styles.previewValue}>
                      {absenceDurationText}
                    </Text>
                  </View>
                  {mealAllowancePreview && (
                    <View style={styles.previewRow}>
                      <Icon source="food-fork-drink" size={18} color={theme.colors.accent} />
                      <Text variant="bodySmall" style={styles.previewLabel}>
                        Verpflegungspauschale
                      </Text>
                      <Text variant="bodyMedium" style={styles.previewValueHighlight}>
                        {mealAllowancePreview.formattedTotal}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <Divider style={styles.modalDivider} />

            <View style={styles.modalActions}>
              <Button
                mode="text"
                onPress={() => setModalVisible(false)}
                textColor={theme.colors.textSecondary}
              >
                Abbrechen
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateTrip}
                loading={saving}
                disabled={saving}
                buttonColor={theme.colors.primary}
                textColor="#FFFFFF"
                icon="check"
              >
                Erstellen
              </Button>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
          </View>
        </View>
        </Modal>

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

      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
        label="Neue Reise"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingBottom: 100,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: theme.colors.textLight,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    margin: theme.spacing.md,
    right: 0,
    bottom: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness * 2,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  modalTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  modalDivider: {
    backgroundColor: theme.colors.divider,
  },
  modalBody: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  modalInput: {
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm + 4,
  },
  dateLabel: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.xs,
    fontWeight: '500',
  },
  dateTimeRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  dateButton: {
    flex: 1,
    borderColor: theme.colors.border,
    justifyContent: 'flex-start',
  },
  timeButton: {
    flex: 0,
    minWidth: 110,
    borderColor: theme.colors.border,
    justifyContent: 'flex-start',
  },
  previewContainer: {
    marginTop: theme.spacing.sm,
  },
  previewDivider: {
    backgroundColor: theme.colors.divider,
    marginBottom: theme.spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs + 2,
  },
  previewLabel: {
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  previewValue: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  previewValueHighlight: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
});

export default TripsScreen;
