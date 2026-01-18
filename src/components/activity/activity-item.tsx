/**
 * Activity Item Component
 *
 * Displays a single activity with action icon, user attribution,
 * timestamp, and expandable change details.
 *
 * @see ACTIVITY-FEED-UI acceptance criteria
 */

import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  Share2,
  UserPlus,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Shield,
  AlertCircle,
  Mail,
  MailOpen,
  MousePointerClick,
  Phone,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChangeDiff } from "./change-diff";
import type {
  ActivityWithUser,
  ActivityAction,
  ActivityEntityType,
} from "@/lib/schemas/activities";
import { formatDistanceToNow, format } from "date-fns";

// ============================================================================
// ICON & COLOR MAPPINGS
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
  user: User,
  call: Phone,
  email: Mail,
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
  user: "User",
  call: "Call",
  email: "Email",
};

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityItemProps {
  activity: ActivityWithUser;
  /** Show compact view without expandable details */
  compact?: boolean;
  /** Custom link generator for entity - defaults to standard routes */
  getEntityLink?: (entityType: ActivityEntityType, entityId: string) => string;
  className?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

function getDefaultEntityLink(entityType: ActivityEntityType, entityId: string): string {
  // Map entity types to routes
  const routeMap: Partial<Record<ActivityEntityType, string>> = {
    customer: `/customers/${entityId}`,
    contact: `/contacts/${entityId}`,
    order: `/orders/${entityId}`,
    opportunity: `/pipeline/${entityId}`,
    product: `/products/${entityId}`,
    supplier: `/suppliers/${entityId}`,
    warranty: `/warranties/${entityId}`,
  };
  return routeMap[entityType] ?? "#";
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ActionIcon({ action }: { action: ActivityAction }) {
  const Icon = ACTION_ICONS[action];
  const colorClass = ACTION_COLORS[action];

  return (
    <div
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full shrink-0",
        colorClass
      )}
      aria-label={`${action} action`}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </div>
  );
}

function UserAttribution({
  user,
}: {
  user: { id: string; name: string | null; email: string } | null;
}) {
  if (!user) {
    return (
      <span className="text-muted-foreground text-sm flex items-center gap-1.5">
        <Avatar className="w-5 h-5">
          <AvatarFallback className="text-[10px] bg-muted">SYS</AvatarFallback>
        </Avatar>
        System
      </span>
    );
  }

  return (
    <span className="text-sm flex items-center gap-1.5">
      <Avatar className="w-5 h-5">
        <AvatarFallback className="text-[10px]">
          {getInitials(user.name, user.email)}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">{user.name ?? user.email}</span>
    </span>
  );
}

function EntityLink({
  entityType,
  entityId,
  getLink,
}: {
  entityType: ActivityEntityType;
  entityId: string;
  getLink?: (entityType: ActivityEntityType, entityId: string) => string;
}) {
  const Icon = ENTITY_ICONS[entityType];
  const label = ENTITY_LABELS[entityType];
  const href = getLink?.(entityType, entityId) ?? getDefaultEntityLink(entityType, entityId);

  return (
    <Link
      to={href}
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays a single activity with user attribution, action icon, and expandable changes.
 *
 * @example
 * ```tsx
 * <ActivityItem
 *   activity={{
 *     id: "...",
 *     action: "updated",
 *     entityType: "customer",
 *     entityId: "...",
 *     user: { id: "...", name: "John Doe", email: "john@example.com" },
 *     changes: { before: {...}, after: {...}, fields: ["status"] },
 *     createdAt: new Date(),
 *   }}
 * />
 * ```
 */
export function ActivityItem({
  activity,
  compact = false,
  getEntityLink,
  className,
}: ActivityItemProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasChanges = activity.changes && activity.changes.fields?.length;

  const createdAt = new Date(activity.createdAt);
  const relativeTime = formatDistanceToNow(createdAt, { addSuffix: true });
  const absoluteTime = format(createdAt, "PPpp");

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors",
          className
        )}
      >
        <ActionIcon action={activity.action} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <UserAttribution user={activity.user} />
            <span className="text-muted-foreground text-sm">{activity.action}</span>
            <EntityLink
              entityType={activity.entityType}
              entityId={activity.entityId}
              getLink={getEntityLink}
            />
          </div>
          {activity.description && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {activity.description}
            </p>
          )}
        </div>
        <time
          className="text-xs text-muted-foreground shrink-0"
          dateTime={createdAt.toISOString()}
          title={absoluteTime}
        >
          {relativeTime}
        </time>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "group py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors",
          className
        )}
      >
        {/* Main row */}
        <div className="flex items-start gap-3">
          <ActionIcon action={activity.action} />

          <div className="flex-1 min-w-0 space-y-1">
            {/* Header line */}
            <div className="flex items-center gap-2 flex-wrap">
              <UserAttribution user={activity.user} />
              <Badge variant="outline" className="font-normal text-xs">
                {activity.action}
              </Badge>
              <EntityLink
                entityType={activity.entityType}
                entityId={activity.entityId}
                getLink={getEntityLink}
              />
            </div>

            {/* Description */}
            {activity.description && (
              <p className="text-sm text-muted-foreground">{activity.description}</p>
            )}

            {/* Changes summary */}
            {hasChanges && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? "Hide changes" : "Show changes"}
                >
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  )}
                  {activity.changes!.fields!.length} field
                  {activity.changes!.fields!.length === 1 ? "" : "s"} changed
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          {/* Timestamp */}
          <time
            className="text-xs text-muted-foreground shrink-0"
            dateTime={createdAt.toISOString()}
            title={absoluteTime}
          >
            {relativeTime}
          </time>
        </div>

        {/* Expandable changes */}
        {hasChanges && (
          <CollapsibleContent className="mt-3 ml-11">
            <div className="border rounded-lg p-3 bg-muted/30">
              <ChangeDiff changes={activity.changes} compact />
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

