import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, Icon } from 'react-native-paper';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../utils/categories';
import theme from '../theme';

const TripCard = ({ trip, onPress, onLongPress }) => {
  const statusLabel = TRIP_STATUS_LABELS[trip.status] || trip.status;
  const statusColor = TRIP_STATUS_COLORS[trip.status] || theme.colors.textLight;

  const startDate = trip.startDateTime || trip.startDate;
  const endDate = trip.endDateTime || trip.endDate;

  const formattedStartDate = startDate
    ? format(new Date(startDate), 'dd.MM.yyyy HH:mm', { locale: de })
    : '';
  const formattedEndDate = endDate
    ? format(new Date(endDate), 'dd.MM.yyyy HH:mm', { locale: de })
    : '';

  const dateRange =
    formattedStartDate && formattedEndDate
      ? `${formattedStartDate} – ${formattedEndDate}`
      : formattedStartDate || 'Kein Datum';

  const formattedTotal = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: trip.currency || 'EUR',
  }).format(trip.totalAmount || 0);

  const expenseCount = trip.expenseCount || 0;
  const mealAllowanceTotal = trip.mealAllowancesTotal || (trip.mealAllowances ? trip.mealAllowances.totalAmount : 0);

  const formattedMealAllowance = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(mealAllowanceTotal);

  return (
    <Card style={styles.card} onPress={onPress} onLongPress={onLongPress} mode="elevated">
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Icon source="briefcase-outline" size={20} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
              {trip.name || 'Unbenannte Reise'}
            </Text>
          </View>
          <Chip
            compact
            style={[styles.statusChip, { backgroundColor: statusColor + '18' }]}
            textStyle={[styles.statusText, { color: statusColor }]}
          >
            {statusLabel}
          </Chip>
        </View>

        {trip.destination ? (
          <View style={styles.infoRow}>
            <Icon source="map-marker-outline" size={16} color={theme.colors.textSecondary} />
            <Text variant="bodySmall" style={styles.infoText}>
              {trip.destination}
            </Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Icon source="calendar-range" size={16} color={theme.colors.textSecondary} />
          <Text variant="bodySmall" style={styles.infoText}>
            {dateRange}
          </Text>
        </View>

        {mealAllowanceTotal > 0 ? (
          <View style={styles.infoRow}>
            <Icon source="food-fork-drink" size={16} color={theme.colors.accent} />
            <Text variant="bodySmall" style={styles.infoTextAccent}>
              Verpflegungspauschale: {formattedMealAllowance}
            </Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.expenseCount}>
            {expenseCount} {expenseCount === 1 ? 'Ausgabe' : 'Ausgaben'}
          </Text>
          <Text variant="titleMedium" style={styles.totalAmount}>
            {formattedTotal}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs + 2,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    elevation: 2,
  },
  content: {
    paddingVertical: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs + 2,
  },
  infoTextAccent: {
    color: theme.colors.accent,
    marginLeft: theme.spacing.xs + 2,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  expenseCount: {
    color: theme.colors.textLight,
  },
  totalAmount: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});

export default TripCard;
