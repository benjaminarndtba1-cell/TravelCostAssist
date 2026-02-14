// Deutsche Verpflegungspauschalen (Stand 2024/2025)
// § 9 Abs. 4a EStG - Inland

import { formatCurrency } from './formatting';

export const INLAND_RATES = {
  FULL_DAY: 28,       // Ab 24 Stunden Abwesenheit
  PARTIAL_DAY: 14,    // Mehr als 8 Stunden Abwesenheit
  ARRIVAL_DAY: 14,    // An- und Abreisetag bei mehrtägiger Reise
  DEPARTURE_DAY: 14,  // An- und Abreisetag bei mehrtägiger Reise
};

// Berechnet die Abwesenheitsdauer in Stunden
export const calculateAbsenceHours = (startDateTime, endDateTime) => {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  const diffMs = end - start;
  return diffMs / (1000 * 60 * 60);
};

// Berechnet die Anzahl der Kalendertage
const getCalendarDays = (startDateTime, endDateTime) => {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  // Auf Tagesbeginn normalisieren
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const diffMs = endDay - startDay;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

// Berechnet die Verpflegungspauschalen für eine Reise
export const calculateMealAllowances = (startDateTime, endDateTime) => {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  const totalHours = calculateAbsenceHours(startDateTime, endDateTime);
  const calendarDays = getCalendarDays(startDateTime, endDateTime);

  const breakdown = [];

  if (calendarDays <= 1) {
    // Eintägige Reise
    if (totalHours >= 24) {
      breakdown.push({
        date: start.toISOString(),
        type: 'ganztags',
        label: 'Ganzer Tag (24h+)',
        amount: INLAND_RATES.FULL_DAY,
      });
    } else if (totalHours > 8) {
      breakdown.push({
        date: start.toISOString(),
        type: 'teiltags',
        label: 'Mehr als 8 Stunden',
        amount: INLAND_RATES.PARTIAL_DAY,
      });
    } else {
      breakdown.push({
        date: start.toISOString(),
        type: 'keine',
        label: 'Unter 8 Stunden',
        amount: 0,
      });
    }
  } else {
    // Mehrtägige Reise
    for (let dayIndex = 0; dayIndex < calendarDays; dayIndex++) {
      const currentDay = new Date(start);
      currentDay.setDate(currentDay.getDate() + dayIndex);
      const dayDate = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate());

      if (dayIndex === 0) {
        // Anreisetag
        breakdown.push({
          date: dayDate.toISOString(),
          type: 'anreisetag',
          label: 'Anreisetag',
          amount: INLAND_RATES.ARRIVAL_DAY,
        });
      } else if (dayIndex === calendarDays - 1) {
        // Abreisetag
        breakdown.push({
          date: dayDate.toISOString(),
          type: 'abreisetag',
          label: 'Abreisetag',
          amount: INLAND_RATES.DEPARTURE_DAY,
        });
      } else {
        // Zwischentag (voller Tag)
        breakdown.push({
          date: dayDate.toISOString(),
          type: 'ganztags',
          label: 'Ganzer Tag',
          amount: INLAND_RATES.FULL_DAY,
        });
      }
    }
  }

  const totalAmount = breakdown.reduce((sum, day) => sum + day.amount, 0);

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    calendarDays,
    breakdown,
    totalAmount,
    formattedTotal: formatCurrency(totalAmount),
  };
};

// Formatiert die Abwesenheitsdauer
export const formatAbsenceDuration = (hours) => {
  const fullHours = Math.floor(hours);
  const minutes = Math.round((hours - fullHours) * 60);
  if (fullHours === 0) return `${minutes} Min.`;
  if (minutes === 0) return `${fullHours} Std.`;
  return `${fullHours} Std. ${minutes} Min.`;
};

export default {
  INLAND_RATES,
  calculateAbsenceHours,
  calculateMealAllowances,
  formatAbsenceDuration,
};
