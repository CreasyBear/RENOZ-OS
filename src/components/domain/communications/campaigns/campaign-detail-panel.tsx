/**
 * CampaignDetailPanel Component
 *
 * Comprehensive detail view for email campaigns following DETAIL-VIEW-STANDARDS.md.
 * Implements 5-zone layout: Header, Progress, Alerts, Metrics, Recipients.
 *
 * @see DOM-COMMS-003d
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

"use client";

import { memo, useMemo, useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useCampaign,
  useCampaignRecipients,
  useSendCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useTestSendCampaign,
} from "@/hooks/communications/use-campaigns";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail,
  Eye,
  MousePointerClick,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Users,
  Send,
  CheckCircle2,
  XCircle,
  BarChart3,
  Plus,
  History,
  ArrowRight,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPendingDialogInteractionGuards } from "@/components/ui/dialog-pending-guards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/shared";
import { EmptyState, EmptyStateContainer } from "@/components/shared/empty-state";
import { EntityHeader, DetailGrid, DetailSection, type DetailGridField } from "@/components/shared/detail-view";
import { StatusCell } from "@/components/shared/data-table/cells/status-cell";
import { useAlertDismissals } from "@/hooks/_shared/use-alert-dismissals";
import { useReducedMotion } from "@/hooks/_shared/use-reduced-motion";
import { useConfirmation, confirmations } from "@/hooks/_shared/use-confirmation";
import { toast } from "@/lib/toast";
import { getUserFriendlyMessage, normalizeError } from "@/lib/error-handling";
import {
  getCampaignStatusVariant,
  getCampaignStageIndex,
  CAMPAIGN_STAGES,
} from "./campaign-status-config";
import { CAMPAIGN_RECIPIENT_STATUS_CONFIG } from "./campaign-recipient-status-config";
import {
  calculateSendProgress,
  calculatePercentage,
} from "@/lib/communications/campaign-utils";
import { generateCampaignAlerts } from "@/lib/communications/campaign-alerts";

// ============================================================================
// TYPES
// ============================================================================

import type {
  Campaign,
  CampaignRecipient,
  CampaignDetailPanelProps,
} from "@/lib/schemas/communications";

// ============================================================================
// CONSTANTS
// ============================================================================

const CAMPAIGN_STAT_STYLES = {
  default: { iconClassName: "text-muted-foreground" },
  success: { iconClassName: "text-green-600 dark:text-green-400" },
  warning: { iconClassName: "text-amber-600 dark:text-amber-400" },
  error: { iconClassName: "text-red-600 dark:text-red-400" },
} as const;

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

export const CampaignDetailSkeleton = memo(function CampaignDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading campaign details">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format campaign stat value with percentage
 * Uses utility function for consistent calculation
 */
function formatCampaignStatValue(value: number, total?: number): React.ReactNode {
  const percentage = total !== undefined ? calculatePercentage(value, total) : 0;
  return (
    <span className="flex items-baseline gap-2">
      <span>{value.toLocaleString()}</span>
      {total !== undefined && total > 0 && (
        <span className="text-sm font-normal text-muted-foreground">({percentage}%)</span>
      )}
    </span>
  );
}

// ============================================================================
// RECIPIENT STATUS BADGE (memoized)
// ============================================================================

