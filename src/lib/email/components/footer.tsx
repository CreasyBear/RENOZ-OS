/**
 * Email Footer Component
 *
 * Consistent footer across all email templates.
 * Automatically uses organization info when available.
 *
 * @see EMAIL-TPL-006
 */

import { Hr, Link, Section, Text } from "@react-email/components";
import { emailTheme, getEmailThemeClasses, getEmailInlineStyles } from "./theme";
import { useOrgEmail } from "../context";

interface FooterProps {
  /** Company name (overrides org name if set) */
  companyName?: string;
  /** Company address (for CAN-SPAM compliance) */
  companyAddress?: string;
  /** Support email address */
  supportEmail?: string;
  /** Company website URL */
  websiteUrl?: string;
  /** Unsubscribe URL (required for marketing emails) */
  unsubscribeUrl?: string;
  /** Show divider line above footer (default: true) */
  showDivider?: boolean;
}

/**
 * Email Footer Component
 *
 * Renders a compliant footer with company info and unsubscribe link.
 * Automatically pulls company info from org context when available.
 *
 * @example
 * // Uses org info automatically
 * <Footer unsubscribeUrl="https://example.com/unsubscribe?token=xxx" />
 *
 * @example
 * // Override with explicit props
 * <Footer
 *   companyName="Custom Company"
 *   supportEmail="help@custom.com"
 * />
 */
export function Footer({
  companyName,
  companyAddress,
  supportEmail,
  websiteUrl,
  unsubscribeUrl,
  showDivider = true,
}: FooterProps) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const { branding, settings, accentColor } = useOrgEmail();

  // Resolve from context or props
  const resolvedCompanyName = companyName ?? settings.name;
  const resolvedSupportEmail = supportEmail ?? settings.supportEmail;
  const resolvedAddress = companyAddress ?? settings.physicalAddress;
  const resolvedWebsite = websiteUrl ?? branding.websiteUrl;

  return (
    <Section
      style={{
        backgroundColor: "#F9FAFB",
        padding: "24px 24px 32px 24px",
        borderTop: showDivider ? `1px solid ${emailTheme.light.border}` : undefined,
      }}
    >
      {/* Support contact */}
      {resolvedSupportEmail && (
        <Text
          className={themeClasses.mutedText}
          style={{
            fontSize: "14px",
            color: lightStyles.mutedText.color,
            margin: "0 0 12px 0",
            textAlign: "center",
          }}
        >
          Questions? Contact us at{" "}
          <Link
            href={`mailto:${resolvedSupportEmail}`}
            style={{ color: accentColor, textDecoration: "none", fontWeight: "500" }}
          >
            {resolvedSupportEmail}
          </Link>
        </Text>
      )}

      {/* Company info */}
      <Text
        className={themeClasses.secondaryText}
        style={{
          fontSize: "12px",
          color: lightStyles.secondaryText.color,
          margin: "0",
          textAlign: "center",
        }}
      >
        {resolvedWebsite ? (
          <Link
            href={resolvedWebsite}
            style={{ color: lightStyles.secondaryText.color, textDecoration: "none" }}
          >
            {resolvedCompanyName}
          </Link>
        ) : (
          resolvedCompanyName
        )}
      </Text>

      {/* Address (CAN-SPAM compliance) */}
      {resolvedAddress && (
        <Text
          className={themeClasses.secondaryText}
          style={{
            fontSize: "11px",
            color: "#9CA3AF",
            margin: "4px 0 0 0",
            textAlign: "center",
          }}
        >
          {resolvedAddress}
        </Text>
      )}

      {/* Copyright */}
      <Text
        className={themeClasses.secondaryText}
        style={{
          fontSize: "11px",
          color: "#9CA3AF",
          margin: "8px 0 0 0",
          textAlign: "center",
        }}
      >
        &copy; {new Date().getFullYear()} {resolvedCompanyName}. All rights reserved.
      </Text>

      {/* Unsubscribe link */}
      {unsubscribeUrl && (
        <Text
          style={{
            fontSize: "11px",
            margin: "16px 0 0 0",
            textAlign: "center",
          }}
        >
          <Link
            href={unsubscribeUrl}
            className={themeClasses.mutedLink}
            style={{
              color: "#9CA3AF",
              textDecoration: "underline",
            }}
          >
            Unsubscribe from these emails
          </Link>
        </Text>
      )}
    </Section>
  );
}

/**
 * Minimal footer for transactional emails.
 * Just company name and optional support email.
 * Uses org context automatically.
 */
interface MinimalFooterProps {
  companyName?: string;
  supportEmail?: string;
}

export function MinimalFooter({
  companyName,
  supportEmail,
}: MinimalFooterProps) {
  const lightStyles = getEmailInlineStyles("light");
  const { settings, accentColor } = useOrgEmail();

  const resolvedCompanyName = companyName ?? settings.name;
  const resolvedSupportEmail = supportEmail ?? settings.supportEmail;

  return (
    <Section
      style={{
        padding: "24px",
        textAlign: "center",
      }}
    >
      <Hr
        style={{
          borderColor: emailTheme.light.border,
          margin: "0 0 24px 0",
        }}
      />

      <Text
        style={{
          fontSize: "12px",
          color: lightStyles.secondaryText.color,
          margin: "0",
        }}
      >
        {resolvedSupportEmail ? (
          <>
            Questions? Email us at{" "}
            <Link
              href={`mailto:${resolvedSupportEmail}`}
              style={{ color: accentColor, textDecoration: "none" }}
            >
              {resolvedSupportEmail}
            </Link>
          </>
        ) : (
          <>&copy; {new Date().getFullYear()} {resolvedCompanyName}</>
        )}
      </Text>
    </Section>
  );
}
