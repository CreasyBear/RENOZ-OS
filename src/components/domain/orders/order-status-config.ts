/**
 * Order Status Configuration
 *
 * Status badge configurations for order and payment statuses.
 * Uses semantic colors from @/lib/status for consistency across React, PDF, and Email.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import {
  Clock,
  CheckCircle,
  Package,
  PackageCheck,
  Truck,
  XCircle,
  FileEdit,
  AlertCircle,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SemanticStatusConfigItem } from "@/components/shared/data-table";
import type { OrderStatus, PaymentStatus } from "@/lib/schemas/orders";

// ============================================================================
// DETAIL VIEW STATUS CONFIG (with Tailwind classes)
// ============================================================================

export interface DetailStatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

/**
 * Order status configuration for detail views
 * Uses direct Tailwind classes for fine-grained control
 */
export const ORDER_STATUS_DETAIL_CONFIG: Record<OrderStatus, DetailStatusConfig> = {
  draft: {
    label: 'Draft',
    color: 'bg-secondary text-secondary-foreground',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    icon: CheckCircle,
  },
  picking: {
    label: 'Picking',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    icon: Package,
  },
  picked: {
    label: 'Picked',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
    icon: Package,
  },
  partially_shipped: {
    label: 'Partially Shipped',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    icon: PackageCheck,
  },
  shipped: {
    label: 'Shipped',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-destructive/10 text-destructive',
    icon: XCircle,
  },
};

// ============================================================================
// TABLE STATUS CONFIG (with semantic colors)
// ============================================================================

/**
 * Order status configuration for StatusCell
 */
export const ORDER_STATUS_CONFIG: Record<OrderStatus, SemanticStatusConfigItem> = {
  draft: {
    label: "Draft",
    color: "draft",
    icon: FileEdit,
  },
  confirmed: {
    label: "Confirmed",
    color: "info",
    icon: CheckCircle,
  },
  picking: {
    label: "Picking",
    color: "progress",
    icon: Package,
  },
  picked: {
    label: "Picked",
    color: "info",
    icon: Package,
  },
  partially_shipped: {
    label: "Partially Shipped",
    color: "warning",
    icon: PackageCheck,
  },
  shipped: {
    label: "Shipped",
    color: "info",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "success",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "error",
    icon: XCircle,
  },
};

/**
 * Payment status configuration for StatusCell
 */
export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, SemanticStatusConfigItem> = {
  pending: {
    label: "Pending",
    color: "neutral",
    icon: Clock,
  },
  partial: {
    label: "Partial",
    color: "warning",
    icon: DollarSign,
  },
  paid: {
    label: "Paid",
    color: "success",
    icon: CheckCircle,
  },
  overdue: {
    label: "Overdue",
    color: "error",
    icon: AlertCircle,
  },
  refunded: {
    label: "Refunded",
    color: "inactive",
    icon: RefreshCw,
  },
};

/**
 * Check if an order's due date is overdue
 */
export function isOrderOverdue(dueDate: string | Date | null | undefined): boolean {
  if (!dueDate) return false;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return due < new Date();
}

/**
 * Format due date with relative indicator for display
 */
export function formatDueDateRelative(
  dueDate: string | Date | null | undefined
): { text: string; isOverdue: boolean } {
  if (!dueDate) return { text: "—", isOverdue: false };

  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const now = new Date();
  const isOver = due < now;

  const diffMs = due.getTime() - now.getTime();
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
    text: due.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    isOverdue: false,
  };
}
