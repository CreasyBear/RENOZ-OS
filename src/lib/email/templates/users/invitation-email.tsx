/**
 * Invitation Email Template
 *
 * Sent to users when they are invited to join an organization.
 *
 * NOTE: This template intentionally uses raw React HTML instead of @react-email
 * components because it was created for server-side rendering with ReactDOMServer
 * before the shared email component system was established.
 *
 * Future refactoring: Consider migrating to use shared components from
 * ../../components (EmailLayout, Button, Header, Footer) for consistency.
 * See: todos/master-merge-review/012-pending-p3-invitation-email-different-pattern.md
 *
 * @see EMAIL-TPL-007
 */

import * as React from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface InvitationEmailProps {
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

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InvitationEmail({
  inviterName = "A team member",
  inviterEmail = null,
  organizationName,
  role,
  acceptUrl,
  personalMessage = null,
  expiresAt,
  supportEmail = "support@renoz.energy",
}: InvitationEmailProps): React.ReactElement {
  const roleLabel = getRoleLabel(role);
  const roleDescription = getRoleDescription(role);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`You're Invited to Join ${organizationName}`}</title>
      </head>
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#F3F4F6",
          margin: 0,
          padding: 0,
        }}
      >
        {/* Container */}
        <table
          cellPadding="0"
          cellSpacing="0"
          style={{
            width: "100%",
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#FFFFFF",
          }}
        >
          {/* Header */}
          <tr>
            <td
              style={{
                backgroundColor: "#111827",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  color: "#FFFFFF",
                  fontSize: "24px",
                  fontWeight: "700",
                  margin: 0,
                }}
              >
                Renoz Energy
              </h1>
              <p
                style={{
                  color: "#9CA3AF",
                  fontSize: "14px",
                  margin: "8px 0 0 0",
                }}
              >
                Team Invitation
              </p>
            </td>
          </tr>

          {/* Invitation Banner */}
          <tr>
            <td
              style={{
                backgroundColor: "#EFF6FF",
                padding: "32px 24px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  color: "#1E40AF",
                  fontSize: "24px",
                  fontWeight: "700",
                  margin: 0,
                }}
              >
                You&apos;re Invited!
              </p>
              <p
                style={{
                  color: "#3B82F6",
                  fontSize: "16px",
                  margin: "8px 0 0 0",
                }}
              >
                Join {organizationName} on Renoz
              </p>
            </td>
          </tr>

          {/* Main Content */}
          <tr>
            <td style={{ padding: "32px 24px" }}>
              <p
                style={{
                  color: "#374151",
                  fontSize: "16px",
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
              </p>

              {/* Personal Message */}
              {personalMessage && (
                <table
                  cellPadding="0"
                  cellSpacing="0"
                  style={{
                    width: "100%",
                    backgroundColor: "#F9FAFB",
                    borderRadius: "8px",
                    borderLeft: "4px solid #2563EB",
                    marginBottom: "24px",
                  }}
                >
                  <tr>
                    <td style={{ padding: "16px 20px" }}>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#6B7280",
                          margin: "0 0 8px 0",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Personal Message
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#374151",
                          margin: 0,
                          fontStyle: "italic",
                          lineHeight: "1.5",
                        }}
                      >
                        &quot;{personalMessage}&quot;
                      </p>
                    </td>
                  </tr>
                </table>
              )}

              {/* Role Details */}
              <table
                cellPadding="0"
                cellSpacing="0"
                style={{
                  width: "100%",
                  backgroundColor: "#F9FAFB",
                  borderRadius: "8px",
                  marginBottom: "24px",
                }}
              >
                <tr>
                  <td style={{ padding: "20px" }}>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#6B7280",
                        margin: "0 0 12px 0",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Your Role
                    </p>

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
                              color: "#2563EB",
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
                        <td colSpan={2} style={{ padding: "12px 0 0 0" }}>
                          <p
                            style={{
                              fontSize: "14px",
                              color: "#6B7280",
                              margin: 0,
                              lineHeight: "1.5",
                            }}
                          >
                            {roleDescription}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              {/* CTA Button */}
              <table
                cellPadding="0"
                cellSpacing="0"
                style={{ width: "100%", marginBottom: "24px" }}
              >
                <tr>
                  <td style={{ textAlign: "center", padding: "8px 0" }}>
                    <a
                      href={acceptUrl}
                      style={{
                        display: "inline-block",
                        backgroundColor: "#2563EB",
                        color: "#FFFFFF",
                        fontSize: "16px",
                        fontWeight: "600",
                        padding: "14px 32px",
                        borderRadius: "6px",
                        textDecoration: "none",
                      }}
                    >
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              {/* Expiry Notice */}
              <table
                cellPadding="0"
                cellSpacing="0"
                style={{
                  width: "100%",
                  backgroundColor: "#FEF3C7",
                  borderRadius: "8px",
                  marginBottom: "24px",
                }}
              >
                <tr>
                  <td style={{ padding: "16px 20px" }}>
                    <p
                      style={{
                        color: "#92400E",
                        fontSize: "14px",
                        margin: 0,
                        fontWeight: "500",
                      }}
                    >
                      This invitation expires on {formatDate(expiresAt)}
                    </p>
                    <p
                      style={{
                        color: "#B45309",
                        fontSize: "13px",
                        margin: "4px 0 0 0",
                      }}
                    >
                      Please accept it before then to join the team.
                    </p>
                  </td>
                </tr>
              </table>

              <p
                style={{
                  color: "#6B7280",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  margin: "24px 0 0 0",
                }}
              >
                If you weren&apos;t expecting this invitation, you can safely ignore
                this email. If you have questions, contact{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  style={{ color: "#2563EB", textDecoration: "none" }}
                >
                  {supportEmail}
                </a>
                .
              </p>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td
              style={{
                backgroundColor: "#F9FAFB",
                padding: "24px",
                borderTop: "1px solid #E5E7EB",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "#9CA3AF",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                Renoz Energy Pty Ltd | ABN 12 345 678 901
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "#9CA3AF",
                  margin: "4px 0 0 0",
                  textAlign: "center",
                }}
              >
                This email was sent because someone invited you to join their team.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default InvitationEmail;

// Preview props for development
InvitationEmail.PreviewProps = {
  email: "newuser@example.com",
  inviterName: "Sarah Johnson",
  inviterEmail: "sarah@acme-solar.com",
  organizationName: "Acme Solar",
  role: "sales",
  acceptUrl: "https://app.renoz.energy/accept-invitation?token=abc123def456",
  personalMessage:
    "Looking forward to having you on the team! We're growing fast and could really use your expertise in the solar panel market.",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  supportEmail: "support@renoz.energy",
} as InvitationEmailProps;
