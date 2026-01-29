/**
 * PDF Summary Component - Apple/Linear Style
 *
 * Clean financial summary with rounded card-style total section.
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { useOrgDocument } from "../context";
import {
  colors,
  fontSize,
  spacing,
  borderRadius,
  FONT_FAMILY,
  FONT_WEIGHTS,
} from "./theme";
import { formatCurrencyForPdf } from "./theme";

// ============================================================================
// STYLES - Clean, Rounded
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    marginTop: spacing.xl,
  },

  // Summary box - Rounded card
  summaryBox: {
    width: 280,
  },

  // Standard row
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },

  // Label styles
  label: {
    fontSize: fontSize.base,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
  },

  // Value styles
  value: {
    fontSize: fontSize.base,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    textAlign: "right",
  },

  // Discount (green)
  discountValue: {
    fontSize: fontSize.base,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.status.success,
    textAlign: "right",
  },

  // Divider before total
  divider: {
    height: 0.5,
    backgroundColor: colors.border.light,
    marginVertical: spacing.sm,
  },

  // Total row - Rounded card style
  totalCard: {
    backgroundColor: colors.background.subtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.primary,
    textAlign: "right",
  },

  // Balance due - Highlighted with border for B&W printing
  balanceCard: {
    backgroundColor: colors.primary[900],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary[900],
  },
  balanceLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.inverse,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  balanceValue: {
    fontSize: fontSize["2xl"],
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.text.inverse,
    textAlign: "right",
  },

  // Paid in full - Green card
  paidCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: "center",
  },
  paidText: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: "#2E7D32",
  },

  // Tax note
  taxNote: {
    marginTop: spacing.sm,
    textAlign: "right",
  },
  taxNoteText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface SummaryProps {
  subtotal: number;
  discountAmount?: number | null;
  discountPercent?: number | null;
  taxAmount: number;
  taxRate?: number | null;
  taxRegistrationNumber?: string | null;
  shippingAmount?: number | null;
  total: number;
  paidAmount?: number | null;
  balanceDue?: number | null;
  labels?: {
    subtotal?: string;
    discount?: string;
    tax?: string;
    shipping?: string;
    total?: string;
    paid?: string;
    balanceDue?: string;
    paidInFull?: string;
  };
  showBalance?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Summary({
  subtotal,
  discountAmount,
  discountPercent,
  taxAmount,
  taxRate,
  taxRegistrationNumber,
  shippingAmount,
  total,
  paidAmount,
  balanceDue,
  labels = {},
  showBalance = false,
}: SummaryProps) {
  const { locale, currency, organization } = useOrgDocument();

  const {
    subtotal: subtotalLabel = "Subtotal",
    discount: discountLabel = "Discount",
    tax: taxLabel = "Tax",
    shipping: shippingLabel = "Shipping",
    total: totalLabel = "Total",
    paid: paidLabel = "Paid",
    balanceDue: balanceDueLabel = "Balance Due",
    paidInFull: paidInFullLabel = "Paid in Full",
  } = labels;

  const formattedTaxLabel = taxRate ? `${taxLabel} (${taxRate}%)` : taxLabel;
  const formattedDiscountLabel = discountPercent
    ? `${discountLabel} (${discountPercent}%)`
    : discountLabel;

  const hasPaidAmount = paidAmount != null && paidAmount > 0;
  const hasBalanceDue = balanceDue != null && balanceDue > 0.01;
  const isPaidInFull = hasPaidAmount && !hasBalanceDue;

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

        {/* Discount */}
        {discountAmount != null && discountAmount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>{formattedDiscountLabel}</Text>
            <Text style={styles.discountValue}>
              −{formatCurrencyForPdf(discountAmount, currency, locale)}
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

        {/* Shipping */}
        {shippingAmount != null && shippingAmount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>{shippingLabel}</Text>
            <Text style={styles.value}>
              {formatCurrencyForPdf(shippingAmount, currency, locale)}
            </Text>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Total - Rounded card */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{totalLabel}</Text>
            <Text style={styles.totalValue}>
              {formatCurrencyForPdf(total, currency, locale)}
            </Text>
          </View>
        </View>

        {/* Balance Section */}
        {showBalance && (hasPaidAmount || hasBalanceDue || isPaidInFull) && (
          <>
            {/* Paid Amount */}
            {hasPaidAmount && (
              <View style={[styles.row, { marginTop: spacing.sm }]}>
                <Text style={styles.label}>{paidLabel}</Text>
                <Text style={styles.discountValue}>
                  −{formatCurrencyForPdf(paidAmount, currency, locale)}
                </Text>
              </View>
            )}

            {/* Balance Due */}
            {hasBalanceDue ? (
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>{balanceDueLabel}</Text>
                <Text style={styles.balanceValue}>
                  {formatCurrencyForPdf(balanceDue, currency, locale)}
                </Text>
              </View>
            ) : isPaidInFull ? (
              <View style={styles.paidCard}>
                <Text style={styles.paidText}>{paidInFullLabel}</Text>
              </View>
            ) : null}
          </>
        )}

        {/* Tax Registration */}
        {(taxRegistrationNumber || organization.taxId) && (
          <View style={styles.taxNote}>
            <Text style={styles.taxNoteText}>
              {taxRegistrationNumber || organization.taxId}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
