/**
 * PDF Line Items Component - Apple/Linear Style
 *
 * Clean, minimal table with generous spacing and subtle borders.
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { useOrgDocument } from "../context";
import {
  colors,
  fontSize,
  spacing,
  lineHeight,
  FONT_FAMILY,
  FONT_WEIGHTS,
} from "./theme";
import { formatCurrencyForPdf } from "./theme";
import type { DocumentLineItem } from "../types";

// ============================================================================
// STYLES - Clean, Minimal
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },

  // Table Header - Clean, minimal
  headerRow: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  headerCell: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Table Body Rows - Clean with subtle divider
  row: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  rowLast: {
    borderBottomWidth: 0,
  },

  // Column widths
  colDescription: {
    flex: 4,
    paddingRight: spacing.md,
  },
  colQuantity: {
    flex: 0.8,
    textAlign: "center",
  },
  colPrice: {
    flex: 1.2,
    textAlign: "right",
  },
  colTotal: {
    flex: 1.2,
    textAlign: "right",
  },

  // Cell content styles
  description: {
    fontSize: fontSize.base,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    lineHeight: lineHeight.normal,
  },
  sku: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  notes: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    fontStyle: "italic",
    marginTop: spacing.xs,
    lineHeight: lineHeight.normal,
  },

  // Number cells
  quantity: {
    fontSize: fontSize.base,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    textAlign: "center",
  },
  price: {
    fontSize: fontSize.base,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    textAlign: "right",
  },
  total: {
    fontSize: fontSize.base,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    textAlign: "right",
  },

  // Empty state
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.muted,
    fontStyle: "italic",
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface LineItemsProps {
  lineItems: DocumentLineItem[];
  labels?: {
    description?: string;
    quantity?: string;
    price?: string;
    total?: string;
  };
  showSku?: boolean;
  showNotes?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LineItems({
  lineItems,
  labels = {},
  showSku = false,
  showNotes = false,
}: LineItemsProps) {
  const { locale, currency } = useOrgDocument();

  const {
    description: descLabel = "Description",
    quantity: qtyLabel = "Qty",
    price: priceLabel = "Price",
    total: totalLabel = "Total",
  } = labels;

  const hasSkus = showSku && lineItems.some((item) => item.sku);
  const hasNotes = showNotes && lineItems.some((item) => item.notes);

  if (lineItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={styles.colDescription}>
            <Text style={styles.headerCell}>{descLabel}</Text>
          </View>
          <View style={styles.colQuantity}>
            <Text style={styles.headerCell}>{qtyLabel}</Text>
          </View>
          <View style={styles.colPrice}>
            <Text style={styles.headerCell}>{priceLabel}</Text>
          </View>
          <View style={styles.colTotal}>
            <Text style={styles.headerCell}>{totalLabel}</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No items</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Table Header */}
      <View style={styles.headerRow}>
        <View style={styles.colDescription}>
          <Text style={styles.headerCell}>{descLabel}</Text>
        </View>
        <View style={styles.colQuantity}>
          <Text style={styles.headerCell}>{qtyLabel}</Text>
        </View>
        <View style={styles.colPrice}>
          <Text style={styles.headerCell}>{priceLabel}</Text>
        </View>
        <View style={styles.colTotal}>
          <Text style={styles.headerCell}>{totalLabel}</Text>
        </View>
      </View>

      {/* Data Rows */}
      {lineItems.map((item, index) => (
        <View
          key={item.id}
          wrap={true}
          style={[
            styles.row,
            index === lineItems.length - 1 ? styles.rowLast : {},
          ]}
        >
          <View style={styles.colDescription}>
            <Text style={styles.description}>{item.description}</Text>
            {hasSkus && item.sku && <Text style={styles.sku}>{item.sku}</Text>}
            {hasNotes && item.notes && <Text style={styles.notes}>{item.notes}</Text>}
          </View>

          <View style={styles.colQuantity}>
            <Text style={styles.quantity}>{item.quantity}</Text>
          </View>

          <View style={styles.colPrice}>
            <Text style={styles.price}>
              {formatCurrencyForPdf(item.unitPrice, currency, locale)}
            </Text>
          </View>

          <View style={styles.colTotal}>
            <Text style={styles.total}>
              {formatCurrencyForPdf(item.total, currency, locale)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
