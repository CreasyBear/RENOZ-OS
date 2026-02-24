/**
 * Minimal fixed header (org + doc #) on all pages
 *
 * Slim 9pt single line. Renders on every page via React-PDF `fixed` prop.
 * @see docs/DOCUMENT_DESIGN_SYSTEM.md
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { FONT_FAMILY, FONT_WEIGHTS } from "../fonts";
import {
  DOCUMENT_PAGE_MARGINS,
  DOCUMENT_FONT_SIZE,
  DOCUMENT_BORDER_COLOR,
} from "./document-constants";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  fixedHeader: {
    position: "absolute" as const,
    top: DOCUMENT_PAGE_MARGINS.top,
    left: DOCUMENT_PAGE_MARGINS.left,
    right: DOCUMENT_PAGE_MARGINS.right,
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: DOCUMENT_BORDER_COLOR,
  },
  orgName: {
    fontSize: DOCUMENT_FONT_SIZE,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: DOCUMENT_BORDER_COLOR,
  },
  docInfo: {
    fontSize: DOCUMENT_FONT_SIZE,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: DOCUMENT_BORDER_COLOR,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentFixedHeaderProps {
  /** Organization name */
  orgName: string;
  /** Document type (e.g. "Invoice", "Quote") */
  documentType: string;
  /** Document number (e.g. "INV-001") */
  documentNumber: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DocumentFixedHeader({
  orgName,
  documentType,
  documentNumber,
}: DocumentFixedHeaderProps) {
  return (
    <View fixed style={styles.fixedHeader}>
      <Text style={styles.orgName}>{orgName}</Text>
      <Text style={styles.docInfo}>
        {documentType} {documentNumber}
      </Text>
    </View>
  );
}
