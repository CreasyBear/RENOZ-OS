/**
 * Enhanced Job Data Parsing Utilities
 *
 * Robust date and amount parsing for job-related data.
 * Adapted from midday import utilities for international formats and validation.
 */

import * as chrono from 'chrono-node';
import { format } from 'date-fns';

// ============================================================================
// DATE PARSING
// ============================================================================

/**
 * Validates if a date is actually valid (handles month lengths and leap years).
 * Creates a Date object and verifies the components match what was requested.
 */
function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Enhanced date parsing for job scheduling with international format support.
 * Handles Australian, US, European, and ISO formats.
 *
 * Adapted from midday import utilities with job-specific enhancements.
 */
export function parseJobDate(dateString: string): Date | null {
  if (!dateString?.trim()) return null;

  const trimmed = dateString.trim();

  // Fast path: extract date directly from ISO-like formats (YYYY-MM-DD...)
  // This preserves the date in the source timezone instead of converting to UTC
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    // Validate the date is actually valid (handles month lengths and leap years)
    if (isValidDate(y, m, d)) {
      return new Date(y, m - 1, d);
    }
    // Invalid ISO-format date (e.g., Feb 30), return null
    return null;
  }

  // Australian formats (DD/MM/YYYY, DD-MM-YYYY)
  const auMatch = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (auMatch) {
    const [, day, month, year] = auMatch;
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    if (isValidDate(y, m, d)) {
      return new Date(y, m - 1, d);
    }
  }

  // US formats (MM/DD/YYYY, MM-DD-YYYY)
  const usMatch = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const m = Number(month);
    const d = Number(day);
    const y = Number(year);
    if (isValidDate(y, m, d)) {
      return new Date(y, m - 1, d);
    }
  }

  // Fallback: use chrono-node for other formats (Oct 1, 2025, etc.)
  const parsed = chrono.parseDate(trimmed);
  if (!parsed) return null;

  return parsed;
}

/**
 * Formats a date string into YYYY-MM-DD format for job scheduling.
 * Preserves timezone context and handles international formats.
 */
export function formatJobDate(dateString: string): string | undefined {
  if (!dateString?.trim()) return undefined;

  const trimmed = dateString.trim();

  // Fast path: extract date directly from ISO-like formats (YYYY-MM-DD...)
  // This preserves the date in the source timezone instead of converting to UTC
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    // Validate the date is actually valid (handles month lengths and leap years)
    if (isValidDate(y, m, d)) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // Invalid ISO-format date (e.g., Feb 30), return undefined
    return undefined;
  }

  // Try parsing with our enhanced parser
  const parsedDate = parseJobDate(trimmed);
  if (!parsedDate) return undefined;

  return format(parsedDate, 'yyyy-MM-dd');
}

/**
 * Parses job scheduling time strings into HH:MM format.
 */
export function parseJobTime(timeString: string): string | null {
  if (!timeString?.trim()) return null;

  const trimmed = timeString.trim().toLowerCase();

  // Handle various time formats
  const timePatterns = [
    // 9:00 AM, 9:00AM, 9AM
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i,
    // 09:00, 9:00
    /^(\d{1,2}):(\d{2})$/,
    // 0900, 900
    /^(\d{1,2})(\d{2})$/,
  ];

  for (const pattern of timePatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const period = match[3]?.toLowerCase();

      // Handle AM/PM
      if (period === 'pm' && hours !== 12) {
        hours += 12;
      } else if (period === 'am' && hours === 12) {
        hours = 0;
      }

      // Validate hours and minutes
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
  }

  return null;
}

// ============================================================================
// AMOUNT PARSING
// ============================================================================

/**
 * Enhanced amount parsing with international currency support.
 * Handles Australian, US, European number formats.
 *
 * Adapted from midday import utilities with job-specific enhancements.
 */
