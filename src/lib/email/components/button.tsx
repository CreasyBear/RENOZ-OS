/**
 * Email Button Component
 *
 * Consistent CTA button styling across all email templates.
 * Automatically uses organization brand colors when available.
 *
 * @see EMAIL-TPL-006
 */

import { Button as ReactEmailButton } from "@react-email/components";
import type React from "react";
import { emailTheme, getEmailThemeClasses } from "./theme";
import { useOrgEmail, getContrastColor } from "../context";

interface ButtonProps {
  /** Button link URL */
  href: string;
  /** Button content */
  children: React.ReactNode;
  /** Button variant (default: "primary") */
  variant?: "primary" | "secondary";
  /** Additional CSS classes */
  className?: string;
  /** Full width button */
  fullWidth?: boolean;
  /** Override the primary color (useful for non-org contexts) */
  color?: string;
}

/**
 * Email Button Component
 *
 * Renders a styled button link for email templates.
 * Uses organization's primary color when rendered within OrgEmailProvider.
 *
 * @example
 * // Uses org's primary color automatically
 * <Button href="https://example.com/order/123">View Order</Button>
 *
 * @example
 * // Secondary variant uses subtle styling
 * <Button href="/details" variant="secondary">Learn More</Button>
 */
export function Button({
  href,
  children,
  variant = "primary",
  className = "",
  fullWidth = false,
  color,
}: ButtonProps) {
  const themeClasses = getEmailThemeClasses();
  const { primaryColor, secondaryColor } = useOrgEmail();

  const baseClasses =
    "text-[14px] font-semibold no-underline text-center px-6 py-3 border border-solid rounded-md";

  const variantClasses =
    variant === "primary" ? themeClasses.button : "border-gray-300";

  const widthClass = fullWidth ? "w-full block" : "inline-block";

  // Determine button color: explicit prop > org context > theme default
  const resolvedPrimaryColor = color ?? primaryColor ?? emailTheme.light.accent;
  const resolvedSecondaryColor = secondaryColor ?? emailTheme.light.border;

  // Get contrasting text color for the background
  const primaryTextColor = getContrastColor(resolvedPrimaryColor);

  // Inline styles for maximum email client compatibility
  const buttonStyle =
    variant === "primary"
      ? {
          backgroundColor: resolvedPrimaryColor,
          color: primaryTextColor,
          borderColor: resolvedPrimaryColor,
          // Add subtle depth
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        }
      : {
          backgroundColor: "transparent",
          color: emailTheme.light.foreground,
          borderColor: resolvedSecondaryColor,
        };

  return (
    <ReactEmailButton
      className={`${baseClasses} ${variantClasses} ${widthClass} ${className}`}
      href={href}
      style={buttonStyle}
    >
      {children}
    </ReactEmailButton>
  );
}
