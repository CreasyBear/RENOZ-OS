/**
 * Upcoming Calls Widget
 *
 * Dashboard widget showing upcoming scheduled calls with action menu.
 * Uses color AND icon indicators for overdue calls.
 *
 * @see DOM-COMMS-004c
 */

"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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

import { getScheduledCalls } from "@/lib/server/scheduled-calls";
import { ScheduledCallActionMenu } from "./scheduled-call-action-menu";
import { CallOutcomeDialog } from "./call-outcome-dialog";

// ============================================================================
// TYPES
// ============================================================================

interface UpcomingCallsWidgetProps {
  userId?: string;
  limit?: number;
  className?: string;
}

interface ScheduledCall {
  id: string;
  customerId: string;
  assigneeId: string;
  scheduledAt: Date;
  reminderAt: Date | null;
  purpose: string;
  notes: string | null;
  status: string;
  organizationId: string;
}

interface CallsResponse {
  items: ScheduledCall[];
  total: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UpcomingCallsWidget({
  userId,
  limit = 5,
  className,
}: UpcomingCallsWidgetProps) {
  const [selectedCallForOutcome, setSelectedCallForOutcome] = React.useState<
    string | null
  >(null);

  // Fetch upcoming calls
  const { data: callsData, isLoading } = useQuery({
    queryKey: queryKeys.communications.upcomingCalls({ userId, limit }),
    queryFn: () =>
      getScheduledCalls({
        data: {
          assigneeId: userId,
          status: "pending",
          fromDate: new Date(),
          limit,
        },
      }),
  });

  const calls = (callsData as CallsResponse | undefined)?.items ?? [];

  // Check for overdue calls
  const overdueCalls = calls.filter((call) => isPast(new Date(call.scheduledAt)));
  const upcomingCalls = calls.filter((call) => !isPast(new Date(call.scheduledAt)));

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
    <Card className={className} aria-label="upcoming-calls-widget">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Upcoming Calls
              {calls.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {calls.length}
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
                onComplete={() => setSelectedCallForOutcome(call.id)}
              />
            ))}

            {/* Upcoming calls */}
            {upcomingCalls.map((call) => (
              <CallItem
                key={call.id}
                call={call}
                isOverdue={false}
                onComplete={() => setSelectedCallForOutcome(call.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Outcome Dialog */}
      {selectedCallForOutcome && (
        <CallOutcomeDialog
          callId={selectedCallForOutcome}
          defaultOpen
          onOpenChange={(open) => {
            if (!open) setSelectedCallForOutcome(null);
          }}
        />
      )}
    </Card>
  );
}

// ============================================================================
// CALL ITEM SUBCOMPONENT
// ============================================================================

interface CallItemProps {
  call: ScheduledCall;
  isOverdue: boolean;
  onComplete: () => void;
}

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
