/**
 * Job Progress Notification Component
 *
 * Displays progress for long-running background jobs with real-time updates.
 * Shows success/error state on completion with appropriate actions.
 *
 * @see _Initiation/_prd/1-foundation/notifications/notifications.prd.json CC-NOTIFY-008b
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  FileUp,
  FileDown,
  Database,
  FileSpreadsheet,
  Trash2,
  Cog,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks";
import type { Job, JobStatus, JobType, AutomationJobMetadata } from "@/lib/schemas/automation-jobs";

// ============================================================================
// JOB TYPE ICONS
// ============================================================================

const JOB_TYPE_ICONS: Record<JobType, typeof FileUp> = {
  import: FileUp,
  export: FileDown,
  bulk_update: Database,
  report_generation: FileSpreadsheet,
  data_sync: RefreshCw,
  cleanup: Trash2,
  other: Cog,
};

// ============================================================================
// VARIANTS
// ============================================================================

const jobProgressVariants = cva(
  "relative flex flex-col gap-2 rounded-lg border p-4 shadow-md transition-all",
  {
    variants: {
      status: {
        pending: "border-muted bg-card",
        running: "border-primary/30 bg-card",
        completed: "border-success/30 bg-card",
        failed: "border-destructive/30 bg-card",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

const progressBarVariants = cva("transition-all", {
  variants: {
    status: {
      pending: "bg-muted",
      running: "bg-primary",
      completed: "bg-success",
      failed: "bg-destructive",
    },
    animated: {
      true: "animate-pulse",
      false: "",
    },
  },
  defaultVariants: {
    status: "running",
    animated: false,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface JobProgressNotificationProps
  extends VariantProps<typeof jobProgressVariants> {
  /** The job to display progress for */
  job: Job;
  /** Called when the close button is clicked */
  onClose?: () => void;
  /** Called when retry button is clicked (for failed jobs) */
  onRetry?: (jobId: string) => void | Promise<void>;
  /** Called when view details is clicked */
  onViewDetails?: (jobId: string) => void;
  /** URL to navigate to on completion */
  resultUrl?: string;
  /** Additional CSS classes */
  className?: string;
}

export interface JobProgressNotificationListProps {
  /** List of jobs to display */
  jobs: Job[];
  /** Called when a job notification is closed */
  onCloseJob?: (jobId: string) => void;
  /** Called when retry is clicked on a failed job */
  onRetryJob?: (jobId: string) => void | Promise<void>;
  /** Called when view details is clicked */
  onViewJobDetails?: (jobId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// STATUS ICON COMPONENT
// ============================================================================

function StatusIcon({ status }: { status: JobStatus }) {
  switch (status) {
    case "pending":
      return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />;
    case "running":
      return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    case "completed":
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-destructive" />;
    default:
      return null;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function JobProgressNotification({
  job,
  onClose,
  onRetry,
  onViewDetails,
  resultUrl,
  className,
}: JobProgressNotificationProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isRetrying, setIsRetrying] = React.useState(false);

  const JobTypeIcon = JOB_TYPE_ICONS[job.type] || Cog;
  const metadata = (job.metadata || {}) as AutomationJobMetadata;
  const isActive = job.status === "pending" || job.status === "running";
  const isComplete = job.status === "completed";
  const isFailed = job.status === "failed";

  // Get progress display text
  const getProgressText = () => {
    if (metadata.processedItems !== undefined && metadata.totalItems !== undefined) {
      return `${metadata.processedItems} of ${metadata.totalItems}`;
    }
    return `${job.progress}%`;
  };

  // Get status message
  const getStatusMessage = () => {
    if (metadata.currentStep) {
      return metadata.currentStep;
    }
    switch (job.status) {
      case "pending":
        return "Waiting to start...";
      case "running":
        return "Processing...";
      case "completed":
        return "Completed successfully";
      case "failed":
        return metadata.error?.message || "Job failed";
      default:
        return "";
    }
  };

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry(job.id);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleViewDetails = () => {
    if (resultUrl) {
      window.location.href = resultUrl;
    } else if (onViewDetails) {
      onViewDetails(job.id);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${job.name}: ${getStatusMessage()}`}
      className={cn(
        jobProgressVariants({ status: job.status }),
        prefersReducedMotion ? "" : "animate-in slide-in-from-bottom-2",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <JobTypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{job.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusIcon status={job.status} />
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-1">
        <Progress
          value={job.progress}
          className={cn(
            "h-2",
            progressBarVariants({
              status: job.status,
              animated: isActive && !prefersReducedMotion,
            })
          )}
          aria-label={`Progress: ${job.progress}%`}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{getStatusMessage()}</span>
          <span>{getProgressText()}</span>
        </div>
      </div>

      {/* Actions */}
      {(isComplete || isFailed) && (
        <div className="flex items-center gap-2 pt-1">
          {isFailed && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="h-8"
            >
              {isRetrying ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Retry
            </Button>
          )}
          {(resultUrl || onViewDetails) && (
            <Button
              variant={isComplete ? "default" : "outline"}
              size="sm"
              onClick={handleViewDetails}
              className="h-8"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {isComplete ? "View Results" : "View Details"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LIST COMPONENT
// ============================================================================

export function JobProgressNotificationList({
  jobs,
  onCloseJob,
  onRetryJob,
  onViewJobDetails,
  className,
}: JobProgressNotificationListProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Active jobs"
      className={cn("flex flex-col gap-2", className)}
    >
      {jobs.map((job) => (
        <JobProgressNotification
          key={job.id}
          job={job}
          onClose={onCloseJob ? () => onCloseJob(job.id) : undefined}
          onRetry={onRetryJob}
          onViewDetails={onViewJobDetails}
        />
      ))}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { JOB_TYPE_ICONS };
