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
  ChevronDown,
  ChevronRight,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChangeDiff } from "./change-diff";
import {
  ACTION_ICONS,
  ACTION_COLORS,
  ENTITY_ICONS,
  ENTITY_LABELS,
} from "./activity-config";
import type {
  ActivityWithUser,
  ActivityAction,
  ActivityEntityType,
} from "@/lib/schemas/activities";
import { isActivityMetadata } from "@/lib/schemas/activities";
import { formatDistanceToNow, format } from "date-fns";

type MetadataEntry = {
  key: string;
  label: string;
  value: string;
  isComplex: boolean;
};

type QuickLink = {
  label: string;
  href: string;
  icon: typeof Mail;
};

type RelatedEntity = {
  entityType: ActivityEntityType;
  entityId: string;
  entityName?: string | null;
};

const METADATA_SUMMARY_KEYS = [
  "reason",
  "status",
  "assignedTo",
  "assignedBy",
  "channel",
  "source",
  "sourceRef",
  "customerName", // Prefer resolved name over UUID
  "customerId",
  "orderNumber", // Prefer resolved name over UUID
  "orderId",
  "opportunityTitle", // Prefer resolved name over UUID
  "opportunityId",
  "amount",
  "total",
  "count",
];

// UUID fields that should be hidden if resolved names exist
const METADATA_UUID_FIELDS = new Set(["customerId", "orderId", "opportunityId"]);

const METADATA_HIDDEN_KEYS = new Set(["requestId", "activityKey"]);

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityItemProps {
  activity: ActivityWithUser;
  /** Show compact view without expandable details */
  compact?: boolean;
  /** Custom link generator for entity - defaults to standard routes */
  getEntityLink?: (entityType: ActivityEntityType, entityId: string) => string | null;
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

function formatMetadataKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMetadataValue(value: unknown): { text: string; isComplex: boolean } {
  if (value == null) {
    return { text: "—", isComplex: false };
  }
  if (typeof value === "string") {
    return { text: value, isComplex: false };
  }
  if (typeof value === "number") {
    return { text: Number.isFinite(value) ? value.toString() : "—", isComplex: false };
  }
  if (typeof value === "boolean") {
    return { text: value ? "Yes" : "No", isComplex: false };
  }
  if (Array.isArray(value)) {
    const allPrimitive = value.every(
      (item) => item == null || ["string", "number", "boolean"].includes(typeof item)
    );
    if (allPrimitive) {
      return { text: value.filter((item) => item != null).join(", "), isComplex: false };
    }
    return { text: `${value.length} items`, isComplex: true };
  }
  try {
    const text = JSON.stringify(value);
    return { text: text.length > 120 ? `${text.slice(0, 117)}...` : text, isComplex: true };
  } catch {
    return { text: "Object", isComplex: true };
  }
}

function getMetadataEntries(metadata: ActivityWithUser["metadata"]): MetadataEntry[] {
  if (!metadata || !isActivityMetadata(metadata)) return [];

  // metadata is validated as ActivityMetadata via type guard
  const metadataObj = metadata;

  // Check which resolved names exist
  const hasCustomerName = !!metadataObj.customerName;
  const hasOrderNumber = !!metadataObj.orderNumber;
  const hasOpportunityTitle = !!metadataObj.opportunityTitle;

  return Object.entries(metadataObj)
    .filter(([key]) => {
      // Always hide hidden keys
      if (METADATA_HIDDEN_KEYS.has(key)) return false;

      // Hide UUID fields if resolved names exist
      if (METADATA_UUID_FIELDS.has(key)) {
        if (key === "customerId" && hasCustomerName) return false;
        if (key === "orderId" && hasOrderNumber) return false;
        if (key === "opportunityId" && hasOpportunityTitle) return false;
      }

      return true;
    })
    .map(([key, value]) => {
      const formatted = formatMetadataValue(value);
      return {
        key,
        label: formatMetadataKey(key),
        value: formatted.text,
        isComplex: formatted.isComplex,
      };
    });
}

function getMetadataSummary(entries: MetadataEntry[]): MetadataEntry[] {
  const preferred = entries.filter(
    (entry) => METADATA_SUMMARY_KEYS.includes(entry.key) && !entry.isComplex
  );
  const fallback = entries.filter((entry) => !entry.isComplex);
  const combined = [...preferred, ...fallback];
  const unique: MetadataEntry[] = [];
  combined.forEach((entry) => {
    if (!unique.find((item) => item.key === entry.key)) {
      unique.push(entry);
    }
  });
  return unique.slice(0, 3);
}

// Import centralized utility instead of duplicating route mapping
import { getEntityLink } from '@/lib/activities/activity-navigation';

function buildRelatedEntities(
  activity: ActivityWithUser
): RelatedEntity[] {
  // metadata is already typed as ActivityMetadata | null from ActivityWithUser
  const metadata = activity.metadata ?? null;
  if (!metadata) return [];
  
  const related: RelatedEntity[] = [];

  const pushRelated = (
    entityType: ActivityEntityType,
    entityId?: unknown,
    entityName?: unknown
  ) => {
    if (typeof entityId !== "string" || !entityId) return;
    if (activity.entityType === entityType && activity.entityId === entityId) return;
    if (!getEntityLink(entityType, entityId)) return;
    related.push({
      entityType,
      entityId,
      entityName: typeof entityName === "string" ? entityName : null,
    });
  };

  pushRelated("customer", metadata.customerId, metadata.customerName);
  pushRelated("order", metadata.orderId, metadata.orderNumber);
  pushRelated("opportunity", metadata.opportunityId, metadata.opportunityTitle);
  pushRelated("project", metadata.projectId, metadata.projectTitle);
  pushRelated("product", metadata.productId, metadata.productName);
  pushRelated("warranty", metadata.warrantyId, metadata.warrantyNumber);

  return related;
}

function buildCommsActions(activity: ActivityWithUser): QuickLink[] {
  // metadata is already typed as ActivityMetadata | null from ActivityWithUser
  const metadata = activity.metadata ?? {};
  const actions: QuickLink[] = [];

  const customerId = typeof metadata.customerId === "string" ? metadata.customerId : null;
  const hasEmailContext =
    typeof metadata.emailId === "string" || typeof metadata.recipientEmail === "string";
  const hasCallContext = typeof metadata.callId === "string";

  if (customerId) {
    actions.push({
      label: "Email customer",
      href: `/communications/emails?customerId=${customerId}`,
      icon: Mail,
    });
  }

  if (hasEmailContext) {
    actions.push({
      label: "Email history",
      href: "/communications/emails/history",
      icon: Mail,
    });
  }

  if (hasCallContext) {
    actions.push({
      label: "Scheduled calls",
      href: "/communications/calls",
      icon: Phone,
    });
  }

  return actions;
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
        "flex items-center justify-center size-6 rounded-md shrink-0 transition-colors duration-200",
        colorClass
      )}
      aria-label={`${action} action`}
      role="img"
    >
      <Icon className="size-3" aria-hidden="true" />
    </div>
  );
}

