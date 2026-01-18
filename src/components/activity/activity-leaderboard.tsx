/**
 * Activity Leaderboard Component
 *
 * Displays top users by activity count with ranking and avatars.
 *
 * @see ACTIVITY-DASHBOARD-UI acceptance criteria
 */

import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award } from "lucide-react";
import { useActivityLeaderboard } from "@/hooks/use-activities";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityLeaderboardProps {
  /** Date range start */
  dateFrom?: Date;
  /** Date range end */
  dateTo?: Date;
  /** Maximum number of users to show */
  limit?: number;
  /** Show loading skeleton */
  showSkeleton?: boolean;
  className?: string;
}

interface LeaderboardEntry {
  userId: string;
  userName: string | null;
  userEmail: string;
  activityCount: number;
  rank: number;
}

// ============================================================================
// UTILITIES
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

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-yellow-500" aria-hidden="true" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" aria-hidden="true" />;
    case 3:
      return <Award className="w-5 h-5 text-amber-600" aria-hidden="true" />;
    default:
      return (
        <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">
          {rank}
        </span>
      );
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function LeaderboardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading leaderboard">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

function LeaderboardEmpty() {
  return (
    <div
      className="flex flex-col items-center justify-center py-8 text-center"
      role="status"
      aria-label="No leaderboard data"
    >
      <Trophy className="w-8 h-8 text-muted-foreground/50 mb-2" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">No activity data for this period</p>
    </div>
  );
}

function LeaderboardRow({
  entry,
  maxCount,
}: {
  entry: LeaderboardEntry;
  maxCount: number;
}) {
  const percentage = (entry.activityCount / maxCount) * 100;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 p-2 rounded-lg transition-colors",
        entry.rank <= 3 && "bg-muted/50"
      )}
    >
      {/* Progress bar background */}
      <div
        className="absolute inset-0 rounded-lg bg-primary/5"
        style={{ width: `${percentage}%` }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative flex items-center gap-3 flex-1 z-10">
        {/* Rank */}
        <div className="w-6 flex justify-center" aria-label={`Rank ${entry.rank}`}>
          {getRankIcon(entry.rank)}
        </div>

        {/* Avatar */}
        <Avatar className="w-8 h-8">
          <AvatarFallback className="text-xs">
            {getInitials(entry.userName, entry.userEmail)}
          </AvatarFallback>
        </Avatar>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {entry.userName ?? entry.userEmail}
          </p>
        </div>

        {/* Count */}
        <div className="text-sm font-medium tabular-nums">
          {entry.activityCount.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays top users by activity count.
 *
 * @example
 * ```tsx
 * <ActivityLeaderboard
 *   dateFrom={startOfMonth(new Date())}
 *   dateTo={new Date()}
 *   limit={10}
 * />
 * ```
 */
export function ActivityLeaderboard({
  dateFrom,
  dateTo,
  limit = 10,
  showSkeleton = true,
  className,
}: ActivityLeaderboardProps) {
  const { data, isLoading, isError, refetch } = useActivityLeaderboard({
    dateFrom,
    dateTo,
  });

  if (isLoading && showSkeleton) {
    return <LeaderboardSkeleton count={Math.min(limit, 5)} />;
  }

  if (isError) {
    return (
      <div className="text-center py-4" role="alert">
        <p className="text-sm text-destructive mb-2">Failed to load leaderboard</p>
        <button
          onClick={() => refetch()}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Limit entries client-side since API doesn't support limit param
  const allEntries = (data ?? []) as LeaderboardEntry[];
  const entries = allEntries.slice(0, limit);

  if (entries.length === 0) {
    return <LeaderboardEmpty />;
  }

  const maxCount = entries[0]?.activityCount ?? 1;

  return (
    <div
      className={cn("space-y-1", className)}
      role="list"
      aria-label="Top users by activity"
    >
      {entries.map((entry) => (
        <LeaderboardRow
          key={entry.userId}
          entry={entry}
          maxCount={maxCount}
        />
      ))}
    </div>
  );
}
