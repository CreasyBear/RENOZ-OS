/**
 * Project Status Configuration
 *
 * Status and priority badge configurations for projects.
 * Used with StatusCell component from shared data-table cells.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import {
  FileEdit,
  CheckCircle,
  Play,
  XCircle,
  PauseCircle,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
} from "lucide-react";
import type { SemanticStatusConfigItem } from "@/components/shared/data-table";
import type { ProjectStatus, ProjectPriority } from "@/lib/schemas/jobs/projects";

/**
 * Project status configuration for StatusCell
 */
export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, SemanticStatusConfigItem & { variant: SemanticStatusConfigItem['color'] }> = {
  quoting: {
    label: "Quoting",
    color: "draft",
    variant: "draft",
    icon: FileEdit,
  },
  approved: {
    label: "Approved",
    color: "info",
    variant: "info",
    icon: CheckCircle,
  },
  in_progress: {
    label: "In Progress",
    color: "progress",
    variant: "progress",
    icon: Play,
  },
  completed: {
    label: "Completed",
    color: "success",
    variant: "success",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "error",
    variant: "error",
    icon: XCircle,
  },
  on_hold: {
    label: "On Hold",
    color: "warning",
    variant: "warning",
    icon: PauseCircle,
  },
};

/**
 * Project priority configuration for StatusCell
 */
export const PROJECT_PRIORITY_CONFIG: Record<ProjectPriority, SemanticStatusConfigItem> = {
  urgent: {
    label: "Urgent",
    color: "error",
    icon: AlertTriangle,
  },
  high: {
    label: "High",
    color: "warning",
    icon: ArrowUp,
  },
  medium: {
    label: "Medium",
    color: "neutral",
    icon: Minus,
  },
  low: {
    label: "Low",
    color: "info",
    icon: ArrowDown,
  },
};

/**
 * Check if a project's target completion date is overdue
 */
export function isProjectOverdue(
  targetDate: string | Date | null | undefined,
  status: ProjectStatus
): boolean {
  // Completed or cancelled projects are not overdue
  if (status === "completed" || status === "cancelled") return false;
  if (!targetDate) return false;
  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  return target < new Date();
}

/**
 * Format target date with relative indicator for display
 */
export function formatTargetDateRelative(
  targetDate: string | Date | null | undefined,
  status: ProjectStatus
): { text: string; isOverdue: boolean } {
  if (!targetDate) return { text: "—", isOverdue: false };

  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  const now = new Date();
  const isOver = isProjectOverdue(targetDate, status);

  const diffMs = target.getTime() - now.getTime();
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
    text: target.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    isOverdue: false,
  };
}

/**
 * Format project type for display
 */
export function formatProjectType(projectType: string): string {
  return projectType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
