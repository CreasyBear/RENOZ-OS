/**
 * Support Ticket Created Email Template
 *
 * Sent to customers when a support ticket is created.
 *
 * @see EMAIL-TPL-007
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

export interface TicketCreatedProps extends BaseEmailProps {
  /** Customer's full name */
  customerName?: string | null;
  /** Ticket number/ID */
  ticketNumber?: string | null;
  /** Ticket subject/title */
  subject?: string | null;
  /** Brief preview of the ticket description */
  descriptionPreview?: string | null;
  /** Priority level */
  priority?: "low" | "medium" | "high" | "urgent" | null;
  /** Expected response time */
  expectedResponseTime?: string | null;
  /** URL to view ticket */
  ticketUrl?: string;
  /** Support email address */
  supportEmail?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getPriorityStyles(priority: string | null) {
  switch (priority) {
    case "urgent":
      return { color: "#991B1B", backgroundColor: "#FEE2E2", label: "Urgent" };
    case "high":
      return { color: "#92400E", backgroundColor: "#FEF3C7", label: "High" };
    case "medium":
      return { color: "#1E40AF", backgroundColor: "#DBEAFE", label: "Medium" };
    default:
      return { color: "#065F46", backgroundColor: "#ECFDF5", label: "Low" };
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TicketCreated(props: TicketCreatedProps) {
  // Destructure with defaults (EMAIL-TPL-002: null handling)
  const {
    customerName = "Valued Customer",
    ticketNumber = "",
    subject = "Support Request",
    descriptionPreview = null,
    priority = "medium",
    expectedResponseTime = "24 hours",
    ticketUrl = "#",
    supportEmail = "support@renoz.energy",
  } = props;

  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const firstName = getFirstName(customerName);
  const priorityStyles = getPriorityStyles(priority);
  const previewText = `We received your support request - Ticket #${ticketNumber}`;

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

          {/* Confirmation Banner */}
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
              We&apos;ve Received Your Request
            </Text>
            <Text
              style={{
                color: "#047857",
                fontSize: "14px",
                margin: "4px 0 0 0",
              }}
            >
              Ticket #{ticketNumber} has been created
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
              Thank you for reaching out. We&apos;ve received your support request and
              our team is reviewing it.
            </Text>

            {/* Ticket Details */}
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
                Ticket Details
              </Text>

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
                      Priority:
                    </span>
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    <span
                      style={{
                        color: priorityStyles.color,
                        backgroundColor: priorityStyles.backgroundColor,
                        fontSize: "12px",
                        fontWeight: "500",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {priorityStyles.label}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Created:
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

              {descriptionPreview && (
                <>
                  <Text
                    style={{
                      fontSize: "14px",
                      color: "#6B7280",
                      margin: "16px 0 8px 0",
                    }}
                  >
                    Your message:
                  </Text>
                  <Text
                    style={{
                      fontSize: "14px",
                      color: "#374151",
                      margin: 0,
                      fontStyle: "italic",
                      backgroundColor: "#ffffff",
                      padding: "12px",
                      borderRadius: "4px",
                      border: `1px solid ${emailTheme.light.border}`,
                    }}
                  >
                    &quot;{descriptionPreview}&quot;
                  </Text>
                </>
              )}
            </Section>

            {/* Expected Response */}
            <Section
              style={{
                backgroundColor: "#EFF6FF",
                borderRadius: "8px",
                padding: "16px 20px",
                marginBottom: "24px",
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
                Expected Response Time: {expectedResponseTime}
              </Text>
              <Text
                style={{
                  color: "#3B82F6",
                  fontSize: "13px",
                  margin: "4px 0 0 0",
                }}
              >
                We&apos;ll get back to you as soon as possible
              </Text>
            </Section>

            {/* CTA Button */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button href={ticketUrl}>View Ticket</Button>
            </Section>

            <Text
              className={themeClasses.mutedText}
              style={{
                color: lightStyles.mutedText.color,
                fontSize: "14px",
                lineHeight: "1.5",
                margin: "24px 0 0 0",
              }}
            >
              You can reply to this email to add more information to your ticket.
            </Text>
          </Section>

          <MinimalFooter supportEmail={supportEmail} />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}

// Default export for React Email dev server
export default TicketCreated;

// Preview props for development
TicketCreated.PreviewProps = {
  customerName: "John Doe",
  ticketNumber: "TKT-2024-0001",
  subject: "Unable to connect Powerwall to WiFi",
  descriptionPreview: "I've tried resetting the device but it still won't connect to my home network...",
  priority: "high",
  expectedResponseTime: "Within 4 hours",
  ticketUrl: "https://app.renoz.energy/support/TKT-2024-0001",
  supportEmail: "support@renoz.energy",
} as TicketCreatedProps;
