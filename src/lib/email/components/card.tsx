/**
 * Email Card Component
 *
 * Reusable container for grouping related content.
 * Replaces repetitive Section+backgroundColor patterns.
 *
 * @see EMAIL-TPL-006
 */

import { Section, Text } from "@react-email/components";
import { emailTheme } from "./theme";
import { useOrgEmail, lightenColor } from "../context";
import type { ReactNode, CSSProperties } from "react";

interface CardProps {
  /** Card content */
  children: ReactNode;
  /** Card title (optional) */
  title?: string;
  /** Visual variant */
  variant?: "default" | "muted" | "accent" | "success" | "warning" | "error";
  /** Additional inline styles */
  style?: CSSProperties;
  /** Padding size */
  padding?: "sm" | "md" | "lg";
}

/**
 * Card Component
 *
 * Consistent content container for email templates.
 *
 * @example
 * <Card title="Order Details">
 *   <DetailRow label="Order Number" value="ORD-001" />
 *   <DetailRow label="Total" value="$299.99" />
 * </Card>
 *
 * @example
 * <Card variant="success" title="Payment Confirmed">
 *   Your payment has been processed successfully.
 * </Card>
 */
export function Card({
  children,
  title,
  variant = "default",
  style,
  padding = "md",
}: CardProps) {
  const { primaryColor } = useOrgEmail();

  const paddingValues = {
    sm: "12px 16px",
    md: "20px",
    lg: "24px 28px",
  };

  const variantStyles: Record<string, CSSProperties> = {
    default: {
      backgroundColor: "#F9FAFB",
      borderRadius: "8px",
    },
    muted: {
      backgroundColor: "#F3F4F6",
      borderRadius: "8px",
    },
    accent: {
      backgroundColor: lightenColor(primaryColor, 92),
      borderLeft: `4px solid ${primaryColor}`,
      borderRadius: "4px",
    },
    success: {
      backgroundColor: "#ECFDF5",
      borderLeft: `4px solid ${emailTheme.light.success}`,
      borderRadius: "4px",
    },
    warning: {
      backgroundColor: "#FFFBEB",
      borderLeft: `4px solid ${emailTheme.light.warning}`,
      borderRadius: "4px",
    },
    error: {
      backgroundColor: "#FEF2F2",
      borderLeft: `4px solid ${emailTheme.light.error}`,
      borderRadius: "4px",
    },
  };

  const titleColors: Record<string, string> = {
    default: "#6B7280",
    muted: "#6B7280",
    accent: primaryColor,
    success: "#065F46",
    warning: "#92400E",
    error: "#991B1B",
  };

  return (
    <Section
      style={{
        ...variantStyles[variant],
        padding: paddingValues[padding],
        marginBottom: "24px",
        ...style,
      }}
    >
      {title && (
        <Text
          style={{
            fontSize: "12px",
            fontWeight: "600",
            color: titleColors[variant],
            margin: "0 0 12px 0",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </Text>
      )}
      {children}
    </Section>
  );
}

// ============================================================================
// DETAIL ROW
// ============================================================================

interface DetailRowProps {
  /** Row label */
  label: string;
  /** Row value */
  value: ReactNode;
  /** Show border below (default: true) */
  border?: boolean;
  /** Value alignment */
  align?: "left" | "right";
  /** Value font style */
  valueStyle?: "normal" | "mono" | "bold";
}

/**
 * Detail Row Component
 *
 * Label-value pair for displaying details.
 * Use within Card for consistent styling.
 *
 * @example
 * <Card title="Order Details">
 *   <DetailRow label="Order Number" value="ORD-001" valueStyle="mono" />
 *   <DetailRow label="Total" value="$299.99" valueStyle="bold" />
 *   <DetailRow label="Status" value={<StatusBadge status="confirmed" />} border={false} />
 * </Card>
 */
export function DetailRow({
  label,
  value,
  border = true,
  align = "right",
  valueStyle = "normal",
}: DetailRowProps) {
  const valueStyles: Record<string, CSSProperties> = {
    normal: {
      fontWeight: "500",
    },
    mono: {
      fontWeight: "500",
      fontFamily: "monospace",
    },
    bold: {
      fontWeight: "600",
    },
  };

  return (
    <table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
      <tr>
        <td
          style={{
            padding: "8px 0",
            borderBottom: border ? `1px solid ${emailTheme.light.border}` : undefined,
          }}
        >
          <span style={{ color: "#6B7280", fontSize: "14px" }}>{label}</span>
        </td>
        <td
          style={{
            padding: "8px 0",
            textAlign: align,
            borderBottom: border ? `1px solid ${emailTheme.light.border}` : undefined,
          }}
        >
          <span
            style={{
              color: "#111827",
              fontSize: "14px",
              ...valueStyles[valueStyle],
            }}
          >
            {value}
          </span>
        </td>
      </tr>
    </table>
  );
}

// ============================================================================
// STATUS BADGE
// ============================================================================

interface StatusBadgeProps {
  /** Status type */
  status: "success" | "warning" | "error" | "info" | "neutral";
  /** Badge text */
  children: ReactNode;
  /** Size variant */
  size?: "sm" | "md";
}

/**
 * Status Badge Component
 *
 * Colored badge for displaying status.
 *
 * @example
 * <StatusBadge status="success">Confirmed</StatusBadge>
 * <StatusBadge status="warning">Pending</StatusBadge>
 * <StatusBadge status="error">Failed</StatusBadge>
 */
export function StatusBadge({
  status,
  children,
  size = "sm",
}: StatusBadgeProps) {
  const { primaryColor } = useOrgEmail();

  const statusStyles: Record<string, { bg: string; color: string }> = {
    success: { bg: "#ECFDF5", color: "#065F46" },
    warning: { bg: "#FFFBEB", color: "#92400E" },
    error: { bg: "#FEF2F2", color: "#991B1B" },
    info: { bg: lightenColor(primaryColor, 90), color: primaryColor },
    neutral: { bg: "#F3F4F6", color: "#374151" },
  };

  const sizeStyles = {
    sm: { padding: "2px 8px", fontSize: "12px" },
    md: { padding: "4px 12px", fontSize: "13px" },
  };

  const { bg, color } = statusStyles[status];

  return (
    <span
      style={{
        backgroundColor: bg,
        color: color,
        ...sizeStyles[size],
        fontWeight: "500",
        borderRadius: "4px",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}
