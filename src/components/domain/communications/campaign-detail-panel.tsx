/**
 * CampaignDetailPanel Component
 *
 * Shows campaign stats graph and recipient list with status badges.
 * Used in side panel or modal when viewing a campaign.
 *
 * @see DOM-COMMS-003d
 */

"use client";

import { useQuery } from "@tanstack/react-query";
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
  Clock,
} from "lucide-react";
import { getCampaignById, getCampaignRecipients } from "@/lib/server/email-campaigns";
import { CampaignStatusBadge, type CampaignStatus } from "./campaign-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignDetailPanelProps {
  campaignId: string;
  onBack?: () => void;
  className?: string;
}

interface Campaign {
  id: string;
  name: string;
  templateType: string;
  status: CampaignStatus;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  failedCount: number;
  unsubscribeCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface CampaignRecipient {
  id: string;
  email: string;
  name: string | null;
  contactId: string | null;
  status: "pending" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed" | "unsubscribed";
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  errorMessage: string | null;
}

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

export function CampaignDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading campaign details">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>

      {/* Stats Grid Skeleton */}
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

      {/* Progress Skeleton */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>

      {/* Recipients Table Skeleton */}
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
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

function StatCard({
  title,
  value,
  total,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: number;
  total?: number;
  icon: typeof Mail;
  variant?: "default" | "success" | "warning" | "error";
}) {
  const percentage = total && total > 0 ? Math.round((value / total) * 100) : 0;

  const variantColors = {
    default: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    error: "text-red-600 dark:text-red-400",
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Icon className={cn("h-4 w-4", variantColors[variant])} />
          {title}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold", variantColors[variant])}>
            {value.toLocaleString()}
          </span>
          {total !== undefined && total > 0 && (
            <span className="text-sm text-muted-foreground">({percentage}%)</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// RECIPIENT STATUS BADGE
// ============================================================================

const RECIPIENT_STATUS_CONFIG: Record<
  CampaignRecipient["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  pending: {
    label: "Pending",
    variant: "secondary",
    className: "bg-slate-100 text-slate-700",
  },
  sent: {
    label: "Sent",
    variant: "default",
    className: "bg-blue-100 text-blue-700",
  },
  delivered: {
    label: "Delivered",
    variant: "default",
    className: "bg-green-100 text-green-700",
  },
  opened: {
    label: "Opened",
    variant: "default",
    className: "bg-emerald-100 text-emerald-700",
  },
  clicked: {
    label: "Clicked",
    variant: "default",
    className: "bg-teal-100 text-teal-700",
  },
  bounced: {
    label: "Bounced",
    variant: "destructive",
    className: "bg-amber-100 text-amber-700",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    className: "bg-red-100 text-red-700",
  },
  unsubscribed: {
    label: "Unsubscribed",
    variant: "outline",
    className: "bg-gray-100 text-gray-700",
  },
};

function RecipientStatusBadge({ status }: { status: CampaignRecipient["status"] }) {
  const config = RECIPIENT_STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CampaignDetailPanel({
  campaignId,
  onBack,
  className,
}: CampaignDetailPanelProps) {
  const { data: campaignData, isLoading: campaignLoading } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => getCampaignById({ data: { id: campaignId } }),
  });

  const campaign = campaignData as Campaign | null;

  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({
    queryKey: ["campaign-recipients", campaignId],
    queryFn: () => getCampaignRecipients({ data: { campaignId, limit: 50, offset: 0 } }),
    enabled: !!campaign,
  });

  if (campaignLoading) {
    return <CampaignDetailSkeleton />;
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Campaign not found</p>
        {onBack && (
          <Button variant="link" onClick={onBack} className="mt-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to campaigns
          </Button>
        )}
      </div>
    );
  }

  const recipients = (recipientsData?.items ?? []) as CampaignRecipient[];
  const isSending = campaign.status === "sending";
  const sendProgress =
    campaign.recipientCount > 0
      ? Math.round((campaign.sentCount / campaign.recipientCount) * 100)
      : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to campaigns"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold truncate">{campaign.name}</h2>
          <p className="text-sm text-muted-foreground capitalize">
            {campaign.templateType.replace("_", " ")} template
          </p>
        </div>
        <CampaignStatusBadge status={campaign.status as CampaignStatus} />
      </div>

      {/* Campaign Meta */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {campaign.scheduledAt && (
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Scheduled: {format(new Date(campaign.scheduledAt), "PPp")}
          </div>
        )}
        {campaign.startedAt && (
          <div className="flex items-center gap-1">
            <Send className="h-4 w-4" />
            Started: {formatDistanceToNow(new Date(campaign.startedAt), { addSuffix: true })}
          </div>
        )}
        {campaign.completedAt && (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Completed: {formatDistanceToNow(new Date(campaign.completedAt), { addSuffix: true })}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        aria-label="Campaign statistics"
      >
        <StatCard
          title="Recipients"
          value={campaign.recipientCount}
          icon={Users}
        />
        <StatCard
          title="Sent"
          value={campaign.sentCount}
          total={campaign.recipientCount}
          icon={Mail}
        />
        <StatCard
          title="Opened"
          value={campaign.openCount}
          total={campaign.sentCount}
          icon={Eye}
          variant={campaign.openCount > 0 ? "success" : "default"}
        />
        <StatCard
          title="Clicked"
          value={campaign.clickCount}
          total={campaign.sentCount}
          icon={MousePointerClick}
          variant={campaign.clickCount > 0 ? "success" : "default"}
        />
      </div>

      {/* Error Stats (if any) */}
      {(campaign.bounceCount > 0 || campaign.failedCount > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {campaign.bounceCount > 0 && (
            <StatCard
              title="Bounced"
              value={campaign.bounceCount}
              total={campaign.sentCount}
              icon={XCircle}
              variant="warning"
            />
          )}
          {campaign.failedCount > 0 && (
            <StatCard
              title="Failed"
              value={campaign.failedCount}
              total={campaign.recipientCount}
              icon={AlertTriangle}
              variant="error"
            />
          )}
        </div>
      )}

      {/* Sending Progress */}
      {isSending && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 animate-pulse" />
                Sending in progress...
              </span>
              <span
                className="font-medium"
                aria-live="polite"
                aria-atomic="true"
              >
                {campaign.sentCount} / {campaign.recipientCount} ({sendProgress}%)
              </span>
            </div>
            <Progress value={sendProgress} className="h-2" aria-label="Sending progress" />
          </CardContent>
        </Card>
      )}

      {/* Recipients List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recipients</CardTitle>
          <CardDescription>
            {campaign.recipientCount} recipients in this campaign
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recipientsLoading ? (
            <div className="p-4">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : recipients.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No recipients yet. Recipients will be populated when the campaign is sent.
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
