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
import { EmptyState, EmptyStateContainer } from "@/components/shared/empty-state";
import { EntityHeader, DetailGrid, DetailSection, type DetailGridField } from "@/components/shared/detail-view";
import { StatusCell } from "@/components/shared/data-table/cells/status-cell";
import { useAlertDismissals } from "@/hooks/_shared/use-alert-dismissals";
import { useConfirmation } from "@/hooks/_shared/use-confirmation";
import { toast } from "@/lib/toast";
import {
  pauseCampaignFromDetail,
  resumeCampaignFromDetail,
  sendCampaignFromDetail,
  testSendCampaignFromDetail,
  type CampaignDetailActionFeedback,
  type CampaignDetailActionMutations,
} from "./campaign-detail-actions";
import { CampaignDetailLifecycleSection } from "./campaign-detail-lifecycle-section";
import { CampaignDetailMetricsSection } from "./campaign-detail-metrics-section";
import { getCampaignStatusVariant } from "./campaign-status-config";
import { CAMPAIGN_RECIPIENT_STATUS_CONFIG } from "./campaign-recipient-status-config";
import { generateCampaignAlerts } from "@/lib/communications/campaign-alerts";
import {
  COMMUNICATION_READ_MESSAGES,
  formatCommunicationReadError,
} from "@/lib/communications/read-error-messages";

// ============================================================================
// TYPES
// ============================================================================

import type {
  Campaign,
  CampaignRecipient,
  CampaignDetailPanelProps,
} from "@/lib/schemas/communications";

function showCampaignDetailActionFeedback(feedback: CampaignDetailActionFeedback[]) {
  for (const item of feedback) {
    const options = item.description ? { description: item.description } : undefined;
    if (item.type === "success") toast.success(item.title, options);
    if (item.type === "warning") toast.warning(item.title, options);
    if (item.type === "error") toast.error(item.title, options);
  }
}

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

  const campaignDetailActionMutations = useMemo<CampaignDetailActionMutations>(
    () => ({
      sendCampaign: (input) => sendCampaignMutation.mutateAsync(input),
      pauseCampaign: (input) => pauseCampaignMutation.mutateAsync(input),
      resumeCampaign: (input) => resumeCampaignMutation.mutateAsync(input),
      testSendCampaign: (input) => testSendMutation.mutateAsync(input),
    }),
    [
      pauseCampaignMutation,
      resumeCampaignMutation,
      sendCampaignMutation,
      testSendMutation,
    ]
  );

  // Memoized computations
  const recipients = useMemo(
    () => recipientsData?.items ?? [],
    [recipientsData]
  );

  // Handlers
  const handleSendCampaign = useCallback(async () => {
    if (!campaign) return;

    const result = await sendCampaignFromDetail({
      campaign,
      confirm,
      mutations: campaignDetailActionMutations,
    });

    showCampaignDetailActionFeedback(result.feedback);
  }, [campaign, campaignDetailActionMutations, confirm]);

  const handlePauseCampaign = useCallback(async () => {
    if (!campaign) return;

    const result = await pauseCampaignFromDetail({
      campaign,
      confirm,
      mutations: campaignDetailActionMutations,
    });

    showCampaignDetailActionFeedback(result.feedback);
  }, [campaign, campaignDetailActionMutations, confirm]);

  const handleResumeCampaign = useCallback(async () => {
    if (!campaign) return;

    const result = await resumeCampaignFromDetail({
      campaign,
      mutations: campaignDetailActionMutations,
    });

    showCampaignDetailActionFeedback(result.feedback);
  }, [campaign, campaignDetailActionMutations]);

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

    const result = await testSendCampaignFromDetail({
      campaign,
      testEmail,
      mutations: campaignDetailActionMutations,
    });

    showCampaignDetailActionFeedback(result.feedback);

    if (result.status === "success") {
      setTestSendDialogOpen(false);
      setTestEmail("");
    }
  }, [campaign, campaignDetailActionMutations, testEmail]);

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
          message={formatCommunicationReadError(
            campaignError,
            COMMUNICATION_READ_MESSAGES.campaignDetails
          )}
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
      <CampaignDetailLifecycleSection campaign={campaign} />

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
      <CampaignDetailMetricsSection campaign={campaign} />

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
