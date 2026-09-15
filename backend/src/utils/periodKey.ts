import type { RecurrenceType } from '../models/ServiceType';

/**
 * Generates the periodKey string for a given recurrence type and date.
 *
 * monthly    → "2026-09"
 * quarterly  → "2026-Q3"
 * annually   → "2026"
 * one_time   → "one_time"  (static — only one engagement per client+service allowed)
 */
export function buildPeriodKey(recurrenceType: RecurrenceType, date: Date): string {
  switch (recurrenceType) {
    case 'one_time':
      return 'one_time';
    case 'monthly': {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }
    case 'quarterly': {
      const y = date.getFullYear();
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return `${y}-Q${q}`;
    }
    case 'annually':
      return String(date.getFullYear());
  }
}

/**
 * Advances a periodKey by one period and returns the next key.
 * Used by the rollover endpoint.
 */
export function nextPeriodKey(recurrenceType: RecurrenceType, current: string): string {
  switch (recurrenceType) {
    case 'one_time':
      throw new Error('one_time engagements cannot be rolled over');

    case 'monthly': {
      // "2026-09" → "2026-10", "2026-12" → "2027-01"
      const [y, m] = current.split('-').map(Number);
      const date = new Date(y, m); // m is already 1-based so new Date(y, m) = next month
      return buildPeriodKey('monthly', date);
    }

    case 'quarterly': {
      // "2026-Q3" → "2026-Q4", "2026-Q4" → "2027-Q1"
      const [yearStr, qStr] = current.split('-Q');
      let year = Number(yearStr);
      let q = Number(qStr) + 1;
      if (q > 4) { q = 1; year += 1; }
      return `${year}-Q${q}`;
    }

    case 'annually':
      return String(Number(current) + 1);
  }
}

/**
 * Returns the first day of the period as a Date (used as startDate on rollover).
 */
export function periodStartDate(recurrenceType: RecurrenceType, key: string): Date {
  switch (recurrenceType) {
    case 'one_time':
      return new Date();
    case 'monthly': {
      const [y, m] = key.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    case 'quarterly': {
      const [yearStr, qStr] = key.split('-Q');
      const firstMonth = (Number(qStr) - 1) * 3;
      return new Date(Number(yearStr), firstMonth, 1);
    }
    case 'annually':
      return new Date(Number(key), 0, 1);
  }
}
