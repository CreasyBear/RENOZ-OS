/**
 * FollowUpScheduler Component
 *
 * Displays and manages scheduled follow-up activities.
 * Shows overdue items prominently, upcoming follow-ups,
 * and allows scheduling new follow-ups.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-ACTIVITIES-UI)
 */

import { memo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/hooks";
import {
  getUpcomingFollowUps,
  logActivity,
  completeActivity,
} from "@/server/functions/pipeline/pipeline";

// ============================================================================
// TYPES
// ============================================================================

export interface FollowUpSchedulerProps {
  opportunityId: string;
  className?: string;
  compact?: boolean;
}

interface ActivityData {
  id: string;
  type: string;
  description: string;
  outcome: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

interface FollowUpItem {
  activity: ActivityData;
  opportunity: {
    id: string;
    title: string;
    stage: string;
    assignedTo: string | null;
  };
}

interface FollowUpsResponse {
  followUps: FollowUpItem[];
  overdue: FollowUpItem[];
  upcoming: FollowUpItem[];
  overdueCount: number;
  upcomingCount: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FollowUpScheduler = memo(function FollowUpScheduler({
  opportunityId,
  className,
  compact = false,
}: FollowUpSchedulerProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({
    description: "",
    scheduledAt: "",
  });

  // Fetch upcoming follow-ups
  const { data, isLoading, error } = useQuery<FollowUpsResponse>({
    queryKey: queryKeys.pipeline.followUps(opportunityId),
    queryFn: async () => {
      const result = await getUpcomingFollowUps({
        data: { opportunityId, days: 30 },
      });
      return result as FollowUpsResponse;
    },
  });

  // Schedule new follow-up mutation
  const scheduleMutation = useMutation({
    mutationFn: async () => {
      return logActivity({
        data: {
          opportunityId,
          type: "follow_up",
          description: newFollowUp.description,
          scheduledAt: new Date(newFollowUp.scheduledAt),
        },
      });
    },
    onSuccess: () => {
      toastSuccess("Follow-up scheduled successfully.");
      setIsDialogOpen(false);
      setNewFollowUp({ description: "", scheduledAt: "" });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.followUps(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.activityTimeline(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(opportunityId) });
    },
    onError: () => {
      toastError("Failed to schedule follow-up. Please try again.");
    },
  });

  // Complete follow-up mutation
  const completeMutation = useMutation({
    mutationFn: async ({ id, outcome }: { id: string; outcome?: string }) => {
      return completeActivity({
        data: { id, outcome },
      });
    },
    onSuccess: () => {
      toastSuccess("Follow-up marked as complete.");
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.followUps(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.activityTimeline(opportunityId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.detail(opportunityId) });
    },
    onError: () => {
      toastError("Failed to complete follow-up. Please try again.");
    },
  });

  // Calculate days until/since due
  const getDaysUntilDue = (scheduledAt: Date | null): number => {
    if (!scheduledAt) return 0;
    const now = new Date();
    const scheduled = typeof scheduledAt === "string" ? new Date(scheduledAt) : scheduledAt;
    const diffTime = scheduled.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Check if overdue
  const isOverdue = (item: FollowUpItem): boolean => {
    if (!item.activity.scheduledAt) return false;
    const scheduled = typeof item.activity.scheduledAt === "string"
      ? new Date(item.activity.scheduledAt)
      : item.activity.scheduledAt;
    return scheduled < new Date();
  };

  // Format due date
  const formatDueDate = (item: FollowUpItem) => {
    if (!item.activity.scheduledAt) return "No date";
    const scheduled = typeof item.activity.scheduledAt === "string"
      ? new Date(item.activity.scheduledAt)
      : item.activity.scheduledAt;
    const daysUntilDue = getDaysUntilDue(item.activity.scheduledAt);

    if (isOverdue(item)) {
      const daysOverdue = Math.abs(daysUntilDue);
      return `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`;
    }
    if (daysUntilDue === 0) {
      return "Due today";
    }
    if (daysUntilDue === 1) {
      return "Due tomorrow";
    }
    if (daysUntilDue <= 7) {
      return `Due in ${daysUntilDue} days`;
    }
    return scheduled.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  // Get default datetime for new follow-up (tomorrow at 9am)
  const getDefaultDateTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowUp.description.trim() || !newFollowUp.scheduledAt) return;
    scheduleMutation.mutate();
  };

  // Use API-provided overdue and upcoming arrays
  const overdue = data?.overdue ?? [];
  const upcoming = data?.upcoming ?? [];

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className={compact ? "text-base" : undefined}>
            Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className={compact ? "text-base" : undefined}>
            Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load follow-ups.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalCount = (overdue.length + upcoming.length);

  return (
    <Card className={className}>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn(compact && "text-base", "flex items-center gap-2")}>
              <Clock className="h-4 w-4" />
              Follow-ups
              {overdue.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {overdue.length} overdue
                </Badge>
              )}
            </CardTitle>
            {!compact && (
              <CardDescription>
                {totalCount} scheduled follow-up{totalCount !== 1 ? "s" : ""}
              </CardDescription>
            )}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size={compact ? "sm" : "default"}>
                <Plus className="h-4 w-4 mr-1" />
                {compact ? "Add" : "Schedule Follow-up"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Schedule Follow-up</DialogTitle>
                  <DialogDescription>
                    Create a reminder to follow up on this opportunity.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="follow-up-description">What needs to be done?</Label>
                    <Textarea
                      id="follow-up-description"
                      value={newFollowUp.description}
                      onChange={(e) =>
                        setNewFollowUp((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="e.g., Call to discuss pricing, Send revised quote..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="follow-up-date">When?</Label>
                    <Input
                      id="follow-up-date"
                      type="datetime-local"
                      value={newFollowUp.scheduledAt || getDefaultDateTime()}
                      onChange={(e) =>
                        setNewFollowUp((f) => ({ ...f, scheduledAt: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !newFollowUp.description.trim() ||
                      !newFollowUp.scheduledAt ||
                      scheduleMutation.isPending
                    }
                  >
                    {scheduleMutation.isPending ? "Scheduling..." : "Schedule"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {totalCount === 0 ? (
          <div className={cn("text-center", compact ? "py-4" : "py-8")}>
            <Calendar className={cn("mx-auto mb-2 text-muted-foreground", compact ? "h-8 w-8" : "h-12 w-12")} />
            <p className="text-sm text-muted-foreground">
              No follow-ups scheduled.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overdue section */}
            {overdue.length > 0 && (
              <div className="space-y-2">
                {!compact && (
                  <h4 className="text-sm font-medium text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Overdue
                  </h4>
                )}
                {overdue.map((item) => (
                  <FollowUpItemComponent
                    key={item.activity.id}
                    item={item}
                    formatDueDate={formatDueDate}
                    isOverdue={isOverdue(item)}
                    onComplete={(outcome) =>
                      completeMutation.mutate({ id: item.activity.id, outcome })
                    }
                    isCompleting={completeMutation.isPending}
                    compact={compact}
                  />
                ))}
              </div>
            )}

            {/* Upcoming section */}
            {upcoming.length > 0 && (
              <div className="space-y-2">
                {!compact && overdue.length > 0 && (
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Upcoming
                  </h4>
                )}
                {upcoming.map((item) => (
                  <FollowUpItemComponent
                    key={item.activity.id}
                    item={item}
                    formatDueDate={formatDueDate}
                    isOverdue={false}
                    onComplete={(outcome) =>
                      completeMutation.mutate({ id: item.activity.id, outcome })
                    }
                    isCompleting={completeMutation.isPending}
                    compact={compact}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ============================================================================
// FOLLOW-UP ITEM SUBCOMPONENT
// ============================================================================

interface FollowUpItemComponentProps {
  item: FollowUpItem;
  formatDueDate: (item: FollowUpItem) => string;
  isOverdue: boolean;
  onComplete: (outcome?: string) => void;
  isCompleting: boolean;
  compact: boolean;
}

const FollowUpItemComponent = memo(function FollowUpItemComponent({
  item,
  formatDueDate,
  isOverdue,
  onComplete,
  isCompleting,
  compact,
}: FollowUpItemComponentProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        isOverdue && "border-destructive bg-destructive/5"
      )}
    >
      <button
        onClick={() => onComplete()}
        disabled={isCompleting}
        className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
        title="Mark as complete"
      >
        <CheckCircle2
          className={cn(
            "h-5 w-5",
            isOverdue
              ? "text-destructive hover:text-green-600"
              : "text-muted-foreground hover:text-green-600"
          )}
        />
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", compact && "line-clamp-2")}>
          {item.activity.description}
        </p>
        <p
          className={cn(
            "text-xs mt-1",
            isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
          )}
        >
          {formatDueDate(item)}
        </p>
      </div>
    </div>
  );
});

export default FollowUpScheduler;
