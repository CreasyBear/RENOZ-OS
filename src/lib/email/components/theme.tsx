/* eslint-disable react-refresh/only-export-components -- Email components file exports components + re-exports */
/**
 * Email Theme Provider and Dark Mode Support
 *
 * Provides consistent theming across all email templates with
 * dark mode support for major email clients.
 *
 * @see EMAIL-TPL-004
 * @see _reference/.midday-reference/packages/email/components/theme.tsx
 */

import { Font, Head, Html, Tailwind } from "@react-email/components";
import type React from "react";

// Re-export Button component for convenience
export { Button } from "./button";

// ============================================================================
// THEME COLORS
// ============================================================================

/**
 * Email-optimized theme colors.
 * Uses slightly off-white/black to prevent auto-inversion in some clients.
 */
export const emailTheme = {
  light: {
    background: "#ffffff",
    foreground: "#0e0e0e", // Slightly off-black
    muted: "#6b7280",
    border: "#e5e7eb",
    accent: "#2563eb", // Renoz blue
    secondary: "#9ca3af",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
  },
  dark: {
    background: "#0C0C0C",
    foreground: "#fefefe", // Slightly off-white
    muted: "#a1a1aa",
    border: "#1D1D1D",
    accent: "#60a5fa", // Lighter blue for dark mode
    secondary: "#6b7280",
    success: "#34d399",
    warning: "#fbbf24",
    error: "#f87171",
  },
} as const;

// ============================================================================
// DARK MODE CSS
// ============================================================================

/**
 * Get industry-standard dark mode CSS for email clients.
 * Supports Apple Mail, Gmail, Outlook, and other modern clients.
 */
export function getEmailDarkModeCSS(): string {
  return `
    /* Root CSS for email dark mode support */
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }

    /* Apple Mail, iOS Mail, and some webview clients */
    @media (prefers-color-scheme: dark) {
      .email-body {
        background-color: ${emailTheme.dark.background} !important;
        color: ${emailTheme.dark.foreground} !important;
      }
      .email-container {
        border-color: ${emailTheme.dark.border} !important;
      }
      .email-text {
        color: ${emailTheme.dark.foreground} !important;
      }
      .email-muted {
        color: ${emailTheme.dark.muted} !important;
      }
      .email-secondary {
        color: ${emailTheme.dark.secondary} !important;
      }
      .email-accent {
        color: ${emailTheme.dark.accent} !important;
        border-color: ${emailTheme.dark.accent} !important;
      }
      .email-border {
        border-color: ${emailTheme.dark.border} !important;
      }

      /* Image swapping for dark mode */
      .dark-mode-hide {
        display: none !important;
      }
      .dark-mode-show {
        display: block !important;
      }
    }

    /* Gmail Desktop Dark Mode */
    @media (prefers-color-scheme: dark) {
      .gmail_dark .email-body,
      .gmail_dark_theme .email-body,
      [data-darkmode="true"] .email-body {
        background-color: ${emailTheme.dark.background} !important;
        color: ${emailTheme.dark.foreground} !important;
      }
      .gmail_dark .email-container,
      .gmail_dark_theme .email-container,
      [data-darkmode="true"] .email-container {
        border-color: ${emailTheme.dark.border} !important;
      }
      .gmail_dark .email-text,
      .gmail_dark_theme .email-text,
      [data-darkmode="true"] .email-text {
        color: ${emailTheme.dark.foreground} !important;
      }
      .gmail_dark .email-muted,
      .gmail_dark_theme .email-muted,
      [data-darkmode="true"] .email-muted {
        color: ${emailTheme.dark.muted} !important;
      }
      .gmail_dark .email-accent,
      .gmail_dark_theme .email-accent,
      [data-darkmode="true"] .email-accent {
        color: ${emailTheme.dark.accent} !important;
        border-color: ${emailTheme.dark.accent} !important;
      }
    }

    /* Gmail Desktop conditional targeting */
    @media screen and (prefers-color-scheme: dark) {
      div[style*="background"] .email-body,
      .ii .email-body {
        background-color: ${emailTheme.dark.background} !important;
        color: ${emailTheme.dark.foreground} !important;
      }
      div[style*="background"] .email-container,
      .ii .email-container {
        border-color: ${emailTheme.dark.border} !important;
      }
      div[style*="background"] .email-text,
      .ii .email-text {
        color: ${emailTheme.dark.foreground} !important;
      }
      div[style*="background"] .email-muted,
      .ii .email-muted {
        color: ${emailTheme.dark.muted} !important;
      }
      div[style*="background"] .email-accent,
      .ii .email-accent {
        color: ${emailTheme.dark.accent} !important;
        border-color: ${emailTheme.dark.accent} !important;
      }
    }

    /* Outlook Web App and Outlook mobile */
    [data-ogsc] .email-text {
      color: ${emailTheme.dark.foreground} !important;
    }
    [data-ogsc] .email-muted {
      color: ${emailTheme.dark.muted} !important;
    }
    [data-ogsc] .email-accent {
      color: ${emailTheme.dark.accent} !important;
      border-color: ${emailTheme.dark.accent} !important;
    }
    [data-ogsc] .dark-mode-hide {
      display: none !important;
    }
    [data-ogsc] .dark-mode-show {
      display: block !important;
    }

    /* Outlook background targeting */
    [data-ogsb] .email-body {
      background-color: ${emailTheme.dark.background} !important;
    }
    [data-ogsb] .email-container {
      border-color: ${emailTheme.dark.border} !important;
    }
  `;
}

