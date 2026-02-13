/**
 * Welcome Email Template
 *
 * Sent to new customers after account creation or first purchase.
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
  Footer,
  getEmailInlineStyles,
  getEmailThemeClasses,
  emailTheme,
} from "../../components";
import { getFirstName } from "../../format";
import type { BaseEmailProps } from "../../render";

// ============================================================================
// TYPES
// ============================================================================

export interface WelcomeEmailProps extends BaseEmailProps {
  /** Customer's full name */
  customerName?: string | null;
  /** Company name the customer belongs to (B2B) */
  companyName?: string | null;
  /** URL to complete profile or get started */
  getStartedUrl?: string;
  /** URL to support/help center */
  helpCenterUrl?: string;
  /** Support email address */
  supportEmail?: string;
  /** Name of the sender company */
  fromCompanyName?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WelcomeEmail(props: WelcomeEmailProps) {
  // Destructure with defaults (EMAIL-TPL-002: null handling)
  const {
    customerName = "Valued Customer",
    companyName = null,
    getStartedUrl = "#",
    helpCenterUrl = "#",
    supportEmail = "support@renoz.energy",
    fromCompanyName = "Renoz",
    unsubscribeUrl,
  } = props;

  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const firstName = getFirstName(customerName);
  const previewText = `Welcome to ${fromCompanyName}!`;

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
          <Header brandName={fromCompanyName} />

          {/* Welcome Banner */}
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
                fontSize: "28px",
                fontWeight: "700",
                margin: 0,
              }}
            >
              Welcome Aboard!
            </Text>
            <Text
              style={{
                color: "#3B82F6",
                fontSize: "16px",
                margin: "8px 0 0 0",
              }}
            >
              We&apos;re excited to have you with us.
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
                margin: "0 0 16px 0",
                lineHeight: "1.6",
              }}
            >
              Thank you for joining {fromCompanyName}
              {companyName ? ` on behalf of ${companyName}` : ""}! We&apos;re thrilled
              to have you as part of our community.
            </Text>

            <Text
              className={themeClasses.text}
              style={{
                color: lightStyles.text.color,
                margin: "0 0 24px 0",
                lineHeight: "1.6",
              }}
            >
              Here are some things you can do to get started:
            </Text>

            {/* Getting Started Steps */}
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
                  <td style={{ padding: "8px 0", verticalAlign: "top", width: "32px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: emailTheme.light.accent,
                        color: "#ffffff",
                        textAlign: "center",
                        lineHeight: "24px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      1
                    </span>
                  </td>
                  <td style={{ padding: "8px 0 8px 12px" }}>
                    <Text style={{ color: "#111827", fontSize: "14px", margin: 0, fontWeight: "500" }}>
                      Complete your profile
                    </Text>
                    <Text style={{ color: "#6B7280", fontSize: "13px", margin: "4px 0 0 0" }}>
                      Add your details to personalize your experience
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", verticalAlign: "top", width: "32px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: emailTheme.light.accent,
                        color: "#ffffff",
                        textAlign: "center",
                        lineHeight: "24px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      2
                    </span>
                  </td>
                  <td style={{ padding: "8px 0 8px 12px" }}>
                    <Text style={{ color: "#111827", fontSize: "14px", margin: 0, fontWeight: "500" }}>
                      Explore our products
                    </Text>
                    <Text style={{ color: "#6B7280", fontSize: "13px", margin: "4px 0 0 0" }}>
                      Browse our catalog and find what you need
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", verticalAlign: "top", width: "32px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: emailTheme.light.accent,
                        color: "#ffffff",
                        textAlign: "center",
                        lineHeight: "24px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      3
                    </span>
                  </td>
                  <td style={{ padding: "8px 0 8px 12px" }}>
                    <Text style={{ color: "#111827", fontSize: "14px", margin: 0, fontWeight: "500" }}>
                      Get support when needed
                    </Text>
                    <Text style={{ color: "#6B7280", fontSize: "13px", margin: "4px 0 0 0" }}>
                      Our team is here to help you every step of the way
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* CTA Button */}
            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button href={getStartedUrl}>Get Started</Button>
            </Section>

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
              Have questions? Check out our{" "}
              <a
                href={helpCenterUrl}
                style={{ color: emailTheme.light.accent, textDecoration: "none" }}
              >
                Help Center
              </a>{" "}
              or reply to this email.
            </Text>
          </Section>

          <Footer
            companyName={fromCompanyName}
            supportEmail={supportEmail}
            unsubscribeUrl={unsubscribeUrl}
          />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}

// Default export for React Email dev server
export default WelcomeEmail;

// Preview props for development
WelcomeEmail.PreviewProps = {
  customerName: "John Doe",
  companyName: "Acme Solar",
  getStartedUrl: "https://app.renoz.energy/onboarding",
  helpCenterUrl: "https://help.renoz.energy",
  supportEmail: "support@renoz.energy",
  fromCompanyName: "Renoz Energy",
} as WelcomeEmailProps;
