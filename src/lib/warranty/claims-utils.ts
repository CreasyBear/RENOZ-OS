/**
 * Warranty claim display utilities.
 */

import type {
  WarrantyClaimStatusValue,
  WarrantyClaimTypeValue,
  WarrantyClaimResolutionTypeValue,
} from '@/lib/schemas/warranty/claims';
import type { SemanticColor } from '@/lib/status';

/**
 * Semantic status config for warranty claims.
 * Uses the semantic color system for consistency across React, PDF, and Email.
 * Compatible with StatusBadge component.
 */
export const claimStatusConfig: Record<
  WarrantyClaimStatusValue,
  { label: string; variant: SemanticColor }
> = {
  submitted: { label: 'Submitted', variant: 'info' },
  under_review: { label: 'Under Review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  denied: { label: 'Denied', variant: 'error' },
  resolved: { label: 'Resolved', variant: 'success' },
};

export const claimTypeConfig: Record<
  WarrantyClaimTypeValue,
  { label: string; description: string }
> = {
  cell_degradation: { label: 'Cell Degradation', description: 'Battery cell performance decline' },
  bms_fault: { label: 'BMS Fault', description: 'Battery Management System malfunction' },
  inverter_failure: { label: 'Inverter Failure', description: 'Inverter malfunction or failure' },
  installation_defect: {
    label: 'Installation Defect',
    description: 'Workmanship or installation issue',
  },
  other: { label: 'Other', description: 'Other warranty issues' },
};

export const resolutionTypeConfig: Record<
  WarrantyClaimResolutionTypeValue,
  { label: string; description: string; color: string }
> = {
  repair: {
    label: 'Repair',
    description: 'Fix the existing unit',
    color: 'bg-blue-100 text-blue-700',
  },
  replacement: {
    label: 'Replace',
    description: 'Provide a replacement unit',
    color: 'bg-purple-100 text-purple-700',
  },
  refund: {
    label: 'Refund',
    description: 'Full or partial refund',
    color: 'bg-green-100 text-green-700',
  },
  warranty_extension: {
    label: 'Warranty Extension',
    description: 'Extend warranty period',
    color: 'bg-orange-100 text-orange-700',
  },
};

/**
 * Format date for display (Australian format DD/MM/YYYY).
 */
export function formatClaimDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format date with time for timeline display.
 */
export function formatClaimDateTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format currency for display (AUD).
 */
export function formatClaimCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined) return '-';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cost);
}

/**
 * SLA due status result
 */
export interface SlaDueStatus {
  status: 'on_track' | 'at_risk' | 'breached' | 'completed';
  label: string;
  color: string;
  timeRemaining?: number; // seconds
  percentComplete?: number;
}

/**
 * Get SLA due status based on due date and completion state.
 * @param dueAt - The SLA deadline
 * @param completedAt - When the SLA target was met (null if not yet met)
 * @param atRiskThresholdPercent - Percentage of time remaining to consider "at risk" (default 25%)
 */
export function getSlaDueStatus(
  dueAt: Date | string | null,
  completedAt: Date | string | null,
  startedAt?: Date | string | null,
  atRiskThresholdPercent = 25
): SlaDueStatus {
  // If no due date, return completed status
  if (!dueAt) {
    return {
      status: 'completed',
      label: 'No SLA',
      color: 'text-muted-foreground',
    };
  }

  const dueDate = typeof dueAt === 'string' ? new Date(dueAt) : dueAt;
  const now = new Date();

  // If already completed
  if (completedAt) {
    const completedDate = typeof completedAt === 'string' ? new Date(completedAt) : completedAt;
    const wasBreached = completedDate > dueDate;
    return {
      status: wasBreached ? 'breached' : 'completed',
      label: wasBreached ? 'Completed (Late)' : 'Completed',
      color: wasBreached ? 'text-red-600' : 'text-green-600',
    };
  }

  // Calculate time remaining
  const timeRemaining = Math.floor((dueDate.getTime() - now.getTime()) / 1000);

  // If past due
  if (timeRemaining < 0) {
    return {
      status: 'breached',
      label: 'Overdue',
      color: 'text-red-600',
      timeRemaining,
    };
  }

  // Calculate percent complete if we have a start date
  let percentComplete: number | undefined;
  if (startedAt) {
    const startDate = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
    const totalDuration = dueDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    percentComplete = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }

  // Check if at risk (less than threshold percent of time remaining)
  const totalDurationFromNow = dueDate.getTime() - now.getTime();
  const atRiskThreshold = startedAt
    ? (dueDate.getTime() - new Date(startedAt).getTime()) * (atRiskThresholdPercent / 100)
    : 0;

  if (totalDurationFromNow < atRiskThreshold) {
    return {
      status: 'at_risk',
      label: 'At Risk',
      color: 'text-yellow-600',
      timeRemaining,
      percentComplete,
    };
  }

  return {
    status: 'on_track',
    label: 'On Track',
    color: 'text-green-600',
    timeRemaining,
    percentComplete,
  };
}
