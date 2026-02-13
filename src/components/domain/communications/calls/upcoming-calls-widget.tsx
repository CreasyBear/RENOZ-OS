/**
 * Upcoming Calls Widget
 *
 * Container/Presenter pattern for dashboard widget showing upcoming scheduled calls.
 * Container handles data fetching, presenter handles UI rendering.
 *
 * @see DOM-COMMS-004c
 * @see STANDARDS.md - Container/Presenter Pattern
 */

"use client";

import * as React from "react";
import { useMemo } from "react";
import { useScheduledCalls } from "@/hooks/communications/use-scheduled-calls";
import {
  Phone,
  Clock,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { formatDistanceToNow, isPast, format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { ScheduledCallActionMenu } from "./scheduled-call-action-menu";
import { CallOutcomeDialog } from "./call-outcome-dialog";

// ============================================================================
// TYPES
// ============================================================================

import type {
  ScheduledCall,
  UpcomingCallsWidgetProps,
  CallItemProps,
} from "@/lib/schemas/communications";

// ============================================================================
// PRESENTER COMPONENTS
// ============================================================================

/**
 * Call Item Presenter
 * Pure UI component for individual call item
 */
function CallItem({ call, isOverdue, onComplete }: CallItemProps) {
  const scheduledDate = new Date(call.scheduledAt);
  const timeDisplay = formatDistanceToNow(scheduledDate, { addSuffix: true });
  const purposeLabel = call.purpose
    .replace("_", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3",
        isOverdue && "bg-destructive/5"
      )}
    >
      {/* Status Icon */}
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          isOverdue
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary"
        )}
      >
        {isOverdue ? (
          <AlertTriangle className="h-5 w-5" aria-label="Overdue call" />
        ) : (
          <Phone className="h-5 w-5" aria-label="Scheduled call" />
        )}
      </div>

      {/* Call Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{purposeLabel}</span>
          {isOverdue && (
            <span className="text-xs font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
              OVERDUE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span
            className={cn(isOverdue && "text-destructive font-medium")}
          >
            {timeDisplay}
          </span>
          <span>·</span>
          <span>{format(scheduledDate, "h:mm a")}</span>
        </div>
      </div>

      {/* Actions */}
      <ScheduledCallActionMenu
        callId={call.id}
        scheduledAt={scheduledDate}
        onComplete={onComplete}
      />
    </div>
  );
}

/**
 * Upcoming Calls Widget Presenter
 * Pure UI component - receives data via props
 */
interface UpcomingCallsWidgetPresenterProps {
  /** @source useScheduledCalls hook in UpcomingCallsWidgetContainer */
  overdueCalls: ScheduledCall[];
  /** @source useScheduledCalls hook in UpcomingCallsWidgetContainer */
  upcomingCalls: ScheduledCall[];
  className?: string;
  onCallComplete: (callId: string) => void;
  selectedCallForOutcome: string | null;
  onSelectedCallChange: (callId: string | null) => void;
}

function UpcomingCallsWidgetPresenter({
  overdueCalls,
  upcomingCalls,
  className,
  onCallComplete,
  selectedCallForOutcome,
  onSelectedCallChange,
}: UpcomingCallsWidgetPresenterProps) {
  const allCalls = [...overdueCalls, ...upcomingCalls];
  const selectedCall = selectedCallForOutcome
    ? allCalls.find((call) => call.id === selectedCallForOutcome)
    : null;

  return (
    <Card className={className} aria-label="upcoming-calls-widget">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Upcoming Calls
              {allCalls.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {allCalls.length}
                </span>
              )}
            </CardTitle>
            {overdueCalls.length > 0 && (
              <CardDescription className="text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                {overdueCalls.length} overdue
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="divide-y px-4">
            {/* Overdue calls first */}
            {overdueCalls.map((call) => (
              <CallItem
                key={call.id}
                call={call}
                isOverdue
                onComplete={() => onCallComplete(call.id)}
              />
            ))}

            {/* Upcoming calls */}
            {upcomingCalls.map((call) => (
              <CallItem
                key={call.id}
                call={call}
                isOverdue={false}
                onComplete={() => onCallComplete(call.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Outcome Dialog */}
      {selectedCallForOutcome && selectedCall && (
        <CallOutcomeDialog
          callId={selectedCallForOutcome}
          customerId={selectedCall.customerId}
          defaultOpen
          onOpenChange={(open) => {
            if (!open) onSelectedCallChange(null);
          }}
        />
      )}
    </Card>
  );
}

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

/**
 * Upcoming Calls Widget Container
 * Handles data fetching and business logic
 * @source calls from useScheduledCalls hook
 */
export function UpcomingCallsWidget({
  userId,
  limit = 5,
  className,
}: UpcomingCallsWidgetProps) {
  const [selectedCallForOutcome, setSelectedCallForOutcome] = React.useState<
    string | null
  >(null);

  // Fetch upcoming calls
  const { data: callsData, isLoading } = useScheduledCalls({
    assigneeId: userId,
    status: "pending",
    fromDate: new Date(),
    limit,
  });

  const calls = useMemo(() => callsData?.items ?? [], [callsData]);

  // Memoize filtered calls for performance
  const { overdueCalls, upcomingCalls } = useMemo(() => {
    const overdue = calls.filter((call) => isPast(new Date(call.scheduledAt)));
    const upcoming = calls.filter((call) => !isPast(new Date(call.scheduledAt)));
    return { overdueCalls: overdue, upcomingCalls: upcoming };
  }, [calls]);

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={className} aria-label="upcoming-calls-widget">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Upcoming Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (calls.length === 0) {
    return (
      <Card className={className} aria-label="upcoming-calls-widget">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Upcoming Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarClock className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No calls scheduled</EmptyTitle>
              <EmptyDescription>
                Schedule follow-up calls to stay in touch with your customers.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <UpcomingCallsWidgetPresenter
      overdueCalls={overdueCalls}
      upcomingCalls={upcomingCalls}
      className={className}
      onCallComplete={setSelectedCallForOutcome}
      selectedCallForOutcome={selectedCallForOutcome}
      onSelectedCallChange={setSelectedCallForOutcome}
    />
  );
}
