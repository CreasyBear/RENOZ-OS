/**
 * Certificate Border Component
 *
 * Decorative border styling for formal certificate documents.
 * Provides elegant visual framing for warranty and completion certificates.
 */

import { View, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { colors, spacing } from "./theme";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  outerContainer: {
    padding: spacing.sm,
    backgroundColor: colors.background.white,
  },
  outerBorder: {
    borderWidth: 3,
    borderColor: colors.border.dark,
    padding: spacing.xs,
  },
  innerBorder: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    padding: spacing["2xl"],
    minHeight: "100%",
  },
  // Decorative corner accents
  cornerContainer: {
    position: "absolute",
    width: 30,
    height: 30,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.border.dark,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.border.dark,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.border.dark,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.border.dark,
  },
  // Content area
  content: {
    position: "relative",
    flex: 1,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface CertificateBorderProps {
  /** Content to render inside the certificate border */
  children: ReactNode;
  /** Primary color for the border accent (defaults to theme color) */
  primaryColor?: string;
  /** Whether to show corner accents (default true) */
  showCornerAccents?: boolean;
  /** Border style variant */
  variant?: "classic" | "modern" | "minimal";
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Certificate Border Component
 *
 * Provides decorative framing for formal certificate documents.
 * Supports multiple style variants for different certificate types.
 *
 * @example
 * <CertificateBorder primaryColor="#1e3a5f">
 *   <CertificateContent />
 * </CertificateBorder>
 */
export function CertificateBorder({
  children,
  primaryColor = colors.border.dark,
  showCornerAccents = true,
  variant = "classic",
}: CertificateBorderProps) {
  // Minimal variant has just a single border
  if (variant === "minimal") {
    return (
      <View
        style={[
          styles.outerContainer,
          { borderWidth: 1, borderColor: primaryColor, padding: spacing["2xl"] },
        ]}
      >
        {children}
      </View>
    );
  }

  // Modern variant has a colored accent border
  if (variant === "modern") {
    return (
      <View style={styles.outerContainer}>
        <View style={[styles.outerBorder, { borderColor: primaryColor }]}>
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    );
  }

  // Classic variant with double border and optional corner accents
  return (
    <View style={styles.outerContainer}>
      <View style={[styles.outerBorder, { borderColor: primaryColor }]}>
        <View style={styles.innerBorder}>
          <View style={styles.content}>
            {showCornerAccents && (
              <>
                <View
                  style={[
                    styles.cornerContainer,
                    styles.topLeft,
                    { borderColor: primaryColor },
                  ]}
                />
                <View
                  style={[
                    styles.cornerContainer,
                    styles.topRight,
                    { borderColor: primaryColor },
                  ]}
                />
                <View
                  style={[
                    styles.cornerContainer,
                    styles.bottomLeft,
                    { borderColor: primaryColor },
                  ]}
                />
                <View
                  style={[
                    styles.cornerContainer,
                    styles.bottomRight,
                    { borderColor: primaryColor },
                  ]}
                />
              </>
            )}
            {children}
          </View>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// DECORATIVE ELEMENTS
// ============================================================================

const ornamentStyles = StyleSheet.create({
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.medium,
  },
  diamond: {
    width: 8,
    height: 8,
    backgroundColor: colors.border.dark,
    transform: "rotate(45deg)",
    marginHorizontal: spacing.md,
  },
  seal: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.border.dark,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.md,
  },
  sealInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
});

export interface CertificateDividerProps {
  /** Primary color for the divider */
  primaryColor?: string;
}

/**
 * Decorative divider with diamond accent
 *
 * @example
 * <CertificateDivider primaryColor="#1e3a5f" />
 */
export function CertificateDivider({ primaryColor = colors.border.dark }: CertificateDividerProps) {
  return (
    <View style={ornamentStyles.divider}>
      <View style={[ornamentStyles.line, { backgroundColor: primaryColor }]} />
      <View style={[ornamentStyles.diamond, { backgroundColor: primaryColor }]} />
      <View style={[ornamentStyles.line, { backgroundColor: primaryColor }]} />
    </View>
  );
}

export interface CertificateSealProps {
  /** Primary color for the seal */
  primaryColor?: string;
}

/**
 * Decorative seal element for certificates
 *
 * @example
 * <CertificateSeal primaryColor="#1e3a5f" />
 */
export function CertificateSeal({ primaryColor = colors.border.dark }: CertificateSealProps) {
  return (
    <View style={[ornamentStyles.seal, { borderColor: primaryColor }]}>
      <View style={[ornamentStyles.sealInner, { borderColor: primaryColor }]} />
    </View>
  );
}
