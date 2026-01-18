/**
 * Scheduled Calls List
 *
 * Data table showing scheduled calls with filtering and actions.
 *
 * @see DOM-COMMS-004c
 */

"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  Calendar,
  CalendarClock,
  Filter,
} from "lucide-react";
import { format, isPast } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

import { getScheduledCalls } from "@/lib/server/scheduled-calls";
import { ScheduledCallBadge } from "./scheduled-call-badge";
import { ScheduledCallActionMenu } from "./scheduled-call-action-menu";
import { CallOutcomeDialog } from "./call-outcome-dialog";

// ============================================================================
// TYPES
// ============================================================================

interface ScheduledCallsListProps {
  customerId?: string;
  assigneeId?: string;
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
  status: "pending" | "completed" | "cancelled" | "rescheduled";
  outcome?: string | null;
  outcomeNotes?: string | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  organizationId: string;
}

interface CallsResponse {
  items: ScheduledCall[];
  total: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduledCallsList({
  customerId,
  assigneeId,
  className,
}: ScheduledCallsListProps) {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedCallForOutcome, setSelectedCallForOutcome] = React.useState<
    string | null
  >(null);

  // Fetch scheduled calls
  const { data: callsData, isLoading } = useQuery({
    queryKey: ["scheduled-calls", customerId, assigneeId, statusFilter],
    queryFn: () =>
      getScheduledCalls({
        data: {
          customerId,
          assigneeId,
          status:
            statusFilter === "all"
              ? undefined
              : (statusFilter as ScheduledCall["status"]),
          limit: 50,
        },
      }),
  });

  const calls = (callsData as CallsResponse | undefined)?.items ?? [];

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
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

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rescheduled">Rescheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {calls.length} call{calls.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Empty State */}
      {calls.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarClock className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No calls found</EmptyTitle>
            <EmptyDescription>
              {statusFilter === "all"
                ? "No scheduled calls yet."
                : `No ${statusFilter} calls.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Calls Table */}
      {calls.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => {
                const scheduledDate = new Date(call.scheduledAt);
                const isOverdue =
                  call.status === "pending" && isPast(scheduledDate);
                const purposeLabel = call.purpose
                  .replace("_", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase());

                return (
                  <TableRow
                    key={call.id}
                    className={cn(isOverdue && "bg-destructive/5")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ScheduledCallBadge
                          status={call.status}
                          variant="default"
                        />
                        {isOverdue && (
                          <span className="text-xs font-medium text-destructive">
                            Overdue
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            {format(scheduledDate, "MMM d, yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(scheduledDate, "h:mm a")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{purposeLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground line-clamp-2">
                        {call.notes || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {call.status === "pending" && (
                        <ScheduledCallActionMenu
                          callId={call.id}
                          scheduledAt={scheduledDate}
                          onComplete={() => setSelectedCallForOutcome(call.id)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

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
    </div>
  );
}
