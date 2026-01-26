/**
 * Organization-Aware Formatting Hook
 *
 * Provides formatting functions that respect organization locale settings.
 * Use this in React Email templates to automatically format dates, currency,
 * and numbers according to the organization's configured preferences.
 *
 * @see EMAIL-TPL-014
 * @see src/lib/email/context.tsx for OrgEmailSettings
 */

import { useOrgEmail } from "../context";
import {
  formatCurrency as baseCurrency,
  formatDate as baseDate,
  formatPercent,
  type FormatCurrencyOptions,
  type FormatDateOptions,
} from "../format";

/**
 * Hook that returns formatting functions pre-configured with org settings.
 *
 * @example
 * function InvoiceEmail({ total, dueDate }) {
 *   const { currency, date, number } = useOrgFormat();
 *   return (
 *     <Text>
 *       Total: {currency(total)}
 *       Due: {date(dueDate)}
 *     </Text>
 *   );
 * }
 */
export function useOrgFormat() {
  const { settings } = useOrgEmail();

  const locale = settings.locale ?? "en-US";
  const currencyCode = settings.currency ?? "USD";

  return {
    /**
     * Format currency with org's currency and locale settings.
     *
     * @example
     * currency(299.99)  // "$299.99" (or "A$299.99" for AUD/en-AU)
     */
    currency: (
      amount: number | null | undefined,
      options: Omit<FormatCurrencyOptions, "currency" | "locale"> = {}
    ) =>
      baseCurrency(amount, {
        ...options,
        currency: currencyCode,
        locale,
      }),

    /**
     * Format date with org's locale settings.
     *
     * @example
     * date(new Date())           // "Jan 25, 2025" or "25 Jan 2025"
     * date(new Date(), { style: 'long' })  // "January 25, 2025"
     */
    date: (
      value: Date | string | null | undefined,
      options: Omit<FormatDateOptions, "locale"> = {}
    ) =>
      baseDate(value, {
        ...options,
        locale,
      }),

    /**
     * Format number with org's locale settings.
     *
     * @example
     * number(1234567)  // "1,234,567" or "1.234.567"
     */
    number: (value: number | null | undefined, placeholder = "0") => {
      if (value == null || isNaN(value)) return placeholder;
      return new Intl.NumberFormat(locale).format(value);
    },

    /**
     * Format percentage (not locale-dependent, but included for consistency).
     *
     * @example
     * percent(75.6)  // "76%"
     */
    percent: formatPercent,

    /**
     * Raw settings for custom formatting needs.
     */
    settings: {
      locale,
      currency: currencyCode,
      timezone: settings.timezone ?? "UTC",
      dateFormat: settings.dateFormat ?? "MMM D, YYYY",
      timeFormat: settings.timeFormat ?? "12h",
    },
  };
}
