/**
 * Email Components
 *
 * Shared components for React Email templates.
 * All components support dark mode, org branding, and are optimized for email clients.
 */

// Theme and styles
export {
  EmailThemeProvider,
  emailTheme,
  getEmailDarkModeCSS,
  getEmailInlineStyles,
  getEmailThemeClasses,
  useEmailTheme,
} from "./theme";

// Layout
export { EmailLayout, type EmailLayoutProps } from "./email-layout";

// UI Components
export { Button } from "./button";
export { Header } from "./header";
export { Footer, MinimalFooter } from "./footer";
export { Card, DetailRow, StatusBadge } from "./card";