const RecipientStatusBadge = memo(function RecipientStatusBadge({
  status,
}: {
  status: CampaignRecipient["status"] | "skipped";
}) {
  // Handle "skipped" status which may come from API but isn't in schema
  if (status === "skipped") {
    return (
      <Badge variant="outline" className="text-xs">
        Skipped
      </Badge>
    );
  }

  return (
    <StatusCell
      status={status}
      statusConfig={CAMPAIGN_RECIPIENT_STATUS_CONFIG}
      className="text-xs"
    />
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CampaignDetailPanel = memo(function CampaignDetailPanel({
  campaignId,
  onBack,
  className,
}: CampaignDetailPanelProps) {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { dismiss, isAlertDismissed } = useAlertDismissals();
  const { confirm } = useConfirmation();
  const [testSendDialogOpen, setTestSendDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const { data: campaignData, isLoading: campaignLoading, error: campaignError } = useCampaign({
    campaignId,
  });

  const campaign = (campaignData ?? null) as Campaign | null;

  const { data: recipientsData, isLoading: recipientsLoading } =
    useCampaignRecipients({
      campaignId,
      limit: 50,
      offset: 0,
      enabled: !!campaign,
    });

  // Mutations
  const sendCampaignMutation = useSendCampaign();
  const pauseCampaignMutation = usePauseCampaign();
  const resumeCampaignMutation = useResumeCampaign();
  const testSendMutation = useTestSendCampaign();

  // Memoized computations
  const recipients = useMemo(
    () => recipientsData?.items ?? [],
    [recipientsData]
  );

  const isSending = useMemo(
    () => campaign?.status === "sending",
    [campaign?.status]
  );

  const sendProgress = useMemo(() => {
    if (!campaign) return 0;
    return calculateSendProgress(campaign.sentCount, campaign.recipientCount);
  }, [campaign]);

  // Handlers
  const handleSendCampaign = useCallback(async () => {
    if (!campaign) return;

    // Validate recipients
    if (campaign.recipientCount === 0) {
      toast.error("Cannot send campaign", {
        description: "This campaign has no recipients. Please add recipients before sending.",
      });
      return;
    }

    const { confirmed } = await confirm(
      confirmations.sendCampaign(campaign.name, campaign.recipientCount)
    );

    if (!confirmed) return;

    try {
      await sendCampaignMutation.mutateAsync({ id: campaign.id });
      toast.success("Campaign sending started", {
        description: `Your campaign "${campaign.name}" is now being sent to ${campaign.recipientCount} recipients.`,
      });
    } catch (error) {
      toast.error("Failed to send campaign", {
        description: getUserFriendlyMessage(normalizeError(error)),
      });
    }
  }, [campaign, confirm, sendCampaignMutation]);

  const handlePauseCampaign = useCallback(async () => {
    if (!campaign) return;

    const { confirmed } = await confirm(
      confirmations.pauseCampaign(campaign.name)
    );

    if (!confirmed) return;

    try {
      await pauseCampaignMutation.mutateAsync({ id: campaign.id });
      toast.success("Campaign paused", {
        description: `Campaign "${campaign.name}" has been paused. You can resume it later.`,
      });
    } catch (error) {
      toast.error("Failed to pause campaign", {
        description: getUserFriendlyMessage(normalizeError(error)),
      });
    }
  }, [campaign, confirm, pauseCampaignMutation]);

  const handleResumeCampaign = useCallback(async () => {
    if (!campaign) return;

    try {
      await resumeCampaignMutation.mutateAsync({ id: campaign.id });
      toast.success("Campaign resumed", {
        description: `Campaign "${campaign.name}" is now sending again.`,
      });
    } catch (error) {
      toast.error("Failed to resume campaign", {
        description: getUserFriendlyMessage(normalizeError(error)),
      });
    }
  }, [campaign, resumeCampaignMutation]);

  const handleEditCampaign = useCallback(() => {
    navigate({
      to: "/communications/campaigns/$campaignId/edit",
      params: { campaignId },
    });
  }, [navigate, campaignId]);

  const handleViewAnalytics = useCallback(() => {
    // Navigate to campaign analytics page
    navigate({ to: "/communications/campaigns/analytics" });
  }, [navigate]);

  const handleViewEmailHistory = useCallback(() => {
    if (!campaign) return;
    // Navigate to inbox filtered by this campaign
    navigate({ 
      to: "/communications/inbox", 
      search: { campaignId: campaign.id } 
    });
  }, [navigate, campaign]);

  const handleTestSend = useCallback(async () => {
    if (!campaign || !testEmail) return;
    try {
      await testSendMutation.mutateAsync({ campaignId: campaign.id, testEmail });
      toast.success("Test email sent", {
        description: `Sent to ${testEmail}`,
      });
      setTestSendDialogOpen(false);
      setTestEmail("");
    } catch (error) {
      toast.error("Failed to send test email", {
        description: getUserFriendlyMessage(normalizeError(error)),
      });
    }
  }, [campaign, testEmail, testSendMutation]);

  const currentStageIndex = useMemo(
    () => (campaign ? getCampaignStageIndex(campaign.status) : -1),
    [campaign]
  );

  // Build campaign meta fields for DetailGrid
  const campaignMetaFields = useMemo(() => {
    if (!campaign) return [];
    const fields: DetailGridField[] = [];
    
    if (campaign.scheduledAt) {
      fields.push({
        label: "Scheduled",
        value: (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(campaign.scheduledAt), "PPp")}
          </div>
        ),
      });
    }
    
    if (campaign.startedAt) {
      fields.push({
        label: "Started",
        value: (
          <div className="flex items-center gap-1">
            <Send className="h-3 w-3" />
            {formatDistanceToNow(new Date(campaign.startedAt), { addSuffix: true })}
          </div>
        ),
      });
    }
    
    if (campaign.completedAt) {
      fields.push({
        label: "Completed",
        value: (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {formatDistanceToNow(new Date(campaign.completedAt), { addSuffix: true })}
          </div>
        ),
      });
    }
    
    return fields;
  }, [campaign]);

  // Generate alerts for critical issues using utility function
  const allAlerts = useMemo(() => {
    if (!campaign) return [];
    return generateCampaignAlerts(campaign);
  }, [campaign]);

  // Filter dismissed alerts
  const visibleAlerts = useMemo(() => {
    return allAlerts.filter((alert) => !isAlertDismissed(alert.id)).slice(0, 3);
  }, [allAlerts, isAlertDismissed]);

  // Handle alert dismissal
  const handleDismissAlert = useCallback(
    (alertId: string) => {
      dismiss(alertId);
    },
    [dismiss]
  );

  // Memoized metric values
  const metrics = useMemo(() => {
    if (!campaign) return null;
    return {
      recipients: campaign.recipientCount.toLocaleString(),
      sent: formatCampaignStatValue(campaign.sentCount, campaign.recipientCount),
      opened: formatCampaignStatValue(campaign.openCount, campaign.sentCount),
      clicked: formatCampaignStatValue(campaign.clickCount, campaign.sentCount),
      openedIconClass: campaign.openCount > 0 
        ? CAMPAIGN_STAT_STYLES.success.iconClassName 
        : CAMPAIGN_STAT_STYLES.default.iconClassName,
      clickedIconClass: campaign.clickCount > 0 
        ? CAMPAIGN_STAT_STYLES.success.iconClassName 
        : CAMPAIGN_STAT_STYLES.default.iconClassName,
    };
  }, [campaign]);

  // Loading state
  if (campaignLoading) {
    return <CampaignDetailSkeleton />;
  }

  // Error state
  if (campaignError || !campaign) {
    return (
      <EmptyStateContainer variant="page">
        <EmptyState
          icon={AlertTriangle}
          title="Campaign not found"
          message={campaignError?.message || "This campaign could not be loaded."}
          primaryAction={
            onBack
              ? {
                  label: "Back to campaigns",
                  onClick: onBack,
                  icon: ArrowLeft,
                }
              : undefined
          }
        />
      </EmptyStateContainer>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Zone 1: Entity Header */}
      <EntityHeader
        name={campaign.name}
        subtitle={
          <>
            {campaign.templateType.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} template
            {campaign.description && ` · ${campaign.description}`}
          </>
        }
        avatarFallback={campaign.name.slice(0, 2).toUpperCase()}
        status={{
          value: campaign.status,
          variant: getCampaignStatusVariant(campaign.status),
        }}
        typeBadge={
          <Badge variant="outline" className="text-xs">
            {campaign.templateType.replace("_", " ")}
          </Badge>
        }
        primaryAction={
          campaign.status === "draft" || campaign.status === "scheduled" || campaign.status === "paused"
            ? {
                label: campaign.status === "paused" ? "Resume" : "Send Now",
                onClick: campaign.status === "paused" ? handleResumeCampaign : handleSendCampaign,
                icon: campaign.status === "paused" ? <Play className="h-4 w-4" /> : <Send className="h-4 w-4" />,
                disabled: sendCampaignMutation.isPending || resumeCampaignMutation.isPending || campaign.recipientCount === 0,
              }
            : campaign.status === "sending"
            ? {
                label: "Pause",
                onClick: handlePauseCampaign,
                icon: <Pause className="h-4 w-4" />,
                disabled: pauseCampaignMutation.isPending,
              }
            : campaign.status === "sent"
            ? {
                label: "View Analytics",
                onClick: handleViewAnalytics,
                icon: <BarChart3 className="h-4 w-4" />,
              }
            : undefined
        }
        onEdit={
          campaign.status === "draft" || campaign.status === "scheduled"
            ? handleEditCampaign
            : undefined
        }
        secondaryActions={
          [
            ...(onBack
              ? [
                  {
                    label: "Back to campaigns",
                    onClick: onBack,
                    icon: <ArrowLeft className="h-4 w-4" />,
                  },
                ]
              : []),
            ...(campaign.status === "draft" || campaign.status === "scheduled" || campaign.status === "paused"
              ? [
                  {
                    label: "Send Test Email",
                    onClick: () => setTestSendDialogOpen(true),
                    icon: <Send className="h-4 w-4" />,
                  },
                ]
              : []),
            ...(campaign.status === "sent"
              ? [
                  {
                    label: "View Email History",
                    onClick: handleViewEmailHistory,
                    icon: <History className="h-4 w-4" />,
                  },
                ]
              : []),
          ]
        }
      />

      {/* Zone 2: Progress Indicator */}
      {currentStageIndex >= 0 && (
        <section
          className="rounded-lg border bg-background p-4"
          role="progressbar"
          aria-valuenow={currentStageIndex + 1}
          aria-valuemin={1}
          aria-valuemax={CAMPAIGN_STAGES.length}
          aria-label={`Campaign progress: ${CAMPAIGN_STAGES[currentStageIndex]?.label || "Unknown"} stage`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-medium">Campaign lifecycle</div>
              <div className="text-xs text-muted-foreground">
                {campaign.status === "sending" && `Sending ${campaign.sentCount} of ${campaign.recipientCount} emails...`}
                {campaign.status === "sent" && `Completed ${campaign.completedAt ? formatDistanceToNow(new Date(campaign.completedAt), { addSuffix: true }) : ""}`}
                {campaign.status === "scheduled" && campaign.scheduledAt && `Scheduled for ${format(new Date(campaign.scheduledAt), "PPp")}`}
              </div>
            </div>
            {isSending && (
              <div className="text-sm font-medium" aria-live="polite" aria-atomic="true">
                {sendProgress}%
              </div>
            )}
          </div>
          
          {/* Progress bar for sending campaigns */}
          {isSending && (
            <Progress 
              value={sendProgress} 
              className={cn(
                "h-2",
                !prefersReducedMotion && "transition-all duration-300"
              )}
              aria-label={`Sending progress: ${sendProgress}%`}
            />
          )}

          {/* Stage indicators */}
          {!isSending && (
            <div className="flex items-center gap-2 mt-3">
              {CAMPAIGN_STAGES.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isPending = index > currentStageIndex;

                return (
                  <div
                    key={stage.status}
                    className={cn(
                      "flex items-center gap-2 flex-1",
                      index < CAMPAIGN_STAGES.length - 1 && "after:content-[''] after:flex-1 after:h-px after:bg-border"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium border-2",
                        isCompleted && "bg-primary text-primary-foreground border-primary",
                        isCurrent && "bg-primary/10 text-primary border-primary",
                        isPending && "bg-muted text-muted-foreground border-muted-foreground/30"
                      )}
                      aria-label={
                        isCompleted
                          ? `${stage.label} - completed`
                          : isCurrent
                          ? `${stage.label} - current`
                          : `${stage.label} - pending`
                      }
                    >
                      {isCompleted ? "✓" : isCurrent ? "●" : "○"}
                    </div>
                    <span
                      className={cn(
                        "text-xs",
                        isCurrent && "font-medium",
                        isPending && "text-muted-foreground"
                      )}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Zone 3: Alerts */}
      {visibleAlerts.length > 0 && (
        <section className="space-y-2" aria-label="Campaign alerts">
          {visibleAlerts.map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.tone === "critical" ? "destructive" : "default"}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>{alert.description}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {alert.onAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={alert.onAction}
                    >
                      {alert.actionLabel}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleDismissAlert(alert.id)}
                    aria-label="Dismiss alert"
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </section>
      )}

      {/* Zone 4: Key Metrics */}
      {metrics && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          aria-label="Campaign statistics"
        >
          <MetricCard
            title="Recipients"
            value={metrics.recipients}
            icon={Users}
            iconClassName={CAMPAIGN_STAT_STYLES.default.iconClassName}
          />
          <MetricCard
            title="Sent"
            value={metrics.sent}
            icon={Mail}
            iconClassName={CAMPAIGN_STAT_STYLES.default.iconClassName}
          />
          <MetricCard
            title="Opened"
            value={metrics.opened}
            icon={Eye}
            iconClassName={metrics.openedIconClass}
          />
          <MetricCard
            title="Clicked"
            value={metrics.clicked}
            icon={MousePointerClick}
            iconClassName={metrics.clickedIconClass}
          />
        </div>
      )}

      {/* Error Stats (if any) */}
      {campaign.bounceCount > 0 || campaign.failedCount > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {campaign.bounceCount > 0 && (
            <MetricCard
              title="Bounced"
              value={formatCampaignStatValue(campaign.bounceCount, campaign.sentCount)}
              icon={XCircle}
              iconClassName={CAMPAIGN_STAT_STYLES.warning.iconClassName}
            />
          )}
          {campaign.failedCount > 0 && (
            <MetricCard
              title="Failed"
              value={formatCampaignStatValue(campaign.failedCount, campaign.recipientCount)}
              icon={AlertTriangle}
              iconClassName={CAMPAIGN_STAT_STYLES.error.iconClassName}
            />
          )}
        </div>
      ) : null}

      {/* Terminal State: Action Suggestions (when campaign is completed) */}
      {campaign.status === "sent" && (
        <section className="rounded-lg border bg-muted/50 p-4" aria-label="Next steps">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-success/10 p-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Campaign completed successfully</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your campaign has been sent. Here are some suggested next steps:
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleViewAnalytics}
                  className="gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  View Analytics
                  <ArrowRight className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Navigate to create new campaign
                    if (onBack) {
                      onBack();
                    }
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create New Campaign
                  <ArrowRight className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewEmailHistory}
                  className="gap-2"
                >
                  <History className="h-4 w-4" />
                  View Email History
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Zone 5: Campaign Information */}
      {campaignMetaFields.length > 0 && (
        <DetailSection id="meta" title="Campaign Information" defaultOpen={true}>
          <DetailGrid fields={campaignMetaFields} />
        </DetailSection>
      )}

      {/* Zone 5: Recipients List */}
      <DetailSection id="recipients" title={`Recipients (${campaign.recipientCount})`} defaultOpen={true}>
        {recipientsLoading ? (
          <div className="p-4">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : recipients.length === 0 ? (
          <EmptyStateContainer variant="card">
            <EmptyState
              icon={Users}
              title="No recipients yet"
              message="Recipients will be populated when the campaign is sent or scheduled."
            />
          </EmptyStateContainer>
        ) : (
          <div className="rounded-md border">
            <ScrollArea className="h-[300px]">
              <Table aria-label="Campaign recipients">
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {recipient.name || "Unknown"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {recipient.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RecipientStatusBadge status={recipient.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {recipient.clickedAt ? (
                          <span>Clicked {formatDistanceToNow(new Date(recipient.clickedAt), { addSuffix: true })}</span>
                        ) : recipient.openedAt ? (
                          <span>Opened {formatDistanceToNow(new Date(recipient.openedAt), { addSuffix: true })}</span>
                        ) : recipient.sentAt ? (
                          <span>Sent {formatDistanceToNow(new Date(recipient.sentAt), { addSuffix: true })}</span>
                        ) : recipient.errorMessage ? (
                          <span className="text-red-600" title={recipient.errorMessage}>
                            Error: {recipient.errorMessage.slice(0, 30)}...
                          </span>
                        ) : (
                          <span>Pending</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </DetailSection>

      {/* Test Send Dialog */}
      <Dialog open={testSendDialogOpen} onOpenChange={setTestSendDialogOpen}>
        <DialogContent
          onEscapeKeyDown={createPendingDialogInteractionGuards(testSendMutation.isPending).onEscapeKeyDown}
          onInteractOutside={createPendingDialogInteractionGuards(testSendMutation.isPending).onInteractOutside}
        >
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email for this campaign to verify how it looks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Test Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && testEmail && !testSendMutation.isPending) {
                    handleTestSend();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTestSendDialogOpen(false);
                setTestEmail("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTestSend}
              disabled={!testEmail || testSendMutation.isPending}
            >
              {testSendMutation.isPending ? "Sending..." : "Send Test Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
