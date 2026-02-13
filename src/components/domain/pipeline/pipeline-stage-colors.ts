/**
 * Pipeline Stage Colors
 *
 * Theme-aware color configuration for pipeline stages.
 * Uses design system semantic colors converted to hex for inline styles.
 *
 * @see docs/design-system/MASTER.md - Color Palette
 */

import type { OpportunityStage } from "@/lib/schemas/pipeline";

/**
 * Stage color configuration using design system colors.
 * Colors are in hex format for use in inline styles (kanban component requirement).
 *
 * Light mode colors (primary):
 * - new: slate-500 (#64748b) - Neutral
 * - qualified: blue-500 (#3b82f6) - Info
 * - proposal: indigo-500 (#6366f1) - Info variant
 * - negotiation: violet-500 (#8b5cf6) - Info variant
 * - won: emerald-500 (#10b981) - Success (using emerald instead of green for design system alignment)
 * - lost: slate-500 (#64748b) - Neutral
 */
export const PIPELINE_STAGE_COLORS: Record<OpportunityStage, string> = {
  new: "#64748b", // slate-500 - Neutral
  qualified: "#3b82f6", // blue-500 - Info
  proposal: "#6366f1", // indigo-500 - Info variant
  negotiation: "#8b5cf6", // violet-500 - Info variant
  won: "#10b981", // emerald-500 - Success (design system uses emerald, not green)
  lost: "#64748b", // slate-500 - Neutral
} as const;

/**
 * Tag color configuration for opportunity card tags.
 * Uses design system status colors.
 */
export const PIPELINE_TAG_COLORS = {
  stale: "#94a3b8", // slate-400 - Muted warning
  overdue: "#ef4444", // red-500 - Danger
  expiring: "#f59e0b", // amber-500 - Warning
  expired: "#ef4444", // red-500 - Danger
} as const;
