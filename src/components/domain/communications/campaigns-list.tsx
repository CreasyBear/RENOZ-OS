/**
 * CampaignsList Component
 *
 * Data table showing email campaigns with status badges and stats.
 * Includes loading skeleton, empty state, and click to view detail.
 *
 * @see DOM-COMMS-003d
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import {
  Mail,
  Eye,
  MousePointerClick,
  AlertTriangle,
  Plus,
  MoreHorizontal,
  Trash2,
  Play,
  Pause,
  Copy,
} from "lucide-react";
import { getCampaigns, cancelCampaign, deleteCampaign } from "@/lib/server/email-campaigns";
import { CampaignStatusBadge, type CampaignStatus } from "./campaign-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignListItem {
  id: string;
  name: string;
  templateType: string;
  status: CampaignStatus;
  recipientCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  failedCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface CampaignsResponse {
  items: CampaignListItem[];
  total: number;
}

export interface CampaignsListProps {
  onCreateCampaign?: () => void;
  onViewCampaign?: (campaignId: string) => void;
  className?: string;
}

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

export function CampaignsListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading campaigns">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Recipients</TableHead>
              <TableHead className="text-center">Opens</TableHead>
              <TableHead className="text-center">Clicks</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-10 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-10 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-10 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function CampaignsEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <Empty className="min-h-[400px]" role="status" aria-label="No campaigns">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Mail className="h-6 w-6" />
        </EmptyMedia>
        <EmptyTitle>No campaigns created</EmptyTitle>
        <EmptyDescription>
          Create your first email campaign to reach multiple contacts at once.
          You can schedule campaigns or send them immediately.
        </EmptyDescription>
      </EmptyHeader>
      {onCreate && (
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      )}
    </Empty>
  );
}

// ============================================================================
// STAT CELL COMPONENT
// ============================================================================

function StatCell({
  value,
  total,
  icon: Icon,
  variant = "default",
}: {
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
    <div className="flex flex-col items-center gap-0.5">
      <div className={cn("flex items-center gap-1", variantColors[variant])}>
        <Icon className="h-3 w-3" />
        <span className="font-medium">{value}</span>
      </div>
      {total !== undefined && total > 0 && (
        <span className="text-xs text-muted-foreground">{percentage}%</span>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CampaignsList({
  onCreateCampaign,
  onViewCampaign,
  className,
}: CampaignsListProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const {
    data: campaignsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaigns({ data: { limit: 50, offset: 0 } }),
  });

  const data = campaignsData as CampaignsResponse | undefined;

  const handleCancelCampaign = async () => {
    if (!selectedCampaignId) return;
    try {
      await cancelCampaign({ data: { id: selectedCampaignId } });
      refetch();
    } finally {
      setCancelDialogOpen(false);
      setSelectedCampaignId(null);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaignId) return;
    try {
      await deleteCampaign({ data: { id: selectedCampaignId } });
      refetch();
    } finally {
      setDeleteDialogOpen(false);
      setSelectedCampaignId(null);
    }
  };

  if (isLoading) {
    return <CampaignsListSkeleton />;
  }

  const campaigns = (data?.items ?? []) as CampaignListItem[];

  if (campaigns.length === 0) {
    return <CampaignsEmptyState onCreate={onCreateCampaign} />;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Email Campaigns</h2>
        {onCreateCampaign && (
          <Button onClick={onCreateCampaign}>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table aria-label="Email campaigns list">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">
                <span className="sr-only">Sent to</span>
                <Mail className="h-4 w-4 mx-auto" aria-hidden="true" />
              </TableHead>
              <TableHead className="text-center">
                <span className="sr-only">Opens</span>
                <Eye className="h-4 w-4 mx-auto" aria-hidden="true" />
              </TableHead>
              <TableHead className="text-center">
                <span className="sr-only">Clicks</span>
                <MousePointerClick className="h-4 w-4 mx-auto" aria-hidden="true" />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow
                key={campaign.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewCampaign?.(campaign.id)}
                tabIndex={0}
                role="button"
                aria-label={`View campaign: ${campaign.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onViewCampaign?.(campaign.id);
                  }
                }}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {campaign.templateType.replace("_", " ")}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <CampaignStatusBadge status={campaign.status} size="sm" />
                </TableCell>
                <TableCell className="text-center">
                  <StatCell
                    value={campaign.sentCount}
                    total={campaign.recipientCount}
                    icon={Mail}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <StatCell
                    value={campaign.openCount}
                    total={campaign.sentCount}
                    icon={Eye}
                    variant={campaign.openCount > 0 ? "success" : "default"}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <StatCell
                    value={campaign.clickCount}
                    total={campaign.sentCount}
                    icon={MousePointerClick}
                    variant={campaign.clickCount > 0 ? "success" : "default"}
                  />
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {campaign.completedAt ? (
                      <span title={format(new Date(campaign.completedAt), "PPp")}>
                        Sent {formatDistanceToNow(new Date(campaign.completedAt), { addSuffix: true })}
                      </span>
                    ) : campaign.scheduledAt ? (
                      <span title={format(new Date(campaign.scheduledAt), "PPp")}>
                        Scheduled for {format(new Date(campaign.scheduledAt), "MMM d, HH:mm")}
                      </span>
                    ) : (
                      <span title={format(new Date(campaign.createdAt), "PPp")}>
                        Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Campaign actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewCampaign?.(campaign.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      {campaign.status === "sending" && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedCampaignId(campaign.id);
                            setCancelDialogOpen(true);
                          }}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pause Campaign
                        </DropdownMenuItem>
                      )}
                      {campaign.status === "paused" && (
                        <DropdownMenuItem>
                          <Play className="h-4 w-4 mr-2" />
                          Resume Campaign
                        </DropdownMenuItem>
                      )}
                      {(campaign.status === "draft" || campaign.status === "scheduled") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSelectedCampaignId(campaign.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Campaign
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Failed campaigns warning */}
      {campaigns.some((c) => c.failedCount > 0) && (
        <div
          className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4" />
          Some campaigns have failed recipients. View campaign details for more info.
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will pause the campaign. Emails that are already queued will still be sent.
              You can resume the campaign later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelCampaign}>
              Pause Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the campaign
              and all associated recipient data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCampaign}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
