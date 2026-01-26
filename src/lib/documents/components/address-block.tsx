/**
 * PDF Address Block Component
 *
 * Displays formatted address information for "From" and "To" sections.
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSize, spacing, FONT_FAMILY, FONT_WEIGHTS } from "./theme";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSize.base,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  line: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    lineHeight: 1.4,
  },
  contactInfo: {
    marginTop: spacing.xs,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface AddressData {
  name?: string | null;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
}

export interface AddressBlockProps {
  /** Label for the address block (e.g., "From", "Bill To") */
  label: string;
  /** Address data to display */
  address: AddressData;
  /** Whether to show contact info (email, phone) */
  showContact?: boolean;
  /** Whether to show tax ID */
  showTaxId?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Formatted address block for documents
 *
 * @example
 * <AddressBlock
 *   label="From"
 *   address={{
 *     name: "Renoz Pty Ltd",
 *     street1: "123 Main St",
 *     city: "Sydney",
 *     state: "NSW",
 *     postalCode: "2000",
 *   }}
 * />
 */
export function AddressBlock({
  label,
  address,
  showContact = false,
  showTaxId = false,
}: AddressBlockProps) {
  const cityLine = [address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(" ");

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {address.name && <Text style={styles.name}>{address.name}</Text>}

      {address.street1 && <Text style={styles.line}>{address.street1}</Text>}

      {address.street2 && <Text style={styles.line}>{address.street2}</Text>}

      {cityLine && <Text style={styles.line}>{cityLine}</Text>}

      {address.country && <Text style={styles.line}>{address.country}</Text>}

      {showContact && (address.email || address.phone) && (
        <View style={styles.contactInfo}>
          {address.email && <Text style={styles.line}>{address.email}</Text>}
          {address.phone && <Text style={styles.line}>{address.phone}</Text>}
        </View>
      )}

      {showTaxId && address.taxId && (
        <Text style={[styles.line, { marginTop: spacing.xs }]}>
          ABN: {address.taxId}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// TWO-COLUMN LAYOUT
// ============================================================================

const twoColumnStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginTop: spacing.lg,
  },
  column: {
    flex: 1,
  },
  leftColumn: {
    marginRight: spacing.md,
  },
  rightColumn: {
    marginLeft: spacing.md,
  },
});

export interface AddressColumnsProps {
  /** From address (organization) */
  from: AddressData;
  /** To address (customer) */
  to: AddressData;
  /** Labels */
  labels?: {
    from?: string;
    to?: string;
  };
}

/**
 * Two-column address layout for documents
 *
 * @example
 * <AddressColumns
 *   from={{ name: "Renoz", ... }}
 *   to={{ name: "Customer", ... }}
 * />
 */
export function AddressColumns({
  from,
  to,
  labels = {},
}: AddressColumnsProps) {
  const { from: fromLabel = "From", to: toLabel = "Bill To" } = labels;

  return (
    <View style={twoColumnStyles.container}>
      <View style={[twoColumnStyles.column, twoColumnStyles.leftColumn]}>
        <AddressBlock label={fromLabel} address={from} showTaxId />
      </View>
      <View style={[twoColumnStyles.column, twoColumnStyles.rightColumn]}>
        <AddressBlock label={toLabel} address={to} showContact />
      </View>
    </View>
  );
}
