/**
 * Opportunity Stage Configuration
 *
 * Stage badge configurations for opportunities.
 * Used with StatusCell component from shared data-table cells.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import {
  Sparkles,
  CheckCircle2,
  FileText,
  Handshake,
  Trophy,
  XCircle,
} from "lucide-react";
import type { SemanticStatusConfigItem } from "@/components/shared/data-table";
import type { OpportunityStage } from "@/lib/schemas/pipeline";

/**
 * Opportunity stage configuration for StatusCell
 *
 * Uses semantic colors for consistent meaning:
 * - new: draft (new/initial state)
 * - qualified: info (positive progress)
 * - proposal: progress (active work)
 * - negotiation: progress (active work)
 * - won: success (positive outcome)
 * - lost: error (negative outcome)
 */
export const OPPORTUNITY_STAGE_CONFIG: Record<OpportunityStage, SemanticStatusConfigItem> = {
  new: {
    label: "New",
    color: "draft",
    icon: Sparkles,
  },
  qualified: {
    label: "Qualified",
    color: "info",
    icon: CheckCircle2,
  },
  proposal: {
    label: "Proposal",
    color: "progress",
    icon: FileText,
  },
  negotiation: {
    label: "Negotiation",
    color: "progress",
    icon: Handshake,
  },
  won: {
    label: "Won",
    color: "success",
    icon: Trophy,
  },
  lost: {
    label: "Lost",
    color: "error",
    icon: XCircle,
  },
};

/**
 * Stage colors for custom styling (matching original STAGE_CONFIG)
 */
export const STAGE_COLORS: Record<
  OpportunityStage,
  { color: string; bgColor: string }
> = {
  new: {
    color: "text-slate-700",
    bgColor: "bg-slate-100",
  },
  qualified: {
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  proposal: {
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  negotiation: {
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  won: {
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  lost: {
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
};

/**
 * Default probability values per stage
 */
export const STAGE_PROBABILITY_DEFAULTS: Record<OpportunityStage, number> = {
  new: 10,
  qualified: 30,
  proposal: 60,
  negotiation: 80,
  won: 100,
  lost: 0,
};

/**
 * Check if an opportunity is overdue based on expected close date
 */
export function isOpportunityOverdue(
  expectedCloseDate: Date | string | null | undefined
): boolean {
  if (!expectedCloseDate) return false;
  const date =
    typeof expectedCloseDate === "string"
      ? new Date(expectedCloseDate)
      : expectedCloseDate;
  return date < new Date();
}

/**
 * Format expected close date with relative indicator
 */
export function formatExpectedCloseDateRelative(
  expectedCloseDate: Date | string | null | undefined
): { text: string; isOverdue: boolean } {
  if (!expectedCloseDate) return { text: "Not set", isOverdue: false };

  const date =
    typeof expectedCloseDate === "string"
      ? new Date(expectedCloseDate)
      : expectedCloseDate;
  const now = new Date();
  const isOver = date < now;

  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (isOver) {
    return {
      text: `${Math.abs(diffDays)}d overdue`,
      isOverdue: true,
    };
  }

  if (diffDays === 0) return { text: "Today", isOverdue: false };
  if (diffDays === 1) return { text: "Tomorrow", isOverdue: false };
  if (diffDays <= 7) return { text: `${diffDays}d`, isOverdue: false };

  return {
    text: date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    isOverdue: false,
  };
}
