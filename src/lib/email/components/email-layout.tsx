/**
 * Email Layout Component
 *
 * Provides consistent structure and boilerplate for all email templates.
 * Includes the EmailThemeProvider, Body, Container, Header, and Footer.
 *
 * @see EMAIL-TPL-006
 */

import { Body, Container, Preview } from "@react-email/components";
import { EmailThemeProvider, getEmailInlineStyles, getEmailThemeClasses } from "./theme";
import { Header } from "./header";
import { Footer, MinimalFooter } from "./footer";
import type { ReactNode } from "react";

export interface EmailLayoutProps {
  /** Preview text shown in email client list view */
  previewText: string;
  /** Tagline displayed in header (e.g., "Order Confirmation") */
  headerTagline?: string;
  /** Main email content */
  children: ReactNode;
  /** Support email address for footer */
  supportEmail?: string;
  /** Unsubscribe URL for footer (required for marketing emails) */
  unsubscribeUrl?: string;
  /** Use minimal footer (just copyright) instead of full footer */
  minimalFooter?: boolean;
  /** Header variant */
  headerVariant?: "light" | "dark" | "branded" | "gradient";
  /** Show accent stripe on header */
  showHeaderAccent?: boolean;
}

/**
 * Email Layout Component
 *
 * Encapsulates the common boilerplate structure used across all templates:
 * - EmailThemeProvider with preview text
 * - Body with theme classes
 * - Container with border styling
 * - Header with optional tagline
 * - Footer with support and unsubscribe links
 *
 * @example
 * // Basic usage
 * <EmailLayout previewText="Your order has been confirmed" headerTagline="Order Confirmation">
 *   <Section style={{ padding: "32px 24px" }}>
 *     <Text>Email content goes here...</Text>
 *   </Section>
 * </EmailLayout>
 *
 * @example
 * // With minimal footer
 * <EmailLayout
 *   previewText="System notification"
 *   headerTagline="Alert"
 *   minimalFooter
 * >
 *   <Section style={{ padding: "32px 24px" }}>
 *     <Text>Transactional email content...</Text>
 *   </Section>
 * </EmailLayout>
 */
export function EmailLayout({
  previewText,
  headerTagline,
  children,
  supportEmail,
  unsubscribeUrl,
  minimalFooter = false,
  headerVariant = "branded",
  showHeaderAccent = true,
}: EmailLayoutProps) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

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
          <Header
            tagline={headerTagline}
            variant={headerVariant}
            showAccent={showHeaderAccent}
          />

          {children}

          {minimalFooter ? (
            <MinimalFooter />
          ) : (
            <Footer
              supportEmail={supportEmail}
              unsubscribeUrl={unsubscribeUrl}
            />
          )}
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
