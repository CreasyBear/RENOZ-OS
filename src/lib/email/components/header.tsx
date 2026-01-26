/**
 * Email Header Component
 *
 * Consistent branding header across all email templates.
 * Automatically uses organization logo and colors when available.
 *
 * @see EMAIL-TPL-006
 */

import { Img, Section, Text } from "@react-email/components";
import { emailTheme, getEmailThemeClasses, getEmailInlineStyles } from "./theme";
import { useOrgEmail } from "../context";

interface HeaderProps {
  /** Company/brand name (overrides org name if set) */
  brandName?: string;
  /** Optional logo URL (overrides org logo if set) */
  logoUrl?: string;
  /** Logo width in pixels (default: 120) */
  logoWidth?: number;
  /** Tagline below logo (optional) */
  tagline?: string;
  /** Background style: "light" | "dark" | "branded" | "gradient" (default: "branded") */
  variant?: "light" | "dark" | "branded" | "gradient";
  /** Show accent stripe using primary color */
  showAccent?: boolean;
}

/**
 * Email Header Component
 *
 * Renders a branded header for email templates.
 * Automatically pulls logo and colors from org context when available.
 *
 * @example
 * // Uses org logo and name automatically
 * <Header tagline="Order Confirmation" />
 *
 * @example
 * // Override with explicit branding
 * <Header
 *   brandName="Custom Name"
 *   logoUrl="https://example.com/logo.png"
 *   variant="light"
 * />
 *
 * @example
 * // Gradient header with accent stripe
 * <Header variant="gradient" showAccent tagline="Premium Experience" />
 */
export function Header({
  brandName,
  logoUrl,
  logoWidth = 120,
  tagline,
  variant = "branded",
  showAccent = true,
}: HeaderProps) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");
  const { branding, settings, primaryColor, accentColor } = useOrgEmail();

  // Resolve logo and name: explicit props > org context > defaults
  const resolvedLogoUrl = logoUrl ?? branding.logoUrl;
  const resolvedBrandName = brandName ?? settings.name ?? "Your Company";

  // Header background styles
  const backgroundStyles = {
    light: {
      backgroundColor: emailTheme.light.background,
      borderBottom: `1px solid ${emailTheme.light.border}`,
    },
    dark: {
      backgroundColor: "#111827",
    },
    branded: {
      backgroundColor: "#18181B", // Zinc-900
    },
    gradient: {
      background: `linear-gradient(135deg, #18181B 0%, ${primaryColor}15 100%)`,
      backgroundColor: "#18181B", // Fallback for email clients
    },
  };

  const textColor = variant === "light" ? lightStyles.text.color : "#ffffff";
  const mutedColor = variant === "light" ? lightStyles.mutedText.color : "#9CA3AF";

  return (
    <>
      {/* Brand accent stripe */}
      {showAccent && (
        <Section
          style={{
            backgroundColor: primaryColor,
            height: "4px",
          }}
        />
      )}

      <Section
        style={{
          ...backgroundStyles[variant],
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        {resolvedLogoUrl ? (
          <Img
            src={resolvedLogoUrl}
            width={logoWidth}
            height="auto"
            alt={resolvedBrandName}
            style={{
              margin: "0 auto",
              maxHeight: "48px",
            }}
          />
        ) : (
          <Text
            className={variant === "light" ? themeClasses.heading : ""}
            style={{
              color: textColor,
              fontSize: "24px",
              fontWeight: "700",
              letterSpacing: "-0.025em",
              margin: 0,
            }}
          >
            {resolvedBrandName}
          </Text>
        )}

        {tagline && (
          <Text
            className={variant === "light" ? themeClasses.mutedText : ""}
            style={{
              color: variant === "light" ? mutedColor : accentColor,
              fontSize: "13px",
              fontWeight: "500",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              margin: "10px 0 0 0",
            }}
          >
            {tagline}
          </Text>
        )}
      </Section>
    </>
  );
}
