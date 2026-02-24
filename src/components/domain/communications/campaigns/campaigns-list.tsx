/**
 * CampaignsList Component
 *
 * Data table showing email campaigns with status badges and stats.
 * Includes loading skeleton, empty state, and click to view detail.
 *
 * @see DOM-COMMS-003d
 */

"use client";

import { useState, useMemo, useCallback } from "react";
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
  Send,
} from "lucide-react";
import { CampaignStatusBadge } from "./campaign-status-badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { calculatePercentage } from "@/lib/communications/campaign-utils";
import { useTableSelection } from "@/components/shared/data-table/hooks/use-table-selection";
import { CheckboxCell } from "@/components/shared/data-table/cells/checkbox-cell";
import { BulkActionsBar } from "@/components/shared/data-table/bulk-actions-bar";

// ============================================================================
// TYPES
// ============================================================================

import type {
  CampaignListItem,
  CampaignsListProps,
} from "@/lib/schemas/communications";

// Re-export types for backward compatibility
export type { CampaignListItem, CampaignsListProps };

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
  const percentage = total !== undefined ? calculatePercentage(value, total) : 0;

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
  campaigns,
  isLoading,
  onCancel,
  onDelete,
  onView,
  onCreate,
  onDuplicate,
  onTestSend,
  onBulkDelete,
  onBulkPause,
  onBulkResume,
  isCancelling: _isCancelling = false,
  isDeleting: _isDeleting = false,
  isDuplicating = false,
  isTestSending = false,
  isBulkDeleting = false,
  isBulkPausing = false,
  isBulkResuming = false,
  className,
}: CampaignsListProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testSendDialogOpen, setTestSendDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");

  // Bulk selection
  const selection = useTableSelection({
    items: campaigns,
  });

  const selectedCampaigns = useMemo(
    () => campaigns.filter((c) => selection.selectedIds.has(c.id)),
    [campaigns, selection.selectedIds]
  );

  const handleCancelCampaign = async () => {
    if (!selectedCampaignId) return;
    try {
      await onCancel(selectedCampaignId);
    } finally {
      setCancelDialogOpen(false);
      setSelectedCampaignId(null);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaignId) return;
    try {
      await onDelete(selectedCampaignId);
    } finally {
      setDeleteDialogOpen(false);
      setSelectedCampaignId(null);
    }
  };

  // Filter IDs by status for bulk actions (must be declared before callbacks that use them)
  const pauseableIds = useMemo(
    () => selectedCampaigns.filter((c) => c.status === "sending").map((c) => c.id),
    [selectedCampaigns]
  );

  const resumableIds = useMemo(
    () => selectedCampaigns.filter((c) => c.status === "paused").map((c) => c.id),
    [selectedCampaigns]
  );

  const handleBulkPause = useCallback(async () => {
    if (!onBulkPause || pauseableIds.length === 0) return;
    try {
      await onBulkPause(pauseableIds);
      selection.clearSelection();
    } catch {
      // Error handled by parent
    }
  }, [onBulkPause, pauseableIds, selection]);

  const handleBulkResume = useCallback(async () => {
    if (!onBulkResume || resumableIds.length === 0) return;
    try {
      await onBulkResume(resumableIds);
      selection.clearSelection();
    } catch {
      // Error handled by parent
    }
  }, [onBulkResume, resumableIds, selection]);

  const handleTestSend = useCallback(async () => {
    if (!onTestSend || !selectedCampaignId) return;
    const email = testEmail.trim();
    if (!email) return;

    try {
      await onTestSend(selectedCampaignId, email);
      setTestSendDialogOpen(false);
      setSelectedCampaignId(null);
      setTestEmail("");
    } catch {
      // Error handled by parent
    }
  }, [onTestSend, selectedCampaignId, testEmail]);

  const handleBulkDelete = useCallback(async () => {
    if (!onBulkDelete || selection.selectedIds.size === 0) return;
    try {
      await onBulkDelete(Array.from(selection.selectedIds));
      setBulkDeleteDialogOpen(false);
      selection.clearSelection();
    } catch {
      // Error handled by parent
    }
  }, [onBulkDelete, selection]);

  const canBulkPause = useMemo(
    () => selectedCampaigns.some((c) => c.status === "sending"),
    [selectedCampaigns]
  );

  const canBulkResume = useMemo(
    () => selectedCampaigns.some((c) => c.status === "paused"),
    [selectedCampaigns]
  );

  if (isLoading) {
    return <CampaignsListSkeleton />;
  }

  if (campaigns.length === 0) {
    return <CampaignsEmptyState onCreate={onCreate} />;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Email Campaigns</h2>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selection.selectedIds.size >= 2 && (
        <BulkActionsBar
          selectedCount={selection.selectedIds.size}
          onClear={selection.clearSelection}
        >
          {canBulkPause && onBulkPause && pauseableIds.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkPause}
              disabled={isBulkPausing}
            >
              <Pause className="h-4 w-4 mr-2" />
              {isBulkPausing ? "Pausing..." : `Pause ${pauseableIds.length}`}
            </Button>
          )}
          {canBulkResume && onBulkResume && resumableIds.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkResume}
              disabled={isBulkResuming}
            >
              <Play className="h-4 w-4 mr-2" />
              {isBulkResuming ? "Resuming..." : `Resume ${resumableIds.length}`}
            </Button>
          )}
          {onBulkDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBulkDeleteDialogOpen(true)}
              disabled={isBulkDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isBulkDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
        </BulkActionsBar>
      )}

      <div className="rounded-md border">
        <Table aria-label="Email campaigns list">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <CheckboxCell
                  checked={selection.isAllSelected}
                  indeterminate={selection.selectedIds.size > 0 && !selection.isAllSelected}
                  onChange={(checked) => selection.handleSelectAll(checked)}
                  ariaLabel="Select all campaigns"
                />
              </TableHead>
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
            {campaigns.map((campaign, index) => (
              <TableRow
                key={campaign.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  selection.selectedIds.has(campaign.id) && "bg-muted/50"
                )}
                onClick={(e) => {
                  // Don't navigate if clicking checkbox
                  if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
                    return;
                  }
                  onView(campaign.id);
                }}
                tabIndex={0}
                role="button"
                aria-label={`View campaign: ${campaign.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onView(campaign.id);
                  }
                }}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <CheckboxCell
                    checked={selection.selectedIds.has(campaign.id)}
                    onChange={(checked) => {
                      selection.handleSelect(campaign.id, checked);
                      selection.setLastClickedIndex(index);
                    }}
                    onShiftClick={() => {
                      if (selection.lastClickedIndex !== null) {
                        selection.handleShiftClickRange(selection.lastClickedIndex, index);
                      }
                      selection.setLastClickedIndex(index);
                    }}
                    ariaLabel={`Select campaign ${campaign.name}`}
                  />
                </TableCell>
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
                      <DropdownMenuItem onClick={() => onView(campaign.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {onDuplicate && (
                        <DropdownMenuItem
                          onClick={() => onDuplicate(campaign.id)}
                          disabled={isDuplicating}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {isDuplicating ? "Duplicating..." : "Duplicate"}
                        </DropdownMenuItem>
                      )}
                      {onTestSend && (campaign.status === "draft" || campaign.status === "scheduled" || campaign.status === "paused") && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedCampaignId(campaign.id);
                            setTestEmail("");
                            setTestSendDialogOpen(true);
                          }}
                          disabled={isTestSending}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Test Email
                        </DropdownMenuItem>
                      )}
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
                        <DropdownMenuItem
                          onClick={() => {
                            if (onBulkResume) {
                              void onBulkResume([campaign.id]);
                            }
                          }}
                          disabled={!onBulkResume || isBulkResuming}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {isBulkResuming ? "Resuming..." : "Resume Campaign"}
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

      {/* Test Send Dialog */}
      <Dialog open={testSendDialogOpen} onOpenChange={setTestSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Enter an email address to send a test campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="campaign-test-email">Test Email Address</Label>
            <Input
              id="campaign-test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter" && testEmail.trim() && !isTestSending) {
                  e.preventDefault();
                  void handleTestSend();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTestSendDialogOpen(false);
                setTestEmail("");
                setSelectedCampaignId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleTestSend()}
              disabled={!testEmail.trim() || isTestSending}
            >
              {isTestSending ? "Sending..." : "Send Test Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Campaigns?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              {selection.selectedIds.size} campaign
              {selection.selectedIds.size === 1 ? "" : "s"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleBulkDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
