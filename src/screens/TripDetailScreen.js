import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Surface,
  Icon,
  Chip,
  Button,
  Divider,
  FAB,
  TextInput,
  Snackbar,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import theme from '../theme';
import { loadTrips, loadExpenses, deleteExpense, updateTrip } from '../utils/storage';
import { TRIP_STATUS, TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../utils/categories';
import { calculateMealAllowances, formatAbsenceDuration } from '../utils/verpflegungspauschalen';
import { formatCurrency, formatDateDE } from '../utils/formatting';
import { useSnackbar } from '../hooks/useSnackbar';
import ExpenseCard from '../components/ExpenseCard';

const combineDateAndTime = (date, time) => {
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
};

const TripDetailScreen = ({ route, navigation }) => {
  const { tripId, editMode } = route.params;
  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editEndDate, setEditEndDate] = useState(new Date());
  const [editStartTime, setEditStartTime] = useState(new Date());
  const [editEndTime, setEditEndTime] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const snackbar = useSnackbar();
  const [editModalOpened, setEditModalOpened] = useState(false);

  // Preview of meal allowances based on current date/time selection in edit modal
  const editMealAllowancePreview = useMemo(() => {
    const start = combineDateAndTime(editStartDate, editStartTime);
    const end = combineDateAndTime(editEndDate, editEndTime);
    if (end <= start) return null;
    return calculateMealAllowances(start.toISOString(), end.toISOString());
  }, [editStartDate, editStartTime, editEndDate, editEndTime]);

  const editAbsenceDurationText = useMemo(() => {
    const start = combineDateAndTime(editStartDate, editStartTime);
    const end = combineDateAndTime(editEndDate, editEndTime);
    const diffMs = end - start;
    if (diffMs <= 0) return null;
    const hours = diffMs / (1000 * 60 * 60);
    return formatAbsenceDuration(hours);
  }, [editStartDate, editStartTime, editEndDate, editEndTime]);

  const openEditModal = useCallback((tripData) => {
    if (!tripData) return;
    setEditName(tripData.name || '');
    setEditDestination(tripData.destination || '');
    setEditCompany(tripData.company || '');
    setEditContact(tripData.contact || '');
    const startDt = tripData.startDateTime ? new Date(tripData.startDateTime) : new Date();
    const endDt = tripData.endDateTime ? new Date(tripData.endDateTime) : new Date();
    setEditStartDate(startDt);
    setEditEndDate(endDt);
    setEditStartTime(startDt);
    setEditEndTime(endDt);
    setEditModalVisible(true);
  }, []);

  const loadData = useCallback(async () => {
    const allTrips = await loadTrips();
    const currentTrip = allTrips.find((t) => t.id === tripId);
    setTrip(currentTrip);

    if (currentTrip) {
      navigation.setOptions({ headerTitle: currentTrip.name });
    }

    const allExpenses = await loadExpenses();
    const tripExpenses = allExpenses.filter((e) => e.tripId === tripId);
    tripExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    setExpenses(tripExpenses);
  }, [tripId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Auto-open edit modal when navigated with editMode
  useEffect(() => {
    if (editMode && trip && !editModalOpened) {
      const canEdit = trip.status !== TRIP_STATUS.COMPLETED
        && trip.status !== TRIP_STATUS.SUBMITTED
        && trip.status !== TRIP_STATUS.APPROVED;
      if (canEdit) {
        setEditModalOpened(true);
        openEditModal(trip);
      }
    }
  }, [editMode, trip, editModalOpened, openEditModal]);

  const handleSaveTrip = async () => {
    if (!editName.trim()) {
      Alert.alert('Fehlende Eingabe', 'Bitte geben Sie einen Reisenamen ein.');
      return;
    }

    const startDateTime = combineDateAndTime(editStartDate, editStartTime);
    const endDateTime = combineDateAndTime(editEndDate, editEndTime);

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

      const updatedData = {
        name: editName.trim(),
        destination: editDestination.trim(),
        company: editCompany.trim(),
        contact: editContact.trim(),
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        mealAllowances,
      };

      const success = await updateTrip(tripId, updatedData);

      if (success) {
        setEditModalVisible(false);
        snackbar.show('Reisedaten erfolgreich aktualisiert!');
        await loadData();
      } else {
        Alert.alert('Fehler', 'Fehler beim Speichern der Reisedaten.');
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Reise:', error);
      Alert.alert('Fehler', `Reise konnte nicht gespeichert werden: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Date picker handlers for edit modal
  const onEditStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setEditStartDate(selectedDate);
      if (selectedDate > editEndDate) {
        setEditEndDate(selectedDate);
      }
    }
  };

  const onEditEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEditEndDate(selectedDate);
    }
  };

  const onEditStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setEditStartTime(selectedTime);
    }
  };

  const onEditEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      setEditEndTime(selectedTime);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const isCompleted = trip?.status === TRIP_STATUS.COMPLETED;
  const isEditable = trip?.status === TRIP_STATUS.DRAFT || trip?.status === TRIP_STATUS.REJECTED;

  const handleEditExpense = (expense) => {
    if (isCompleted) {
      Alert.alert(
        'Reise abgeschlossen',
        'Diese Reise ist bereits abgeschlossen. Möchten Sie die Position trotzdem bearbeiten?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Trotzdem bearbeiten',
            onPress: () => navigation.navigate('AusgabeBearbeiten', { expense, tripId: trip.id }),
          },
        ]
      );
    } else {
      navigation.navigate('AusgabeBearbeiten', { expense, tripId: trip.id });
    }
  };

  const handleAddExpense = () => {
    if (isCompleted) {
      Alert.alert(
        'Reise abgeschlossen',
        'Diese Reise ist bereits abgeschlossen. Möchten Sie trotzdem eine neue Position hinzufügen?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Trotzdem hinzufügen',
            onPress: () => navigation.navigate('NeueAusgabeStack', { tripId: trip.id }),
          },
        ]
      );
    } else {
      navigation.navigate('NeueAusgabeStack', { tripId: trip.id });
    }
  };

  const handleDeleteExpense = (expense) => {
    if (isCompleted) {
      Alert.alert(
        'Reise abgeschlossen',
        'Diese Reise ist bereits abgeschlossen. Möchten Sie die Position trotzdem löschen?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Trotzdem löschen',
            style: 'destructive',
            onPress: () => confirmDeleteExpense(expense),
          },
        ]
      );
    } else {
      confirmDeleteExpense(expense);
    }
  };

  const confirmDeleteExpense = (expense) => {
    Alert.alert(
      'Ausgabe löschen',
      `Möchten Sie diese Ausgabe wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await deleteExpense(expense.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleCompleteTrip = () => {
    Alert.alert(
      'Reise abschließen',
      'Möchten Sie diese Reise als abgeschlossen markieren? Sie können danach nur noch mit einer Warnung Änderungen vornehmen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abschließen',
          onPress: async () => {
            await updateTrip(tripId, { status: TRIP_STATUS.COMPLETED });
            await loadData();
          },
        },
      ]
    );
  };

  const handleReopenTrip = () => {
    Alert.alert(
      'Reise wieder öffnen',
      'Möchten Sie diese Reise wieder in den Entwurf-Status versetzen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Wieder öffnen',
          onPress: async () => {
            await updateTrip(tripId, { status: TRIP_STATUS.DRAFT });
            await loadData();
          },
        },
      ]
    );
  };

  const handleSubmitTrip = () => {
    Alert.alert(
      'Reise einreichen',
      'Möchten Sie diese Reisekostenabrechnung zur Genehmigung einreichen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Einreichen',
          onPress: async () => {
            await updateTrip(tripId, { status: TRIP_STATUS.SUBMITTED });
            await loadData();
          },
        },
      ]
    );
  };

  const handleArchiveTrip = () => {
    Alert.alert(
      'Reise archivieren',
      'Die Reise wird aus der Übersicht ausgeblendet, bleibt aber gespeichert und kann jederzeit wiederhergestellt werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Archivieren',
          onPress: async () => {
            await updateTrip(tripId, { isArchived: true });
            snackbar.show('Reise wurde archiviert.');
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleRestoreTrip = () => {
    Alert.alert(
      'Reise wiederherstellen',
      'Möchten Sie diese Reise aus dem Archiv wiederherstellen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Wiederherstellen',
          onPress: async () => {
            await updateTrip(tripId, { isArchived: false });
            snackbar.show('Reise wurde wiederhergestellt.');
            await loadData();
          },
        },
      ]
    );
  };

  if (!trip) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="bodyLarge">Reise wird geladen...</Text>
      </View>
    );
  }

  const totalGross = expenses.reduce(
    (sum, e) => sum + (parseFloat(e.grossAmount || e.amount) || 0),
    0
  );
  const totalNet = expenses.reduce(
    (sum, e) => sum + (parseFloat(e.netAmount) || parseFloat(e.grossAmount || e.amount) || 0),
    0
  );
  const totalVat = expenses.reduce(
    (sum, e) => sum + (parseFloat(e.vatAmount) || 0),
    0
  );
  const mealAllowanceTotal = trip.mealAllowances ? trip.mealAllowances.totalAmount : 0;
  const grandTotal = totalGross + mealAllowanceTotal;

  const startDate = trip.startDateTime || trip.startDate;
  const endDate = trip.endDateTime || trip.endDate;
  const formattedStart = startDate
    ? formatDateDE(startDate, 'dd.MM.yyyy HH:mm')
    : '';
  const formattedEnd = endDate
    ? formatDateDE(endDate, 'dd.MM.yyyy HH:mm')
    : '';

  const statusLabel = TRIP_STATUS_LABELS[trip.status] || trip.status;
  const statusColor = TRIP_STATUS_COLORS[trip.status] || theme.colors.textLight;

  const renderHeader = () => (
    <View>
      {/* Trip Info Card */}
      <Surface style={styles.infoCard} elevation={1}>
        <View style={styles.infoHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={styles.tripName}>
              {trip.name}
            </Text>
            {trip.destination ? (
              <View style={styles.infoRow}>
                <Icon source="map-marker-outline" size={16} color={theme.colors.textSecondary} />
                <Text variant="bodyMedium" style={styles.infoText}>
                  {trip.destination}
                </Text>
              </View>
            ) : null}
          </View>
          <Chip
            compact
            style={[styles.statusChip, { backgroundColor: statusColor + '18' }]}
            textStyle={[styles.statusText, { color: statusColor }]}
          >
            {statusLabel}
          </Chip>
        </View>

        {isEditable ? (
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => openEditModal(trip)}
            style={styles.editButton}
            textColor={theme.colors.primary}
            compact
          >
            Reisedaten bearbeiten
          </Button>
        ) : null}

        <Divider style={styles.divider} />

        {/* Zeitraum */}
        <View style={styles.timeSection}>
          <View style={styles.timeRow}>
            <Icon source="clock-start" size={18} color={theme.colors.primary} />
            <View style={styles.timeInfo}>
              <Text variant="bodySmall" style={styles.timeLabel}>Reisebeginn</Text>
              <Text variant="bodyMedium" style={styles.timeValue}>{formattedStart}</Text>
            </View>
          </View>
          <View style={styles.timeRow}>
            <Icon source="clock-end" size={18} color={theme.colors.primary} />
            <View style={styles.timeInfo}>
              <Text variant="bodySmall" style={styles.timeLabel}>Reiseende</Text>
              <Text variant="bodyMedium" style={styles.timeValue}>{formattedEnd}</Text>
            </View>
          </View>
          {trip.mealAllowances ? (
            <View style={styles.timeRow}>
              <Icon source="clock-outline" size={18} color={theme.colors.textSecondary} />
              <View style={styles.timeInfo}>
                <Text variant="bodySmall" style={styles.timeLabel}>Abwesenheit</Text>
                <Text variant="bodyMedium" style={styles.timeValue}>
                  {formatAbsenceDuration(trip.mealAllowances.totalHours)} ({trip.mealAllowances.calendarDays} Tage)
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </Surface>

      {/* Verpflegungspauschalen */}
      {trip.mealAllowances && trip.mealAllowances.breakdown.length > 0 ? (
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <Icon source="food-fork-drink" size={20} color={theme.colors.accent} />
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Verpflegungspauschalen
            </Text>
          </View>
          {trip.mealAllowances.breakdown.map((day, index) => (
            <View key={index} style={styles.allowanceRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={styles.allowanceDate}>
                  {formatDateDE(day.date, 'dd.MM.yyyy (EEEE)')}
                </Text>
                <Text variant="bodySmall" style={styles.allowanceType}>
                  {day.label}
                </Text>
              </View>
              <Text
                variant="bodyMedium"
                style={[
                  styles.allowanceAmount,
                  day.amount === 0 && styles.allowanceAmountZero,
                ]}
              >
                {formatCurrency(day.amount)}
              </Text>
            </View>
          ))}
          <Divider style={styles.divider} />
          <View style={styles.totalRow}>
            <Text variant="titleSmall" style={styles.totalLabel}>
              Summe Verpflegungspauschalen
            </Text>
            <Text variant="titleMedium" style={styles.totalValue}>
              {trip.mealAllowances.formattedTotal}
            </Text>
          </View>
        </Surface>
      ) : null}

      {/* Kostenübersicht */}
      <Surface style={styles.section} elevation={1}>
        <View style={styles.sectionHeader}>
          <Icon source="calculator" size={20} color={theme.colors.primary} />
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Kostenübersicht
          </Text>
        </View>

        <View style={styles.costRow}>
          <Text variant="bodyMedium" style={styles.costLabel}>Ausgaben (brutto)</Text>
          <Text variant="bodyMedium" style={styles.costValue}>{formatCurrency(totalGross)}</Text>
        </View>
        <View style={styles.costRow}>
          <Text variant="bodySmall" style={styles.costLabelSmall}>davon Netto</Text>
          <Text variant="bodySmall" style={styles.costValueSmall}>{formatCurrency(totalNet)}</Text>
        </View>
        <View style={styles.costRow}>
          <Text variant="bodySmall" style={styles.costLabelSmall}>davon USt</Text>
          <Text variant="bodySmall" style={styles.costValueSmall}>{formatCurrency(totalVat)}</Text>
        </View>
        <View style={styles.costRow}>
          <Text variant="bodyMedium" style={styles.costLabel}>Verpflegungspauschalen</Text>
          <Text variant="bodyMedium" style={styles.costValue}>{formatCurrency(mealAllowanceTotal)}</Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.totalRow}>
          <Text variant="titleSmall" style={styles.grandTotalLabel}>Gesamtbetrag</Text>
          <Text variant="titleLarge" style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
        </View>
      </Surface>

      {/* Action Buttons */}
      {trip.status === TRIP_STATUS.DRAFT && expenses.length > 0 ? (
        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            icon="check-circle"
            onPress={handleCompleteTrip}
            style={styles.submitButton}
            buttonColor="#2E7D32"
            textColor="#FFFFFF"
          >
            Reise abschließen
          </Button>
          <Button
            mode="outlined"
            icon="send"
            onPress={handleSubmitTrip}
            style={styles.submitButton}
            textColor={theme.colors.primary}
          >
            Zur Genehmigung einreichen
          </Button>
        </View>
      ) : null}
      {trip.status === TRIP_STATUS.COMPLETED && !trip.isArchived ? (
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            icon="lock-open-variant"
            onPress={handleReopenTrip}
            style={styles.submitButton}
            textColor={theme.colors.textSecondary}
          >
            Reise wieder öffnen
          </Button>
          <Button
            mode="outlined"
            icon="archive-arrow-down-outline"
            onPress={handleArchiveTrip}
            style={styles.submitButton}
            textColor={theme.colors.textSecondary}
          >
            Reise archivieren
          </Button>
        </View>
      ) : null}
      {trip.isArchived ? (
        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            icon="archive-arrow-up-outline"
            onPress={handleRestoreTrip}
            style={styles.submitButton}
            buttonColor={theme.colors.primary}
            textColor="#FFFFFF"
          >
            Aus Archiv wiederherstellen
          </Button>
        </View>
      ) : null}

      {/* Expenses Header */}
      <View style={styles.expensesHeader}>
        <Text variant="titleMedium" style={styles.expensesTitle}>
          Ausgaben
        </Text>
        <Text variant="bodySmall" style={styles.expensesCount}>
          {expenses.length} {expenses.length === 1 ? 'Position' : 'Positionen'}
        </Text>
      </View>
    </View>
  );

  const renderEmptyExpenses = () => (
    <View style={styles.emptyContainer}>
      <Icon source="receipt" size={48} color={theme.colors.textLight} />
      <Text variant="bodyMedium" style={styles.emptyText}>
        Noch keine Ausgaben erfasst.
      </Text>
      <Text variant="bodySmall" style={styles.emptyHint}>
        Tippen Sie auf "+", um eine Ausgabe hinzuzufügen.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpenseCard
            expense={item}
            onPress={() => handleEditExpense(item)}
            onLongPress={() => handleDeleteExpense(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyExpenses}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {(trip.status === TRIP_STATUS.DRAFT || trip.status === TRIP_STATUS.COMPLETED) ? (
        <FAB
          icon="plus"
          style={styles.fab}
          color="#FFFFFF"
          onPress={handleAddExpense}
        />
      ) : null}

      {/* Edit Trip Modal */}
      <Modal
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEditModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text variant="titleLarge" style={styles.modalTitle}>
                    Reisedaten bearbeiten
                  </Text>
                  <Text variant="bodySmall" style={styles.modalSubtitle}>
                    Ändern Sie die Eckdaten Ihrer Dienstreise
                  </Text>
                </View>

                <Divider style={styles.modalDivider} />

                <View style={styles.modalBody}>
                  <TextInput
                    mode="outlined"
                    label="Reisename *"
                    placeholder="z.B. Kundentermin München"
                    value={editName}
                    onChangeText={setEditName}
                    left={<TextInput.Icon icon="briefcase" />}
                    style={styles.modalInput}
                    outlineColor={theme.colors.border}
                    activeOutlineColor={theme.colors.primary}
                  />

                  <TextInput
                    mode="outlined"
                    label="Reiseziel"
                    placeholder="z.B. München"
                    value={editDestination}
                    onChangeText={setEditDestination}
                    left={<TextInput.Icon icon="map-marker" />}
                    style={styles.modalInput}
                    outlineColor={theme.colors.border}
                    activeOutlineColor={theme.colors.primary}
                  />

                  <TextInput
                    mode="outlined"
                    label="Firma"
                    placeholder="z.B. Musterfirma GmbH"
                    value={editCompany}
                    onChangeText={setEditCompany}
                    left={<TextInput.Icon icon="office-building" />}
                    style={styles.modalInput}
                    outlineColor={theme.colors.border}
                    activeOutlineColor={theme.colors.primary}
                  />

                  <TextInput
                    mode="outlined"
                    label="Ansprechpartner"
                    placeholder="z.B. Max Mustermann"
                    value={editContact}
                    onChangeText={setEditContact}
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
                      {formatDateDE(editStartDate, 'dd.MM.yyyy')}
                    </Button>
                    <Button
                      mode="outlined"
                      icon="clock-outline"
                      onPress={() => setShowStartTimePicker(true)}
                      style={styles.timeButton}
                      textColor={theme.colors.text}
                    >
                      {formatDateDE(editStartTime, 'HH:mm')}
                    </Button>
                  </View>
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={editStartDate}
                      mode="date"
                      display="default"
                      onChange={onEditStartDateChange}
                      locale="de-DE"
                    />
                  )}
                  {showStartTimePicker && (
                    <DateTimePicker
                      value={editStartTime}
                      mode="time"
                      display="default"
                      onChange={onEditStartTimeChange}
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
                      {formatDateDE(editEndDate, 'dd.MM.yyyy')}
                    </Button>
                    <Button
                      mode="outlined"
                      icon="clock-outline"
                      onPress={() => setShowEndTimePicker(true)}
                      style={styles.timeButton}
                      textColor={theme.colors.text}
                    >
                      {formatDateDE(editEndTime, 'HH:mm')}
                    </Button>
                  </View>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={editEndDate}
                      mode="date"
                      display="default"
                      onChange={onEditEndDateChange}
                      locale="de-DE"
                      minimumDate={editStartDate}
                    />
                  )}
                  {showEndTimePicker && (
                    <DateTimePicker
                      value={editEndTime}
                      mode="time"
                      display="default"
                      onChange={onEditEndTimeChange}
                      locale="de-DE"
                      is24Hour={true}
                    />
                  )}

                  {/* Absence duration and Verpflegungspauschale preview */}
                  {editAbsenceDurationText && (
                    <View style={styles.previewContainer}>
                      <Divider style={styles.previewDivider} />
                      <View style={styles.previewRow}>
                        <Icon source="clock-outline" size={18} color={theme.colors.textSecondary} />
                        <Text variant="bodySmall" style={styles.previewLabel}>
                          Abwesenheitsdauer
                        </Text>
                        <Text variant="bodyMedium" style={styles.previewValue}>
                          {editAbsenceDurationText}
                        </Text>
                      </View>
                      {editMealAllowancePreview && (
                        <View style={styles.previewRow}>
                          <Icon source="food-fork-drink" size={18} color={theme.colors.accent} />
                          <Text variant="bodySmall" style={styles.previewLabel}>
                            Verpflegungspauschale
                          </Text>
                          <Text variant="bodyMedium" style={styles.previewValueHighlight}>
                            {editMealAllowancePreview.formattedTotal}
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
                    onPress={() => setEditModalVisible(false)}
                    textColor={theme.colors.textSecondary}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSaveTrip}
                    loading={saving}
                    disabled={saving}
                    buttonColor={theme.colors.primary}
                    textColor="#FFFFFF"
                    icon="check"
                  >
                    Speichern
                  </Button>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      <Snackbar {...snackbar.snackbarProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  infoCard: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tripName: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    marginVertical: theme.spacing.sm + 4,
    backgroundColor: theme.colors.divider,
  },
  timeSection: {
    gap: theme.spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInfo: {
    marginLeft: theme.spacing.sm,
  },
  timeLabel: {
    color: theme.colors.textLight,
    fontSize: 11,
  },
  timeValue: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  section: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm + 4,
    padding: theme.spacing.md,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
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
  allowanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs + 2,
  },
  allowanceDate: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  allowanceType: {
    color: theme.colors.textLight,
    fontSize: 11,
  },
  allowanceAmount: {
    color: theme.colors.text,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
  allowanceAmountZero: {
    color: theme.colors.textLight,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  totalValue: {
    color: theme.colors.accent,
    fontWeight: '700',
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
  costLabelSmall: {
    color: theme.colors.textLight,
    paddingLeft: theme.spacing.md,
  },
  costValueSmall: {
    color: theme.colors.textLight,
  },
  grandTotalLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  grandTotalValue: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  actionButtons: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm + 4,
  },
  submitButton: {
    borderRadius: theme.roundness,
  },
  expensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  expensesTitle: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  expensesCount: {
    color: theme.colors.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptyHint: {
    color: theme.colors.textLight,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: theme.spacing.md,
    right: 0,
    bottom: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 28,
  },
  editButton: {
    marginTop: theme.spacing.sm,
    borderColor: theme.colors.primary,
    borderRadius: theme.roundness,
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

export default TripDetailScreen;
