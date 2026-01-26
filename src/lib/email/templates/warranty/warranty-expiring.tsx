/**
 * Warranty Expiring Email Template
 *
 * React Email template for warranty expiry notifications.
 * Sent to customers at 30/60/90 day intervals before warranty expiry.
 *
 * Features:
 * - Battery cycle status display for battery warranties
 * - Renewal/extension link for battery performance warranties
 * - Urgency level styling based on days until expiry
 * - Dark mode support
 *
 * @see EMAIL-TPL-002, EMAIL-TPL-007
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003a
 */

import {
  Body,
  Container,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import {
  EmailThemeProvider,
  Button,
  Header,
  Footer,
  getEmailInlineStyles,
  getEmailThemeClasses,
} from "../../components";
import { formatDate, formatNumber, formatPercent } from "../../format";
import type { BaseEmailProps } from "../../render";

// ============================================================================
// TYPES
// ============================================================================

export interface WarrantyExpiringProps extends BaseEmailProps {
  /** Customer's first name */
  customerName?: string | null;
  /** Product name (e.g., "Tesla Powerwall 2") */
  productName?: string | null;
  /** Product serial number */
  productSerial?: string | null;
  /** Warranty number for reference */
  warrantyNumber?: string | null;
  /** Human-readable policy type (e.g., "Battery Performance Warranty") */
  policyTypeDisplay?: string | null;
  /** Warranty policy name */
  policyName?: string | null;
  /** Number of days until warranty expires */
  daysUntilExpiry?: number | null;
  /** Expiry date */
  expiryDate?: Date | string | null;
  /** Current battery cycle count (for battery warranties) */
  currentCycleCount?: number | null;
  /** Maximum cycle limit (for battery warranties) */
  cycleLimit?: number | null;
  /** URL to warranty renewal/extension page (for battery warranties) */
  renewalUrl?: string | null;
  /** URL to view warranty details */
  warrantyDetailsUrl?: string;
  /** Support email for questions */
  supportEmail?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getUrgencyStyles(daysUntilExpiry: number) {
  if (daysUntilExpiry <= 7) {
    return {
      backgroundColor: "#FEE2E2",
      borderColor: "#EF4444",
      textColor: "#991B1B",
      label: "Expires Very Soon",
    };
  }
  if (daysUntilExpiry <= 30) {
    return {
      backgroundColor: "#FEF3C7",
      borderColor: "#F59E0B",
      textColor: "#92400E",
      label: "Expiring Soon",
    };
  }
  return {
    backgroundColor: "#DBEAFE",
    borderColor: "#3B82F6",
    textColor: "#1E40AF",
    label: "Expiry Reminder",
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WarrantyExpiring(props: WarrantyExpiringProps) {
  // Destructure with defaults (EMAIL-TPL-002: null handling)
  const {
    customerName = "Valued Customer",
    productName = "Your Product",
    productSerial = null,
    warrantyNumber = "",
    policyTypeDisplay = "Warranty",
    policyName = "Standard Warranty",
    daysUntilExpiry = 30,
    expiryDate = null,
    currentCycleCount = null,
    cycleLimit = null,
    renewalUrl = null,
    warrantyDetailsUrl = "#",
    supportEmail = "support@renoz.energy",
    unsubscribeUrl,
  } = props;

  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const urgency = getUrgencyStyles(daysUntilExpiry ?? 30);
  const isBatteryWarranty = cycleLimit !== null && cycleLimit > 0;
  const expiryDateDisplay = formatDate(expiryDate, { style: "long" });

  // Calculate cycle status for battery warranties
  const cycleRemaining =
    isBatteryWarranty && currentCycleCount !== null
      ? (cycleLimit ?? 0) - currentCycleCount
      : null;
  const cyclePercentUsed =
    isBatteryWarranty && currentCycleCount !== null && cycleLimit
      ? currentCycleCount / cycleLimit
      : null;

  const previewText = `Your ${policyTypeDisplay} expires in ${daysUntilExpiry} days`;

  return (
    <EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
      <Body
        className={`my-auto mx-auto font-sans ${themeClasses.body}`}
        style={lightStyles.body}
      >
        <Container
          className="my-[40px] mx-auto p-0 max-w-[600px]"
          style={{
            borderStyle: "solid",
            borderWidth: 1,
            borderColor: lightStyles.container.borderColor,
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <Header tagline="Warranty Services" />

          {/* Urgency Banner */}
          <Section
            style={{
              backgroundColor: urgency.backgroundColor,
              borderLeft: `4px solid ${urgency.borderColor}`,
              padding: "16px 24px",
            }}
          >
            <Text
              style={{
                color: urgency.textColor,
                fontSize: "16px",
                fontWeight: "600",
                margin: 0,
              }}
            >
              {urgency.label}: {daysUntilExpiry} day
              {daysUntilExpiry !== 1 ? "s" : ""} remaining
            </Text>
          </Section>

          {/* Main Content */}
          <Section style={{ padding: "32px 24px" }}>
            <Text
              className={themeClasses.text}
              style={{ color: lightStyles.text.color, margin: "0 0 24px 0" }}
            >
              Hi {customerName},
            </Text>

            <Text
              className={themeClasses.text}
              style={{
                color: lightStyles.text.color,
                margin: "0 0 24px 0",
                lineHeight: "1.5",
              }}
            >
              This is a reminder that your <strong>{policyTypeDisplay}</strong>{" "}
              for <strong>{productName}</strong> will expire on{" "}
              <strong>{expiryDateDisplay}</strong>.
            </Text>

            {/* Warranty Details Card */}
            <Section
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <Text
                style={{
                  fontSize: "14px",
                  color: "#6B7280",
                  margin: "0 0 12px 0",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Warranty Details
              </Text>

              <table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Warranty Number:
                    </span>
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    <span
                      style={{
                        color: "#111827",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      {warrantyNumber || "N/A"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Product:
                    </span>
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    <span
                      style={{
                        color: "#111827",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      {productName}
                    </span>
                  </td>
                </tr>
                {productSerial && (
                  <tr>
                    <td style={{ padding: "4px 0" }}>
                      <span style={{ color: "#6B7280", fontSize: "14px" }}>
                        Serial:
                      </span>
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "right" }}>
                      <span
                        style={{
                          color: "#111827",
                          fontSize: "14px",
                          fontFamily: "monospace",
                        }}
                      >
                        {productSerial}
                      </span>
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Policy:
                    </span>
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    <span
                      style={{
                        color: "#111827",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      {policyName}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Expires:
                    </span>
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    <span
                      style={{
                        color: urgency.textColor,
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      {expiryDateDisplay}
                    </span>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Battery Cycle Status (only for battery warranties) */}
            {isBatteryWarranty && cycleRemaining !== null && (
              <Section
                style={{
                  backgroundColor: "#F0FDF4",
                  borderRadius: "8px",
                  border: "1px solid #BBF7D0",
                  padding: "16px 20px",
                  marginBottom: "24px",
                }}
              >
                <Text
                  style={{
                    fontSize: "14px",
                    color: "#166534",
                    margin: 0,
                    fontWeight: "500",
                  }}
                >
                  Battery Cycle Status
                </Text>
                <Text
                  style={{
                    fontSize: "16px",
                    color: "#15803D",
                    margin: "8px 0 0 0",
                    fontWeight: "600",
                  }}
                >
                  {formatNumber(cycleRemaining)} cycles remaining
                  {cyclePercentUsed !== null &&
                    ` (${formatPercent(cyclePercentUsed)} of ${formatNumber(cycleLimit)} used)`}
                </Text>
              </Section>
            )}

            {/* Call to Action */}
            <Text
              className={themeClasses.text}
              style={{
                color: lightStyles.text.color,
                margin: "0 0 24px 0",
                lineHeight: "1.5",
              }}
            >
              {renewalUrl
                ? "Consider extending your warranty coverage to continue protecting your investment."
                : "Review your warranty details and coverage options before expiry."}
            </Text>

            {/* CTA Buttons */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              {renewalUrl && (
                <Button href={renewalUrl}>Extend Warranty</Button>
              )}
              <Text style={{ margin: "16px 0" }}>
                <Button href={warrantyDetailsUrl} variant="secondary">
                  View Details
                </Button>
              </Text>
            </Section>
          </Section>

          <Footer
            supportEmail={supportEmail}
            unsubscribeUrl={unsubscribeUrl}
          />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}

// Default export for React Email dev server
export default WarrantyExpiring;

// Preview props for development
WarrantyExpiring.PreviewProps = {
  customerName: "John",
  productName: "Tesla Powerwall 2",
  productSerial: "TW-2024-ABC123",
  warrantyNumber: "WAR-2024-0001",
  policyTypeDisplay: "Battery Performance Warranty",
  policyName: "10-Year Performance",
  daysUntilExpiry: 14,
  expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  currentCycleCount: 2850,
  cycleLimit: 4000,
  renewalUrl: "https://app.renoz.energy/warranty/extend/WAR-2024-0001",
  warrantyDetailsUrl: "https://app.renoz.energy/warranty/WAR-2024-0001",
  supportEmail: "support@renoz.energy",
} as WarrantyExpiringProps;
