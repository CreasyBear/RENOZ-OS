/**
 * PDF Line Items Component
 *
 * Displays a table of line items with description, quantity, price, and total.
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { useOrgDocument } from "../context";
import { colors, fontSize, spacing, FONT_FAMILY, FONT_WEIGHTS } from "./theme";
import { formatCurrencyForPdf } from "./theme";
import type { DocumentLineItem } from "../types";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.dark,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
    alignItems: "flex-start",
  },
  rowAlt: {
    backgroundColor: colors.background.light,
  },
  // Column widths
  colDescription: {
    flex: 3,
    paddingRight: spacing.md,
  },
  colQuantity: {
    flex: 0.8,
  },
  colPrice: {
    flex: 1,
  },
  colTotal: {
    flex: 1,
    textAlign: "right",
  },
  // Text styles
  headerText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
  },
  cellText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  description: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
  },
  sku: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    marginTop: 2,
  },
  notes: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    fontStyle: "italic",
    marginTop: 2,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface LineItemsProps {
  /** Array of line items to display */
  lineItems: DocumentLineItem[];
  /** Column labels */
  labels?: {
    description?: string;
    quantity?: string;
    price?: string;
    total?: string;
  };
  /** Show SKU under description */
  showSku?: boolean;
  /** Show notes under description */
  showNotes?: boolean;
  /** Use alternating row colors */
  alternateRows?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Line items table for documents
 *
 * @example
 * <LineItems
 *   lineItems={order.lineItems}
 *   labels={{ description: "Description", quantity: "Qty", price: "Unit Price", total: "Amount" }}
 * />
 */
export function LineItems({
  lineItems,
  labels = {},
  showSku = false,
  showNotes = false,
  alternateRows = false,
}: LineItemsProps) {
  const { locale, currency } = useOrgDocument();

  const {
    description: descLabel = "Description",
    quantity: qtyLabel = "Qty",
    price: priceLabel = "Unit Price",
    total: totalLabel = "Amount",
  } = labels;

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.colDescription}>
          <Text style={styles.headerText}>{descLabel}</Text>
        </View>
        <View style={styles.colQuantity}>
          <Text style={styles.headerText}>{qtyLabel}</Text>
        </View>
        <View style={styles.colPrice}>
          <Text style={styles.headerText}>{priceLabel}</Text>
        </View>
        <View style={styles.colTotal}>
          <Text style={[styles.headerText, { textAlign: "right" }]}>
            {totalLabel}
          </Text>
        </View>
      </View>

      {/* Data Rows */}
      {lineItems.map((item, index) => (
        <View
          key={item.id}
          wrap={false}
          style={
            alternateRows && index % 2 === 1
              ? [styles.row, styles.rowAlt]
              : styles.row
          }
        >
          <View style={styles.colDescription}>
            <Text style={styles.description}>{item.description}</Text>
            {showSku && item.sku && (
              <Text style={styles.sku}>SKU: {item.sku}</Text>
            )}
            {showNotes && item.notes && (
              <Text style={styles.notes}>{item.notes}</Text>
            )}
          </View>
          <View style={styles.colQuantity}>
            <Text style={styles.cellText}>{item.quantity}</Text>
          </View>
          <View style={styles.colPrice}>
            <Text style={styles.cellText}>
              {formatCurrencyForPdf(item.unitPrice, currency, locale)}
            </Text>
          </View>
          <View style={styles.colTotal}>
            <Text style={[styles.cellText, { textAlign: "right" }]}>
              {formatCurrencyForPdf(item.total, currency, locale)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