function EntityLink({
  entityType,
  entityId,
  entityName,
  getLink,
}: {
  entityType: ActivityEntityType;
  entityId: string;
  entityName?: string | null;
  getLink?: (entityType: ActivityEntityType, entityId: string) => string | null;
}) {
  const Icon = ENTITY_ICONS[entityType] ?? FileText;
  const typeLabel = ENTITY_LABELS[entityType] ?? "Activity";
  // Use entity name if available, otherwise fall back to type label
  const displayLabel = entityName ?? typeLabel;
  const href = getLink?.(entityType, entityId) ?? getEntityLink(entityType, entityId);

  if (!href) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{displayLabel}</span>
        <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] font-normal">
          Link unavailable
        </Badge>
      </span>
    );
  }

  return (
    <Link
      to={href}
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{displayLabel}</span>
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
  const metadataEntries = React.useMemo(
    () => getMetadataEntries(activity.metadata),
    [activity.metadata]
  );
  const metadataSummary = React.useMemo(
    () => getMetadataSummary(metadataEntries),
    [metadataEntries]
  );
  const hasMetadata = metadataEntries.length > 0;
  const hasDetails = Boolean(hasChanges || hasMetadata);
  const relatedEntities = React.useMemo(
    () => buildRelatedEntities(activity),
    [activity]
  );
  const commsActions = React.useMemo(
    () => buildCommsActions(activity),
    [activity]
  );

  const createdAt = new Date(activity.createdAt);
  const relativeTime = formatDistanceToNow(createdAt, { addSuffix: true });
  const absoluteTime = format(createdAt, "PPpp");

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 py-2.5 px-4 hover:bg-muted/50 transition-colors duration-200",
          className
        )}
        role="article"
        aria-label={`Activity: ${activity.action} ${activity.entityType}`}
      >
        <ActionIcon action={activity.action} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Avatar className="size-5 shrink-0">
              <AvatarFallback className="text-[9px] bg-muted">
                {activity.user ? getInitials(activity.user.name, activity.user.email) : 'SYS'}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm truncate">
              {activity.user?.name ?? activity.user?.email ?? 'System'}
            </span>
            <Badge variant="outline" className="shrink-0 text-[10px] font-normal capitalize">
              {activity.action.replace(/_/g, " ")}
            </Badge>
            <EntityLink
              entityType={activity.entityType}
              entityId={activity.entityId}
              entityName={activity.entityName}
              getLink={getEntityLink}
            />
          </div>
          {activity.description && (
            <p className="text-xs text-muted-foreground truncate mt-1 ml-7">
              {activity.description}
            </p>
          )}
        </div>
        <time
          className="text-xs text-muted-foreground shrink-0 whitespace-nowrap"
          dateTime={createdAt.toISOString()}
          title={absoluteTime}
          aria-label={`Activity occurred ${relativeTime}`}
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
          "group py-3 px-4 hover:bg-muted/50 transition-colors duration-200",
          className
        )}
        role="article"
        aria-label={`Activity: ${activity.action} ${activity.entityType}`}
      >
        {/* Main row - fixed structure */}
        <div className="flex items-start gap-3">
          {/* Left: Action icon */}
          <ActionIcon action={activity.action} />

          {/* Center: Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Row 1: User + Action + Entity */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 shrink-0">
                <Avatar className="size-5">
                  <AvatarFallback className="text-[9px] bg-muted">
                    {activity.user ? getInitials(activity.user.name, activity.user.email) : 'SYS'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">
                  {activity.user?.name ?? activity.user?.email ?? 'System'}
                </span>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px] font-normal capitalize h-5">
                {activity.action.replace(/_/g, " ")}
              </Badge>
              <EntityLink
                entityType={activity.entityType}
                entityId={activity.entityId}
                entityName={activity.entityName}
                getLink={getEntityLink}
              />
            </div>

            {/* Row 2: Description */}
            {activity.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>
            )}

            {/* Row 3: Metadata badges */}
            {metadataSummary.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {metadataSummary.map((item) => (
                  <Badge
                    key={item.key}
                    variant="secondary"
                    className="text-[10px] font-normal h-5 bg-muted/60"
                    title={`${item.label}: ${item.value}`}
                  >
                    <span className="text-muted-foreground">{item.label}:</span>
                    <span className="ml-1 font-medium">{item.value}</span>
                  </Badge>
                ))}
              </div>
            )}

            {(relatedEntities.length > 0 || commsActions.length > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                {relatedEntities.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Related:</span>
                    {relatedEntities.map((entity) => (
                      <EntityLink
                        key={`${entity.entityType}-${entity.entityId}`}
                        entityType={entity.entityType}
                        entityId={entity.entityId}
                        entityName={entity.entityName}
                        getLink={getEntityLink}
                      />
                    ))}
                  </div>
                )}
                {commsActions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {commsActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <Link
                          key={action.label}
                          to={action.href}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "h-7 px-2.5 text-xs"
                          )}
                        >
                          <Icon className="mr-1.5 h-3.5 w-3.5" />
                          {action.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Row 4: Expand trigger */}
            {hasDetails && (
              <CollapsibleTrigger asChild>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? "Hide details" : "Show details"}
                >
                  {isOpen ? (
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  )}
                  {hasChanges
                    ? `${activity.changes!.fields!.length} field${activity.changes!.fields!.length === 1 ? "" : "s"} changed`
                    : `View ${metadataEntries.length} detail${metadataEntries.length === 1 ? "" : "s"}`}
                </button>
              </CollapsibleTrigger>
            )}
          </div>

          {/* Right: Timestamp */}
          <time
            className="text-xs text-muted-foreground shrink-0 whitespace-nowrap pt-0.5"
            dateTime={createdAt.toISOString()}
            title={absoluteTime}
            aria-label={`Activity occurred ${relativeTime}`}
          >
            {relativeTime}
          </time>
        </div>

        {/* Expandable details */}
        {hasDetails && (
          <CollapsibleContent className="mt-3 ml-9">
            <div className="space-y-3">
              {hasChanges && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <ChangeDiff changes={activity.changes} compact />
                </div>
              )}
              {hasMetadata && metadataEntries.length > metadataSummary.length && (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    All Metadata
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {metadataEntries.map((entry) => (
                      <div
                        key={entry.key}
                        className="rounded-md border bg-background/60 px-2.5 py-1.5"
                        title={entry.isComplex ? `${entry.label}: ${entry.value}` : undefined}
                      >
                        <div className="text-[10px] text-muted-foreground font-medium">
                          {entry.label}
                        </div>
                        <div className="break-words text-sm font-medium text-foreground">
                          {entry.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
