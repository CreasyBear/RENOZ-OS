/**
 * PDF Icon Components
 *
 * Lucide-style icons converted to react-pdf Svg components.
 * Use for headers, footers, and inline indicators.
 *
 * @see .claude/skills/react-pdf/SKILL.md - Using Icons
 */

import { Svg, Path, Rect } from "@react-pdf/renderer";

// ============================================================================
// ICON PROPS
// ============================================================================

export interface PdfIconProps {
  size?: number;
  color?: string;
}

// ============================================================================
// MAIL ICON
// ============================================================================

export function MailIcon({ size = 12, color = "#636366" }: PdfIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      <Rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}

// ============================================================================
// CHECK ICON
// ============================================================================

export function CheckIcon({ size = 12, color = "#34C759" }: PdfIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20 6 9 17l-5-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ============================================================================
// FILE TEXT ICON
// ============================================================================

export function FileTextIcon({ size = 12, color = "#636366" }: PdfIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      <Path d="M14 2v6h6" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M16 13H8" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M16 17H8" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M10 9H8" stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

// ============================================================================
// EXTERNAL LINK ICON
// ============================================================================

export function ExternalLinkIcon({ size = 12, color = "#007AFF" }: PdfIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M15 3h6v6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M10 14 21 3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
