/**
 * PDF Signature Line Component
 *
 * Displays a signature line for delivery acknowledgment and work order sign-off.
 * Used in operational documents like delivery notes and work orders.
 */

import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { colors, fontSize, spacing, FONT_FAMILY, FONT_WEIGHTS } from "./theme";
import { formatDateForPdf } from "./theme";
import { useOrgDocument } from "../context";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: spacing["2xl"],
  },
  row: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  signatureBlock: {
    flex: 1,
    marginRight: spacing.lg,
  },
  lastSignatureBlock: {
    flex: 1,
    marginRight: 0,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.medium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
    minHeight: 30,
    marginBottom: spacing.xs,
  },
  subLabel: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.muted,
    textAlign: "center",
  },
  dateTimeRow: {
    flexDirection: "row",
    marginTop: spacing.md,
  },
  dateBlock: {
    flex: 1,
    marginRight: spacing.md,
  },
  timeBlock: {
    flex: 1,
  },
  prefilledDate: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.primary,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
    marginBottom: spacing.xs,
  },
  acknowledgmentText: {
    fontSize: fontSize.xs,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.regular,
    color: colors.text.secondary,
    fontStyle: "italic",
    marginBottom: spacing.md,
    lineHeight: 1.5,
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border.light,
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY,
    fontWeight: FONT_WEIGHTS.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface SignatureLineProps {
  /** Label for the signature field */
  label?: string;
  /** Sublabel below the signature line */
  subLabel?: string;
  /** Include date field */
  showDate?: boolean;
  /** Include time field */
  showTime?: boolean;
  /** Pre-filled date (null for blank line) */
  prefilledDate?: Date | null;
  /** Include printed name field */
  showPrintedName?: boolean;
}

export interface DeliveryAcknowledgmentProps {
  /** Recipient name (pre-filled) */
  recipientName?: string | null;
  /** Date of delivery (pre-filled) */
  deliveryDate?: Date | null;
  /** Acknowledgment text */
  acknowledgmentText?: string;
  /** Labels for customization */
  labels?: {
    title?: string;
    signature?: string;
    printedName?: string;
    date?: string;
    time?: string;
  };
}

export interface WorkOrderSignOffProps {
  /** Technician name (pre-filled) */
  technicianName?: string | null;
  /** Completion date (pre-filled) */
  completionDate?: Date | null;
  /** Show customer acknowledgment section */
  showCustomerSignature?: boolean;
  /** Labels for customization */
  labels?: {
    technicianSection?: string;
    technicianSignature?: string;
    customerSection?: string;
    customerSignature?: string;
    date?: string;
    time?: string;
  };
}

// ============================================================================
// SIGNATURE LINE COMPONENT
// ============================================================================

/**
 * Single signature line with optional date and printed name
 */
export function SignatureLine({
  label = "Signature",
  subLabel = "Signature",
  showDate = true,
  showTime = false,
  prefilledDate,
  showPrintedName = true,
}: SignatureLineProps) {
  const { locale } = useOrgDocument();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.row}>
        {/* Signature Field */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={styles.subLabel}>{subLabel}</Text>
        </View>

        {/* Printed Name Field */}
        {showPrintedName && (
          <View style={styles.lastSignatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.subLabel}>Printed Name</Text>
          </View>
        )}
      </View>

      {/* Date and Time Row */}
      {(showDate || showTime) && (
        <View style={styles.dateTimeRow}>
          {showDate && (
            <View style={styles.dateBlock}>
              {prefilledDate ? (
                <>
                  <Text style={styles.prefilledDate}>
                    {formatDateForPdf(prefilledDate, locale)}
                  </Text>
                  <Text style={styles.subLabel}>Date</Text>
                </>
              ) : (
                <>
                  <View style={styles.signatureLine} />
                  <Text style={styles.subLabel}>Date</Text>
                </>
              )}
            </View>
          )}
          {showTime && (
            <View style={styles.timeBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.subLabel}>Time</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// DELIVERY ACKNOWLEDGMENT COMPONENT
// ============================================================================

const DEFAULT_ACKNOWLEDGMENT_TEXT =
  "I acknowledge receipt of the goods listed above in good condition. Any discrepancies or damages should be noted above.";

/**
 * Delivery acknowledgment signature block for delivery notes
 *
 * @example
 * <DeliveryAcknowledgment
 *   recipientName="John Smith"
 *   deliveryDate={new Date()}
 *   acknowledgmentText="Custom acknowledgment text..."
 * />
 */
export function DeliveryAcknowledgment({
  recipientName,
  deliveryDate,
  acknowledgmentText = DEFAULT_ACKNOWLEDGMENT_TEXT,
  labels = {},
}: DeliveryAcknowledgmentProps) {
  const { locale } = useOrgDocument();

  const {
    title = "Delivery Acknowledgment",
    signature: signatureLabel = "Received By",
    printedName: printedNameLabel = "Printed Name",
    date: dateLabel = "Date",
  } = labels;

  return (
    <View style={styles.container} wrap={false}>
      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>{title}</Text>

      <Text style={styles.acknowledgmentText}>{acknowledgmentText}</Text>

      <View style={styles.row}>
        {/* Signature Field */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={styles.subLabel}>{signatureLabel}</Text>
        </View>

        {/* Printed Name Field */}
        <View style={styles.signatureBlock}>
          {recipientName ? (
            <>
              <Text style={styles.prefilledDate}>{recipientName}</Text>
              <Text style={styles.subLabel}>{printedNameLabel}</Text>
            </>
          ) : (
            <>
              <View style={styles.signatureLine} />
              <Text style={styles.subLabel}>{printedNameLabel}</Text>
            </>
          )}
        </View>

        {/* Date Field */}
        <View style={styles.lastSignatureBlock}>
          {deliveryDate ? (
            <>
              <Text style={styles.prefilledDate}>
                {formatDateForPdf(deliveryDate, locale)}
              </Text>
              <Text style={styles.subLabel}>{dateLabel}</Text>
            </>
          ) : (
            <>
              <View style={styles.signatureLine} />
              <Text style={styles.subLabel}>{dateLabel}</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// WORK ORDER SIGN-OFF COMPONENT
// ============================================================================

/**
 * Work order sign-off section with technician and optional customer signatures
 *
 * @example
 * <WorkOrderSignOff
 *   technicianName="Mike Johnson"
 *   completionDate={new Date()}
 *   showCustomerSignature={true}
 * />
 */
export function WorkOrderSignOff({
  technicianName,
  completionDate,
  showCustomerSignature = true,
  labels = {},
}: WorkOrderSignOffProps) {
  const { locale } = useOrgDocument();

  const {
    technicianSection = "Technician Sign-Off",
    technicianSignature = "Technician Signature",
    customerSection = "Customer Acknowledgment",
    customerSignature = "Customer Signature",
    date: dateLabel = "Date",
  } = labels;

  return (
    <View style={styles.container} wrap={false}>
      <View style={styles.divider} />

      {/* Technician Section */}
      <Text style={styles.sectionTitle}>{technicianSection}</Text>

      <View style={styles.row}>
        {/* Signature */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={styles.subLabel}>{technicianSignature}</Text>
        </View>

        {/* Technician Name */}
        <View style={styles.signatureBlock}>
          {technicianName ? (
            <>
              <Text style={styles.prefilledDate}>{technicianName}</Text>
              <Text style={styles.subLabel}>Printed Name</Text>
            </>
          ) : (
            <>
              <View style={styles.signatureLine} />
              <Text style={styles.subLabel}>Printed Name</Text>
            </>
          )}
        </View>

        {/* Date/Time */}
        <View style={styles.lastSignatureBlock}>
          {completionDate ? (
            <>
              <Text style={styles.prefilledDate}>
                {formatDateForPdf(completionDate, locale)}
              </Text>
              <Text style={styles.subLabel}>{dateLabel}</Text>
            </>
          ) : (
            <>
              <View style={styles.signatureLine} />
              <Text style={styles.subLabel}>{dateLabel}</Text>
            </>
          )}
        </View>
      </View>

      {/* Customer Section */}
      {showCustomerSignature && (
        <>
          <View style={[styles.divider, { marginTop: spacing.md }]} />

          <Text style={styles.sectionTitle}>{customerSection}</Text>

          <Text style={styles.acknowledgmentText}>
            I confirm that the work described above has been completed to my
            satisfaction.
          </Text>

          <View style={styles.row}>
            {/* Signature */}
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.subLabel}>{customerSignature}</Text>
            </View>

            {/* Printed Name */}
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.subLabel}>Printed Name</Text>
            </View>

            {/* Date */}
            <View style={styles.lastSignatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.subLabel}>{dateLabel}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
