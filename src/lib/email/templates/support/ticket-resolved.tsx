/**
 * Support Ticket Resolved Email Template
 *
 * Sent to customers when a support ticket is resolved.
 *
 * @see EMAIL-TPL-007
 */

import {
  Body,
  Container,
  Preview,
  Section,
  Text,
  Link,
} from "@react-email/components";
import {
  EmailThemeProvider,
  Button,
  Header,
  MinimalFooter,
  getEmailInlineStyles,
  getEmailThemeClasses,
  emailTheme,
} from "../../components";
import { formatDate, getFirstName } from "../../format";
import type { BaseEmailProps } from "../../render";

// ============================================================================
// TYPES
// ============================================================================

export interface TicketResolvedProps extends BaseEmailProps {
  /** Customer's full name */
  customerName?: string | null;
  /** Ticket number/ID */
  ticketNumber?: string | null;
  /** Ticket subject/title */
  subject?: string | null;
  /** Resolution summary */
  resolutionSummary?: string | null;
  /** Name of the agent who resolved the ticket */
  resolvedByName?: string | null;
  /** URL to view ticket */
  ticketUrl?: string;
  /** URL to reopen the ticket */
  reopenUrl?: string;
  /** URL to provide feedback */
  feedbackUrl?: string;
  /** Support email address */
  supportEmail?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TicketResolved(props: TicketResolvedProps) {
  // Destructure with defaults (EMAIL-TPL-002: null handling)
  const {
    customerName = "Valued Customer",
    ticketNumber = "",
    subject = "Support Request",
    resolutionSummary = null,
    resolvedByName = null,
    ticketUrl = "#",
    reopenUrl = null,
    feedbackUrl = null,
    supportEmail = "support@renoz.energy",
  } = props;

  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const firstName = getFirstName(customerName);
  const previewText = `Your support ticket #${ticketNumber} has been resolved`;

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
          <Header tagline="Support" />

          {/* Resolved Banner */}
          <Section
            style={{
              backgroundColor: "#ECFDF5",
              borderLeft: `4px solid ${emailTheme.light.success}`,
              padding: "16px 24px",
            }}
          >
            <Text
              style={{
                color: "#065F46",
                fontSize: "16px",
                fontWeight: "600",
                margin: 0,
              }}
            >
              Ticket Resolved
            </Text>
            <Text
              style={{
                color: "#047857",
                fontSize: "14px",
                margin: "4px 0 0 0",
              }}
            >
              #{ticketNumber} - {subject}
            </Text>
          </Section>

          {/* Main Content */}
          <Section style={{ padding: "32px 24px" }}>
            <Text
              className={themeClasses.text}
              style={{ color: lightStyles.text.color, margin: "0 0 24px 0" }}
            >
              Hi {firstName},
            </Text>

            <Text
              className={themeClasses.text}
              style={{
                color: lightStyles.text.color,
                margin: "0 0 24px 0",
                lineHeight: "1.5",
              }}
            >
              Great news! Your support ticket <strong>#{ticketNumber}</strong> has
              been resolved
              {resolvedByName && ` by ${resolvedByName}`}.
            </Text>

            {/* Resolution Summary */}
            {resolutionSummary && (
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
                  Resolution Summary
                </Text>
                <Text
                  style={{
                    fontSize: "14px",
                    color: "#374151",
                    margin: 0,
                    lineHeight: "1.6",
                  }}
                >
                  {resolutionSummary}
                </Text>
              </Section>
            )}

            {/* Ticket Details */}
            <Section
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Ticket Number:
                    </span>
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    <span
                      style={{
                        color: "#111827",
                        fontSize: "14px",
                        fontWeight: "500",
                        fontFamily: "monospace",
                      }}
                    >
                      #{ticketNumber}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Subject:
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
                      {subject}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Status:
                    </span>
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    <span
                      style={{
                        color: "#065F46",
                        backgroundColor: "#ECFDF5",
                        fontSize: "12px",
                        fontWeight: "500",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      Resolved
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Resolved On:
                    </span>
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    <span
                      style={{
                        color: "#111827",
                        fontSize: "14px",
                      }}
                    >
                      {formatDate(new Date(), { includeTime: true })}
                    </span>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Feedback Request */}
            {feedbackUrl && (
              <Section
                style={{
                  backgroundColor: "#EFF6FF",
                  borderRadius: "8px",
                  padding: "16px 20px",
                  marginBottom: "24px",
                  textAlign: "center",
                }}
              >
                <Text
                  style={{
                    color: "#1E40AF",
                    fontSize: "14px",
                    margin: 0,
                    fontWeight: "500",
                  }}
                >
                  How did we do?
                </Text>
                <Text
                  style={{
                    color: "#3B82F6",
                    fontSize: "13px",
                    margin: "4px 0 0 0",
                  }}
                >
                  Your feedback helps us improve our service
                </Text>
                <Text style={{ margin: "12px 0 0 0" }}>
                  <Link
                    href={feedbackUrl}
                    style={{
                      color: emailTheme.light.accent,
                      fontSize: "14px",
                      fontWeight: "500",
                      textDecoration: "none",
                    }}
                  >
                    Leave Feedback &rarr;
                  </Link>
                </Text>
              </Section>
            )}

            {/* CTA Button */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button href={ticketUrl}>View Ticket Details</Button>
            </Section>

            {/* Reopen Option */}
            <Text
              className={themeClasses.mutedText}
              style={{
                color: lightStyles.mutedText.color,
                fontSize: "14px",
                lineHeight: "1.5",
                margin: "24px 0 0 0",
                textAlign: "center",
              }}
            >
              Not resolved?{" "}
              {reopenUrl ? (
                <Link
                  href={reopenUrl}
                  style={{ color: emailTheme.light.accent, textDecoration: "none" }}
                >
                  Reopen this ticket
                </Link>
              ) : (
                "Reply to this email to reopen your ticket"
              )}
              .
            </Text>
          </Section>

          <MinimalFooter supportEmail={supportEmail} />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}

// Default export for React Email dev server
export default TicketResolved;

// Preview props for development
TicketResolved.PreviewProps = {
  customerName: "John Doe",
  ticketNumber: "TKT-2024-0001",
  subject: "Unable to connect Powerwall to WiFi",
  resolutionSummary: "We identified that the issue was due to a firewall setting on your router. We've provided step-by-step instructions to whitelist the Powerwall's MAC address. The device should now connect successfully.",
  resolvedByName: "Sarah from Support",
  ticketUrl: "https://app.renoz.energy/support/TKT-2024-0001",
  reopenUrl: "https://app.renoz.energy/support/TKT-2024-0001/reopen",
  feedbackUrl: "https://app.renoz.energy/support/TKT-2024-0001/feedback",
  supportEmail: "support@renoz.energy",
} as TicketResolvedProps;
