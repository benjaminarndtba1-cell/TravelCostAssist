import { format } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Formatiert einen Betrag als Währung im deutschen Format.
 * @param {number} amount - Der Betrag
 * @param {string} currency - Währungscode (Standard: 'EUR')
 * @returns {string} Formatierter Betrag, z.B. "12,50 €"
 */
export const formatCurrency = (amount, currency = 'EUR') =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);

/**
 * Formatiert ein Datum im deutschen Format.
 * @param {Date|string} date - Das Datum
 * @param {string} formatStr - date-fns Format-String (Standard: 'dd.MM.yyyy')
 * @returns {string} Formatiertes Datum
 */
export const formatDateDE = (date, formatStr = 'dd.MM.yyyy') =>
  format(new Date(date), formatStr, { locale: de });