export function parseJobAmount(
  amount: string,
  options: {
    currency?: string;
    inverted?: boolean;
    defaultCurrency?: string;
  } = {}
): { value: number; currency: string } | null {
  if (!amount?.trim()) return null;

  let value: number;
  let detectedCurrency = options.defaultCurrency || 'AUD';

  // Remove currency symbols and extract currency codes
  const currencyPatterns = [
    { symbol: /\$/g, code: 'AUD' },
    { symbol: /€/g, code: 'EUR' },
    { symbol: /£/g, code: 'GBP' },
    { symbol: /usd/i, code: 'USD' },
    { symbol: /aud/i, code: 'AUD' },
    { symbol: /eur/i, code: 'EUR' },
    { symbol: /gbp/i, code: 'GBP' },
  ];

  let normalizedAmount = amount.trim();

  // Detect and remove currency indicators
  for (const { symbol, code } of currencyPatterns) {
    if (symbol.test(normalizedAmount)) {
      detectedCurrency = code;
      normalizedAmount = normalizedAmount.replace(symbol, '').trim();
      break;
    }
  }

  // Handle special minus sign (−) by replacing with standard minus (-)
  normalizedAmount = normalizedAmount.replace(/−/g, '-');

  // Handle European format (1.234,56) - comma as decimal separator
  if (normalizedAmount.includes(',')) {
    // Check if this looks like European format (comma as decimal)
    const euroMatch = normalizedAmount.match(/(\d+(?:\.\d{3})*),\d{2}$/);
    if (euroMatch) {
      // European format: remove thousands separators (.) and replace decimal comma with period
      value = +normalizedAmount.replace(/\./g, '').replace(',', '.');
    } else {
      // Could be US format with comma separators: remove commas and parse
      value = +normalizedAmount.replace(/,/g, '');
    }
  } else if (normalizedAmount.match(/\.\d{2}$/)) {
    // If it ends with .XX, it's likely a decimal; remove internal periods (thousands separators)
    value = +normalizedAmount.replace(/\.(?=\d{3})/g, '');
  } else {
    // If neither condition is met, convert the amount directly to a number
    value = +normalizedAmount;
  }

  // Check if parsing was successful
  if (isNaN(value)) return null;

  // Apply inversion if requested
  if (options.inverted) {
    value = value * -1;
  }

  return {
    value: Math.round(value * 100) / 100, // Round to 2 decimal places
    currency: options.currency || detectedCurrency,
  };
}

/**
 * Formats amount for display with proper currency symbols.
 */
export function formatJobAmount(
  value: number,
  currency: string = 'AUD',
  options: { showSymbol?: boolean } = {}
): string {
  const formatted = new Intl.NumberFormat('en-AU', {
    style: options.showSymbol ? 'currency' : 'decimal',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  return value < 0 ? `-${formatted}` : formatted;
}

// ============================================================================
// JOB NUMBER PARSING
// ============================================================================

/**
 * Parses and normalizes job numbers from various formats.
 */
export function parseJobNumber(jobNumberString: string): string | null {
  if (!jobNumberString?.trim()) return null;

  const trimmed = jobNumberString.trim();

  // Extract job number patterns
  const patterns = [
    /job[_-\s]*(\d+)/i, // JOB123, Job-123, job 123
    /^(\d{4,})$/, // 1234 (4+ digits)
    /^([A-Z]{2,}\d+)$/, // AB123, SOLAR001
    /^(\d{2,}[A-Z]\d*)$/, // 25A001, 2024Q1
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  // If no pattern matches but it's alphanumeric, use as-is
  if (/^[A-Z0-9]+$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates job scheduling data.
 */
export function validateJobSchedulingData(data: {
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedDuration?: number;
}): {
  isValid: boolean;
  errors: string[];
  normalizedData: {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
  };
} {
  const errors: string[] = [];
  const normalizedData: any = {};

  // Validate and normalize date
  if (data.scheduledDate) {
    const formattedDate = formatJobDate(data.scheduledDate);
    if (formattedDate) {
      normalizedData.scheduledDate = formattedDate;
    } else {
      errors.push('Invalid scheduled date format');
    }
  }

  // Validate and normalize time
  if (data.scheduledTime) {
    const formattedTime = parseJobTime(data.scheduledTime);
    if (formattedTime) {
      normalizedData.scheduledTime = formattedTime;
    } else {
      errors.push('Invalid scheduled time format');
    }
  }

  // Validate duration
  if (data.estimatedDuration !== undefined) {
    if (
      typeof data.estimatedDuration === 'number' &&
      data.estimatedDuration > 0 &&
      data.estimatedDuration <= 480
    ) {
      // Max 8 hours
      normalizedData.estimatedDuration = Math.round(data.estimatedDuration);
    } else {
      errors.push('Estimated duration must be between 1 and 480 minutes');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedData,
  };
}
