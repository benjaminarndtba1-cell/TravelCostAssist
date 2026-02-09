import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Icon, Chip } from 'react-native-paper';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getCategoryById } from '../utils/categories';
import { getVatRateById } from '../utils/vatRates';
import theme from '../theme';

const ExpenseCard = ({ expense, onPress, onLongPress }) => {
  const category = getCategoryById(expense.category);

  const formattedDate = expense.date
    ? format(new Date(expense.date), 'dd. MMM yyyy', { locale: de })
    : '';

  const grossAmount = parseFloat(expense.grossAmount || expense.amount) || 0;
  const formattedAmount = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: expense.currency || 'EUR',
  }).format(grossAmount);

  const vatRate = expense.vatRateId ? getVatRateById(expense.vatRateId) : null;
  const receiptCount = expense.receiptUris
    ? expense.receiptUris.length
    : expense.receiptUri
    ? 1
    : 0;

  const isKilometer = expense.category === 'kilometer';

  return (
    <Card style={styles.card} onPress={onPress} onLongPress={onLongPress} mode="elevated">
      <Card.Content style={styles.content}>
        <View style={styles.leftSection}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: category.color + '15' },
            ]}
          >
            <Icon source={category.icon} size={24} color={category.color} />
          </View>
          <View style={styles.details}>
            <Text variant="titleSmall" style={styles.categoryLabel}>
              {category.label}
            </Text>
            {isKilometer && expense.distanceKm ? (
              <Text variant="bodySmall" style={styles.description} numberOfLines={1}>
                {expense.startAddress && expense.endAddress
                  ? `${expense.startAddress} → ${expense.endAddress}`
                  : `${expense.distanceKm} km`}
              </Text>
            ) : expense.description ? (
              <Text variant="bodySmall" style={styles.description} numberOfLines={1}>
                {expense.description}
              </Text>
            ) : null}
            <View style={styles.metaRow}>
              <Text variant="bodySmall" style={styles.date}>
                {formattedDate}
              </Text>
              {vatRate ? (
                <Text variant="bodySmall" style={styles.vatLabel}>
                  {vatRate.rate}% USt
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.rightSection}>
          <Text variant="titleMedium" style={styles.amount}>
            {formattedAmount}
          </Text>
          {isKilometer && expense.distanceKm ? (
            <Text variant="bodySmall" style={styles.kmInfo}>
              {expense.distanceKm} km
            </Text>
          ) : null}
          <View style={styles.chipRow}>
            {receiptCount > 0 ? (
              <Chip
                icon="camera"
                compact
                style={styles.receiptChip}
                textStyle={styles.receiptChipText}
              >
                {receiptCount > 1 ? `${receiptCount} Belege` : 'Beleg'}
              </Chip>
            ) : null}
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm + 4,
  },
  details: {
    flex: 1,
  },
  categoryLabel: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  description: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: theme.spacing.sm,
  },
  date: {
    color: theme.colors.textLight,
  },
  vatLabel: {
    color: theme.colors.textLight,
    fontSize: 10,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rightSection: {
    alignItems: 'flex-end',
    marginLeft: theme.spacing.sm,
  },
  amount: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  kmInfo: {
    color: theme.colors.textLight,
    fontSize: 11,
    marginTop: 1,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  receiptChip: {
    height: 24,
    backgroundColor: theme.colors.primaryLight + '20',
  },
  receiptChipText: {
    fontSize: 10,
    color: theme.colors.primary,
  },
});

export default ExpenseCard;
