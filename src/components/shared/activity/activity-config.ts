/**
 * Activity Configuration
 *
 * Centralized configuration for activity icons, colors, and labels.
 * Single source of truth for all activity-related UI mappings.
 */

import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  Share2,
  UserPlus,
  MessageSquare,
  Mail,
  MailOpen,
  MousePointerClick,
  Phone,
  FileText,
  User,
  Building2,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Shield,
  AlertCircle,
  MapPin,
  Wrench,
  Camera,
  ClipboardCheck,
  ScrollText,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { ActivityAction, ActivityEntityType } from "@/lib/schemas/activities";

// ============================================================================
// ACTION MAPPINGS
// ============================================================================

export const ACTION_ICONS: Record<ActivityAction, LucideIcon> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  viewed: Eye,
  exported: Download,
  shared: Share2,
  assigned: UserPlus,
  commented: MessageSquare,
  email_sent: Mail,
  email_opened: MailOpen,
  email_clicked: MousePointerClick,
  call_logged: Phone,
  note_added: FileText,
};

export const ACTION_COLORS: Record<ActivityAction, string> = {
  created: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  updated: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  deleted: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  viewed: "text-gray-600 bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400",
  exported: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
  shared: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400",
  assigned: "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
  commented: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400",
  email_sent: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  email_opened: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  email_clicked: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
  call_logged: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400",
  note_added: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
};

export const ACTION_LABELS: Record<ActivityAction, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  viewed: "Viewed",
  exported: "Exported",
  shared: "Shared",
  assigned: "Assigned",
  commented: "Commented",
  email_sent: "Email Sent",
  email_opened: "Email Opened",
  email_clicked: "Email Clicked",
  call_logged: "Call Logged",
  note_added: "Note Added",
};

// ============================================================================
// ENTITY MAPPINGS
// ============================================================================

export const ENTITY_ICONS: Record<ActivityEntityType, LucideIcon> = {
  customer: Building2,
  contact: User,
  order: ShoppingCart,
  opportunity: ShoppingCart,
  product: Package,
  inventory: Boxes,
  supplier: Truck,
  warranty: Shield,
  issue: AlertCircle,
  rma: Package,
  user: User,
  call: Phone,
  email: Mail,
  project: FileText,
  workstream: FileText,
  task: FileText,
  purchase_order: ShoppingCart,
  shipment: Package,
  quote: FileText,
  // Jobs/Projects domain
  site_visit: MapPin,
  job_assignment: Wrench,
  job_material: Boxes,
  job_photo: Camera,
  // Warranty domain
  warranty_claim: ClipboardCheck,
  warranty_policy: ScrollText,
  warranty_extension: Clock,
};

export const ENTITY_LABELS: Record<ActivityEntityType, string> = {
  customer: "Customer",
  contact: "Contact",
  order: "Order",
  opportunity: "Opportunity",
  product: "Product",
  inventory: "Inventory",
  supplier: "Supplier",
  warranty: "Warranty",
  issue: "Issue",
  rma: "RMA",
  user: "User",
  call: "Call",
  email: "Email",
  project: "Project",
  workstream: "Workstream",
  task: "Task",
  purchase_order: "Purchase Order",
  shipment: "Shipment",
  quote: "Quote",
  // Jobs/Projects domain
  site_visit: "Site Visit",
  job_assignment: "Job Assignment",
  job_material: "Job Material",
  job_photo: "Job Photo",
  // Warranty domain
  warranty_claim: "Warranty Claim",
  warranty_policy: "Warranty Policy",
  warranty_extension: "Warranty Extension",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the icon for an activity action.
 */
export function getActionIcon(action: ActivityAction): LucideIcon {
  return ACTION_ICONS[action] ?? FileText;
}

/**
 * Get the color classes for an activity action.
 */
export function getActionColor(action: ActivityAction): string {
  return ACTION_COLORS[action] ?? "text-gray-600 bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400";
}

/**
 * Get the icon for an entity type.
 */
export function getEntityIcon(entityType: ActivityEntityType): LucideIcon {
  return ENTITY_ICONS[entityType] ?? FileText;
}

/**
 * Get the label for an entity type.
 */
export function getEntityLabel(entityType: ActivityEntityType): string {
  return ENTITY_LABELS[entityType] ?? entityType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format an activity action for display.
 */
export function formatActivityAction(action: ActivityAction): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
