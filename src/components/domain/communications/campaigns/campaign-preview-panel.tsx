/**
 * CampaignPreviewPanel Component
 *
 * Shows preview of campaign with recipient count and sample recipients.
 * Used in wizard's preview step before sending.
 *
 * @see DOM-COMMS-003d
 */

"use client";

import { useEffect } from "react";
import { Users, Mail, Eye, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCampaignPreview } from "@/hooks/communications/use-campaigns";
import type {
  PreviewRecipient,
  PreviewRecipientsResult,
  CampaignPreviewPanelProps,
} from "@/lib/schemas/communications";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

// Re-export for backward compatibility
export type { CampaignPreviewPanelProps, PreviewRecipient };

// ============================================================================
// PREVIEW SKELETON
// ============================================================================

function PreviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading preview">
      {/* Summary Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Recipients Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// TEMPLATE LABELS
// ============================================================================

const TEMPLATE_LABELS: Record<string, string> = {
  welcome: "Welcome Email",
  follow_up: "Follow Up",
  quote: "Quote",
  order_confirmation: "Order Confirmation",
  shipping_notification: "Shipping Notification",
  reminder: "Reminder",
  newsletter: "Newsletter",
  promotion: "Promotion",
  announcement: "Announcement",
  custom: "Custom Template",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CampaignPreviewPanel({
  name,
  templateType,
  templateData,
  recipientCriteria,
  scheduledAt,
  onRecipientCountChange,
  className,
}: CampaignPreviewPanelProps) {
  const {
    data: rawPreviewData,
    isLoading,
    isError,
    error,
  } = useCampaignPreview({
    recipientCriteria,
    sampleSize: 5,
    enabled: Object.keys(recipientCriteria).length > 0,
  });

  // Type assertion for TanStack Query generic inference
  const previewData = rawPreviewData as PreviewRecipientsResult | undefined;

  // Notify parent of recipient count changes
  useEffect(() => {
    if (previewData?.total !== undefined && onRecipientCountChange) {
      onRecipientCountChange(previewData.total);
    }
  }, [previewData?.total, onRecipientCountChange]);

  if (isLoading) {
    return <PreviewSkeleton />;
  }

  const total = previewData?.total ?? 0;
  const sample = previewData?.sample ?? [];

  const hasNoRecipients = total === 0;
  const hasFilters =
    recipientCriteria.tags?.length ||
    recipientCriteria.statuses?.length ||
    recipientCriteria.customerTypes?.length ||
    recipientCriteria.contactIds?.length ||
    recipientCriteria.customerIds?.length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Campaign Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Campaign Preview
          </CardTitle>
          <CardDescription>
            Review your campaign before {scheduledAt ? "scheduling" : "sending"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campaign Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Campaign Name</dt>
              <dd className="font-medium">{name || "Untitled Campaign"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Template</dt>
              <dd className="font-medium">
                {TEMPLATE_LABELS[templateType] || templateType}
              </dd>
            </div>
            {Boolean(templateData?.subjectOverride) && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Subject</dt>
                <dd className="font-medium">{String(templateData?.subjectOverride)}</dd>
              </div>
            )}
            {scheduledAt && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Scheduled For</dt>
                <dd className="font-medium">
                  {scheduledAt.toLocaleDateString()} at{" "}
                  {scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </dd>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recipient Count */}
      <Card className={cn(hasNoRecipients && "border-amber-500/50")}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recipients
            </span>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Badge
                variant={hasNoRecipients ? "destructive" : "secondary"}
                className="text-lg px-3"
              >
                {total.toLocaleString()}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasNoRecipients ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No recipients found</AlertTitle>
              <AlertDescription>
                {hasFilters
                  ? "Your filters don't match any contacts with email addresses. Try adjusting your criteria."
                  : "There are no contacts with email addresses in your organization."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span>
                {total.toLocaleString()} contact{total !== 1 ? "s" : ""} will receive this
                campaign
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample Recipients */}
      {sample.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sample Recipients</CardTitle>
            <CardDescription>
              Preview of {sample.length} out of {total.toLocaleString()} recipients
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table aria-label="Sample recipients">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sample.map((recipient: PreviewRecipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">
                      {recipient.name || (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {recipient.email}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading preview</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load recipient preview"}
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Summary */}
      {hasFilters && (
        <div className="text-sm text-muted-foreground">
          <strong>Applied filters:</strong>
          <ul className="list-disc list-inside mt-1">
            {recipientCriteria.tags && recipientCriteria.tags.length > 0 && (
              <li>Tags: {recipientCriteria.tags.join(", ")}</li>
            )}
            {recipientCriteria.statuses && recipientCriteria.statuses.length > 0 && (
              <li>Statuses: {recipientCriteria.statuses.join(", ")}</li>
            )}
            {recipientCriteria.customerTypes && recipientCriteria.customerTypes.length > 0 && (
              <li>Types: {recipientCriteria.customerTypes.join(", ")}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
