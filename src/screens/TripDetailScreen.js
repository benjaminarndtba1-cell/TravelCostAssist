import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Surface,
  Icon,
  Chip,
  Button,
  Divider,
  FAB,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import theme from '../theme';
import { loadTrips, loadExpenses, deleteExpense, updateTrip } from '../utils/storage';
import { TRIP_STATUS, TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../utils/categories';
import { getVatRateById } from '../utils/vatRates';
import { formatAbsenceDuration } from '../utils/verpflegungspauschalen';
import ExpenseCard from '../components/ExpenseCard';

const TripDetailScreen = ({ route, navigation }) => {
  const { tripId } = route.params;
  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const isCompleted = trip?.status === TRIP_STATUS.COMPLETED;

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

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  const startDate = trip.startDateTime || trip.startDate;
  const endDate = trip.endDateTime || trip.endDate;
  const formattedStart = startDate
    ? format(new Date(startDate), 'dd.MM.yyyy HH:mm', { locale: de })
    : '';
  const formattedEnd = endDate
    ? format(new Date(endDate), 'dd.MM.yyyy HH:mm', { locale: de })
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
                  {format(new Date(day.date), 'dd.MM.yyyy (EEEE)', { locale: de })}
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
      {trip.status === TRIP_STATUS.COMPLETED ? (
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
});

export default TripDetailScreen;
