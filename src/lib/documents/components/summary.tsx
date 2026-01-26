/**
 * PDF Summary Component
 *
 * Displays document totals: subtotal, discount, tax, and total.
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { useOrgDocument } from "../context";
import { colors, fontSize, spacing, FONT_FAMILY, FONT_WEIGHTS } from "./theme";
import { formatCurrencyForPdf } from "./theme";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    marginTop: spacing.lg,
  },
  summaryBox: {
    width: 250,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
  },
  value: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    textAlign: "right",
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
    marginVertical: spacing.xs,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    textAlign: "right",
  },
  discountValue: {
    color: colors.status.success,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    backgroundColor: colors.background.light,
    paddingHorizontal: spacing.sm,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface SummaryProps {
  /** Subtotal before discounts and tax */
  subtotal: number;
  /** Discount amount (positive number) */
  discountAmount?: number | null;
  /** Discount percentage (for display) */
  discountPercent?: number | null;
  /** Tax amount */
  taxAmount: number;
  /** Tax rate percentage (for display) */
  taxRate?: number | null;
  /** Shipping amount */
  shippingAmount?: number | null;
  /** Final total */
  total: number;
  /** Amount already paid */
  paidAmount?: number | null;
  /** Balance due */
  balanceDue?: number | null;
  /** Labels */
  labels?: {
    subtotal?: string;
    discount?: string;
    tax?: string;
    shipping?: string;
    total?: string;
    paid?: string;
    balanceDue?: string;
  };
  /** Show balance due section */
  showBalance?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Document summary with totals
 *
 * @example
 * <Summary
 *   subtotal={600}
 *   discountAmount={50}
 *   taxAmount={55}
 *   total={605}
 * />
 */
export function Summary({
  subtotal,
  discountAmount,
  discountPercent,
  taxAmount,
  taxRate,
  shippingAmount,
  total,
  paidAmount,
  balanceDue,
  labels = {},
  showBalance = false,
}: SummaryProps) {
  const { locale, currency } = useOrgDocument();

  const {
    subtotal: subtotalLabel = "Subtotal",
    discount: discountLabel = "Discount",
    tax: taxLabel = "GST",
    shipping: shippingLabel = "Shipping",
    total: totalLabel = "Total",
    paid: paidLabel = "Paid",
    balanceDue: balanceDueLabel = "Balance Due",
  } = labels;

  // Format tax label with rate
  const formattedTaxLabel = taxRate ? `${taxLabel} (${taxRate}%)` : taxLabel;

  // Format discount label with percentage
  const formattedDiscountLabel = discountPercent
    ? `${discountLabel} (${discountPercent}%)`
    : discountLabel;

  return (
    <View style={styles.container}>
      <View style={styles.summaryBox}>
        {/* Subtotal */}
        <View style={styles.row}>
          <Text style={styles.label}>{subtotalLabel}</Text>
          <Text style={styles.value}>
            {formatCurrencyForPdf(subtotal, currency, locale)}
          </Text>
        </View>

        {/* Discount (if any) */}
        {discountAmount != null && discountAmount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>{formattedDiscountLabel}</Text>
            <Text style={[styles.value, styles.discountValue]}>
              -{formatCurrencyForPdf(discountAmount, currency, locale)}
            </Text>
          </View>
        )}

        {/* Tax */}
        <View style={styles.row}>
          <Text style={styles.label}>{formattedTaxLabel}</Text>
          <Text style={styles.value}>
            {formatCurrencyForPdf(taxAmount, currency, locale)}
          </Text>
        </View>

        {/* Shipping (if any) */}
        {shippingAmount != null && shippingAmount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>{shippingLabel}</Text>
            <Text style={styles.value}>
              {formatCurrencyForPdf(shippingAmount, currency, locale)}
            </Text>
          </View>
        )}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{totalLabel}</Text>
          <Text style={styles.totalValue}>
            {formatCurrencyForPdf(total, currency, locale)}
          </Text>
        </View>

        {/* Balance section (for invoices) */}
        {showBalance && paidAmount != null && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>{paidLabel}</Text>
              <Text style={[styles.value, styles.discountValue]}>
                -{formatCurrencyForPdf(paidAmount, currency, locale)}
              </Text>
            </View>
            {balanceDue != null && balanceDue > 0 && (
              <View style={styles.balanceRow}>
                <Text style={styles.totalLabel}>{balanceDueLabel}</Text>
                <Text style={styles.totalValue}>
                  {formatCurrencyForPdf(balanceDue, currency, locale)}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
