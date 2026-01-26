/**
 * Invitation Email Template
 *
 * Sent to users when they are invited to join an organization.
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
import { formatDate } from "../../format";
import type { BaseEmailProps } from "../../render";

// ============================================================================
// TYPES
// ============================================================================

export interface InvitationEmailProps extends BaseEmailProps {
  /** Invitee's email address */
  email: string;
  /** Name of the person who sent the invitation */
  inviterName?: string | null;
  /** Email of the person who sent the invitation */
  inviterEmail?: string | null;
  /** Name of the organization */
  organizationName: string;
  /** Role being assigned */
  role: string;
  /** URL to accept the invitation */
  acceptUrl: string;
  /** Optional personal message from the inviter */
  personalMessage?: string | null;
  /** When the invitation expires */
  expiresAt: Date;
  /** Support email address */
  supportEmail?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    owner: "Owner",
    admin: "Administrator",
    manager: "Manager",
    sales: "Sales Representative",
    operations: "Operations",
    support: "Support",
    viewer: "Viewer",
  };
  return roleLabels[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

function getRoleDescription(role: string): string {
  const roleDescriptions: Record<string, string> = {
    owner: "Full access to all features and settings",
    admin: "Can manage users, settings, and all data",
    manager: "Can manage teams and view reports",
    sales: "Access to CRM, pipeline, and customer data",
    operations: "Access to inventory, orders, and fulfillment",
    support: "Access to support tickets and customer service",
    viewer: "Read-only access to assigned areas",
  };
  return roleDescriptions[role] || "Access to assigned features";
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InvitationEmail(props: InvitationEmailProps) {
  const {
    // email is used for the recipient (to:) field, not displayed in template
    inviterName = "A team member",
    inviterEmail = null,
    organizationName,
    role,
    acceptUrl,
    personalMessage = null,
    expiresAt,
    supportEmail = "support@renoz.energy",
  } = props;

  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const roleLabel = getRoleLabel(role);
  const roleDescription = getRoleDescription(role);
  const previewText = `${inviterName} invited you to join ${organizationName}`;

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
          <Header tagline="Team Invitation" />

          {/* Invitation Banner */}
          <Section
            style={{
              backgroundColor: "#EFF6FF",
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                color: "#1E40AF",
                fontSize: "24px",
                fontWeight: "700",
                margin: 0,
              }}
            >
              You're Invited!
            </Text>
            <Text
              style={{
                color: "#3B82F6",
                fontSize: "16px",
                margin: "8px 0 0 0",
              }}
            >
              Join {organizationName} on Renoz
            </Text>
          </Section>

          {/* Main Content */}
          <Section style={{ padding: "32px 24px" }}>
            <Text
              className={themeClasses.text}
              style={{
                color: lightStyles.text.color,
                margin: "0 0 24px 0",
                lineHeight: "1.6",
              }}
            >
              <strong>{inviterName}</strong>
              {inviterEmail && (
                <span style={{ color: "#6B7280" }}> ({inviterEmail})</span>
              )}{" "}
              has invited you to join <strong>{organizationName}</strong> as a{" "}
              <strong>{roleLabel}</strong>.
            </Text>

            {/* Personal Message */}
            {personalMessage && (
              <Section
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: "8px",
                  borderLeft: `4px solid ${emailTheme.light.accent}`,
                  padding: "16px 20px",
                  marginBottom: "24px",
                }}
              >
                <Text
                  style={{
                    fontSize: "13px",
                    color: "#6B7280",
                    margin: "0 0 8px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Personal Message
                </Text>
                <Text
                  style={{
                    fontSize: "14px",
                    color: "#374151",
                    margin: 0,
                    fontStyle: "italic",
                    lineHeight: "1.5",
                  }}
                >
                  "{personalMessage}"
                </Text>
              </Section>
            )}

            {/* Role Details */}
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
                Your Role
              </Text>

              <table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
                <tr>
                  <td style={{ padding: "4px 0" }}>
                    <span style={{ color: "#6B7280", fontSize: "14px" }}>
                      Role:
                    </span>
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right" }}>
                    <span
                      style={{
                        color: emailTheme.light.accent,
                        backgroundColor: "#DBEAFE",
                        fontSize: "13px",
                        fontWeight: "600",
                        padding: "4px 12px",
                        borderRadius: "4px",
                      }}
                    >
                      {roleLabel}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={2}
                    style={{ padding: "12px 0 0 0" }}
                  >
                    <Text
                      style={{
                        fontSize: "14px",
                        color: "#6B7280",
                        margin: 0,
                        lineHeight: "1.5",
                      }}
                    >
                      {roleDescription}
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* CTA Button */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button href={acceptUrl}>Accept Invitation</Button>
            </Section>

            {/* Expiry Notice */}
            <Section
              style={{
                backgroundColor: "#FEF3C7",
                borderRadius: "8px",
                padding: "16px 20px",
                marginBottom: "24px",
              }}
            >
              <Text
                style={{
                  color: "#92400E",
                  fontSize: "14px",
                  margin: 0,
                  fontWeight: "500",
                }}
              >
                This invitation expires on{" "}
                {formatDate(expiresAt, { includeTime: true })}
              </Text>
              <Text
                style={{
                  color: "#B45309",
                  fontSize: "13px",
                  margin: "4px 0 0 0",
                }}
              >
                Please accept it before then to join the team.
              </Text>
            </Section>

            <Text
              className={themeClasses.mutedText}
              style={{
                color: lightStyles.mutedText.color,
                fontSize: "13px",
                lineHeight: "1.5",
                margin: "24px 0 0 0",
              }}
            >
              If you weren't expecting this invitation, you can safely ignore
              this email. If you have questions, contact{" "}
              <a
                href={`mailto:${supportEmail}`}
                style={{ color: emailTheme.light.accent, textDecoration: "none" }}
              >
                {supportEmail}
              </a>
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
export default InvitationEmail;

// Preview props for development
InvitationEmail.PreviewProps = {
  email: "newuser@example.com",
  inviterName: "Sarah Johnson",
  inviterEmail: "sarah@acme-solar.com",
  organizationName: "Acme Solar",
  role: "sales",
  acceptUrl: "https://app.renoz.energy/accept-invitation?token=abc123def456",
  personalMessage: "Looking forward to having you on the team! We're growing fast and could really use your expertise in the solar panel market.",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  supportEmail: "support@renoz.energy",
} as InvitationEmailProps;
