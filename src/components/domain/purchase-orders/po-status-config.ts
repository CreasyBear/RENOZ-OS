/**
 * Purchase Order Status Configuration
 *
 * Status badge configurations for purchase order statuses.
 * Uses semantic colors from @/lib/status for consistency across React, PDF, and Email.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import {
  FileEdit,
  Clock,
  CheckCircle,
  Truck,
  Package,
  PackageCheck,
  XCircle,
  Archive,
} from "lucide-react";
import type { SemanticStatusConfigItem } from "@/components/shared/data-table";
import type { StatusConfig } from "@/components/shared/status-badge";
import type { SemanticColor } from "@/lib/status";
import type { PurchaseOrderStatus } from "@/lib/schemas/purchase-orders";

/**
 * Purchase order status configuration for StatusCell
 */
export const PO_STATUS_CONFIG: Record<PurchaseOrderStatus, SemanticStatusConfigItem> = {
  draft: {
    label: "Draft",
    color: "draft",
    icon: FileEdit,
  },
  pending_approval: {
    label: "Pending Approval",
    color: "pending",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "info",
    icon: CheckCircle,
  },
  ordered: {
    label: "Ordered",
    color: "info",
    icon: Truck,
  },
  partial_received: {
    label: "Partial",
    color: "warning",
    icon: Package,
  },
  received: {
    label: "Received",
    color: "success",
    icon: PackageCheck,
  },
  closed: {
    label: "Closed",
    color: "inactive",
    icon: Archive,
  },
  cancelled: {
    label: "Cancelled",
    color: "error",
    icon: XCircle,
  },
};

/**
 * PO status config for EntityHeader (StatusBadge format: variant + label)
 */
export const PO_STATUS_CONFIG_FOR_ENTITY_HEADER: StatusConfig = Object.fromEntries(
  Object.entries(PO_STATUS_CONFIG).map(([k, v]) => [
    k,
    { variant: v.color as SemanticColor, label: v.label },
  ])
) as StatusConfig;

/**
 * Check if receiving goods is allowed for this PO status
 */
export function canReceiveGoods(status: PurchaseOrderStatus): boolean {
  return status === "ordered" || status === "partial_received";
}

/**
 * Check if PO can be edited (only draft status)
 */
export function canEditPO(status: PurchaseOrderStatus): boolean {
  return status === "draft";
}

/**
 * Check if PO can be deleted (only draft status)
 */
export function canDeletePO(status: PurchaseOrderStatus): boolean {
  return status === "draft";
}