// ============================================================================
// THEME CLASSES
// ============================================================================

/**
 * Get email-optimized theme classes.
 * Use these classes on elements for dark mode support.
 */
export function getEmailThemeClasses() {
  return {
    body: "email-body",
    container: "email-container",
    heading: "email-text",
    text: "email-text",
    mutedText: "email-muted",
    secondaryText: "email-secondary",
    button: "email-accent",
    border: "email-border",
    link: "email-text",
    mutedLink: "email-muted",
    hideInDark: "dark-mode-hide",
    showInDark: "dark-mode-show",
  };
}

// ============================================================================
// INLINE STYLES
// ============================================================================

/**
 * Get inline styles for email elements.
 * Use as fallback for older email clients that don't support CSS classes.
 */
export function getEmailInlineStyles(mode: "light" | "dark" = "light") {
  const theme = emailTheme[mode];
  return {
    body: {
      backgroundColor: theme.background,
      color: theme.foreground,
    },
    container: {
      borderColor: theme.border,
    },
    text: {
      color: theme.foreground,
    },
    mutedText: {
      color: theme.muted,
    },
    secondaryText: {
      color: theme.secondary,
    },
    button: {
      color: theme.accent,
      borderColor: theme.accent,
    },
    link: {
      color: theme.accent,
    },
    success: {
      color: theme.success,
    },
    warning: {
      color: theme.warning,
    },
    error: {
      color: theme.error,
    },
  };
}

// ============================================================================
// THEME PROVIDER
// ============================================================================

interface EmailThemeProviderProps {
  children: React.ReactNode;
  preview?: React.ReactNode;
  additionalHeadContent?: React.ReactNode;
}

/**
 * Email Theme Provider
 *
 * Wrap your email template with this provider to get:
 * - Dark mode CSS injection
 * - Tailwind support
 * - Font loading
 * - Proper HTML structure
 *
 * @example
 * <EmailThemeProvider preview={<Preview>Email subject</Preview>}>
 *   <Body className="email-body">
 *     {content}
 *   </Body>
 * </EmailThemeProvider>
 */
export function EmailThemeProvider({
  children,
  preview,
  additionalHeadContent,
}: EmailThemeProviderProps) {
  return (
    <Html>
      <Tailwind>
        <Head>
          {/* Essential meta tags for email dark mode support */}
          <meta name="color-scheme" content="light dark" />
          <meta name="supported-color-schemes" content="light dark" />

          {/* Additional dark mode hints */}
          <meta
            name="theme-color"
            content="#0C0C0C"
            media="(prefers-color-scheme: dark)"
          />
          <meta
            name="theme-color"
            content="#ffffff"
            media="(prefers-color-scheme: light)"
          />

          {/* Dark mode styles */}
          <style>{getEmailDarkModeCSS()}</style>

          {/* Default fonts */}
          <Font
            fontFamily="Inter"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: "https://rsms.me/inter/font-files/Inter-Regular.woff2",
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />

          <Font
            fontFamily="Inter"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: "https://rsms.me/inter/font-files/Inter-Medium.woff2",
              format: "woff2",
            }}
            fontWeight={500}
            fontStyle="normal"
          />

          <Font
            fontFamily="Inter"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: "https://rsms.me/inter/font-files/Inter-SemiBold.woff2",
              format: "woff2",
            }}
            fontWeight={600}
            fontStyle="normal"
          />

          {/* Additional head content */}
          {additionalHeadContent}
        </Head>
        {preview}
        {children}
      </Tailwind>
    </Html>
  );
}

// ============================================================================
// SIMPLIFIED THEME HOOK
// ============================================================================

/**
 * Simplified hook for using email theme in components.
 */
export function useEmailTheme() {
  return {
    classes: getEmailThemeClasses(),
    lightStyles: getEmailInlineStyles("light"),
    colors: emailTheme,
  };
}
