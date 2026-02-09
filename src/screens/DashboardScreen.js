import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Icon, FAB, Divider, Surface } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import theme from '../theme';
import { loadExpenses, loadTrips } from '../utils/storage';
import { getCategoryById } from '../utils/categories';
import ExpenseCard from '../components/ExpenseCard';

const DashboardScreen = ({ navigation }) => {
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);

  const loadData = useCallback(async () => {
    const loadedExpenses = await loadExpenses();
    const loadedTrips = await loadTrips();
    setExpenses(loadedExpenses);
    setTrips(loadedTrips);

    // Find the most recent active trip (draft status)
    const activeTrip = loadedTrips.find((t) => t.status === 'entwurf');
    if (activeTrip) {
      const tripExpenses = loadedExpenses.filter(
        (e) => e.tripId === activeTrip.id
      );
      const totalAmount = tripExpenses.reduce(
        (sum, e) => sum + (parseFloat(e.amount) || 0),
        0
      );
      setCurrentTrip({
        ...activeTrip,
        totalAmount,
        expenseCount: tripExpenses.length,
      });
    } else {
      setCurrentTrip(null);
    }
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

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0
  );

  const formattedTotal = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(totalExpenses);

  const thisMonthExpenses = expenses.filter((e) => {
    if (!e.date) return false;
    const expDate = new Date(e.date);
    const now = new Date();
    return (
      expDate.getMonth() === now.getMonth() &&
      expDate.getFullYear() === now.getFullYear()
    );
  });

  const thisMonthTotal = thisMonthExpenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0
  );

  const formattedMonthTotal = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(thisMonthTotal);

  const currentMonthName = format(new Date(), 'MMMM yyyy', { locale: de });

  const recentExpenses = expenses.slice(0, 10);

  const renderHeader = () => (
    <View>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <Surface style={styles.summaryCard} elevation={2}>
          <Icon source="cash-multiple" size={28} color={theme.colors.primary} />
          <Text variant="titleLarge" style={styles.summaryAmount}>
            {formattedTotal}
          </Text>
          <Text variant="bodySmall" style={styles.summaryLabel}>
            Gesamtausgaben
          </Text>
        </Surface>

        <Surface style={styles.summaryCard} elevation={2}>
          <Icon source="calendar-month" size={28} color={theme.colors.accent} />
          <Text variant="titleLarge" style={styles.summaryAmount}>
            {formattedMonthTotal}
          </Text>
          <Text variant="bodySmall" style={styles.summaryLabel}>
            {currentMonthName}
          </Text>
        </Surface>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text variant="headlineSmall" style={styles.statNumber}>
            {expenses.length}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Ausgaben
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text variant="headlineSmall" style={styles.statNumber}>
            {trips.length}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Reisen
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text variant="headlineSmall" style={styles.statNumber}>
            {trips.filter((t) => t.status === 'entwurf').length}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            Offen
          </Text>
        </View>
      </View>

      {/* Current Trip Card */}
      {currentTrip ? (
        <Card style={styles.currentTripCard} mode="elevated">
          <Card.Content>
            <View style={styles.currentTripHeader}>
              <Icon
                source="briefcase-clock"
                size={20}
                color={theme.colors.primary}
              />
              <Text variant="titleSmall" style={styles.currentTripLabel}>
                Aktuelle Reise
              </Text>
            </View>
            <Text variant="titleMedium" style={styles.currentTripName}>
              {currentTrip.name}
            </Text>
            {currentTrip.destination ? (
              <Text variant="bodySmall" style={styles.currentTripDest}>
                {currentTrip.destination}
              </Text>
            ) : null}
            <Divider style={styles.currentTripDivider} />
            <View style={styles.currentTripFooter}>
              <Text variant="bodySmall" style={styles.currentTripExpenses}>
                {currentTrip.expenseCount}{' '}
                {currentTrip.expenseCount === 1 ? 'Ausgabe' : 'Ausgaben'}
              </Text>
              <Text variant="titleMedium" style={styles.currentTripTotal}>
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(currentTrip.totalAmount)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.noTripCard} mode="elevated">
          <Card.Content style={styles.noTripContent}>
            <Icon
              source="briefcase-plus-outline"
              size={36}
              color={theme.colors.textLight}
            />
            <Text variant="bodyMedium" style={styles.noTripText}>
              Keine aktive Reise vorhanden.
            </Text>
            <Text variant="bodySmall" style={styles.noTripHint}>
              Erstellen Sie eine neue Reise unter dem Tab "Reisen".
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Recent Expenses Header */}
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Letzte Ausgaben
        </Text>
        {expenses.length > 0 ? (
          <Text variant="bodySmall" style={styles.sectionCount}>
            {expenses.length} gesamt
          </Text>
        ) : null}
      </View>
    </View>
  );

  const renderEmptyExpenses = () => (
    <View style={styles.emptyContainer}>
      <Icon
        source="receipt"
        size={48}
        color={theme.colors.textLight}
      />
      <Text variant="bodyMedium" style={styles.emptyText}>
        Noch keine Ausgaben erfasst.
      </Text>
      <Text variant="bodySmall" style={styles.emptyHint}>
        Tippen Sie auf "+", um eine neue Ausgabe hinzuzufügen.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={recentExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpenseCard expense={item} onPress={() => {}} />
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
      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => navigation.navigate('NeueAusgabe')}
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
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm + 4,
  },
  summaryCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  summaryAmount: {
    color: theme.colors.text,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    paddingVertical: theme.spacing.md,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
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
  currentTripCard: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  currentTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  currentTripLabel: {
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
    fontWeight: '600',
  },
  currentTripName: {
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  currentTripDest: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  currentTripDivider: {
    marginVertical: theme.spacing.sm,
  },
  currentTripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentTripExpenses: {
    color: theme.colors.textLight,
  },
  currentTripTotal: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  noTripCard: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
  },
  noTripContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  noTripText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  noTripHint: {
    color: theme.colors.textLight,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  sectionCount: {
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
    bottom: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 28,
  },
});

export default DashboardScreen;
