/**
 * Scheduled Call Action Menu
 *
 * Dropdown menu with snooze, reschedule, and cancel options.
 *
 * @see DOM-COMMS-004c
 */

"use client";

import * as React from "react";
import {
  MoreHorizontal,
  Clock,
  XCircle,
  CheckCircle,
  CalendarClock,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { Button } from "@/components/ui/button";

import {
  useCancelCall,
  useRescheduleCall,
} from "@/hooks/communications/use-scheduled-calls";
import { toast } from "sonner";

// ============================================================================
// TYPES
// ============================================================================

interface ScheduledCallActionMenuProps {
  callId: string;
  scheduledAt: Date;
  onComplete?: () => void;
  onReschedule?: () => void;
  trigger?: React.ReactNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SNOOZE_OPTIONS = [
  { label: "15 minutes", minutes: 15 },
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "Tomorrow same time", minutes: 24 * 60 },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduledCallActionMenu({
  callId,
  scheduledAt,
  onComplete,
  onReschedule,
  trigger,
}: ScheduledCallActionMenuProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const snoozeMutation = useRescheduleCall();
  const cancelMutation = useCancelCall();

  const handleSnooze = (minutes: number) => {
    const newScheduledAt = new Date(scheduledAt.getTime() + minutes * 60 * 1000);
    snoozeMutation.mutate(
      {
        id: callId,
        newScheduledAt,
      },
      {
        onSuccess: () => {
          toast.success("Call snoozed");
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to snooze call"
          );
        },
      }
    );
  };

  const handleCancel = () => {
    cancelMutation.mutate(
      {
        id: callId,
        reason: "Cancelled by user",
      },
      {
        onSuccess: () => {
          toast.success("Call cancelled");
          setCancelDialogOpen(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to cancel call"
          );
        },
      }
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger || (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="snooze-menu"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Call Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Complete Call */}
          {onComplete && (
            <DropdownMenuItem onClick={onComplete}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Log Outcome
            </DropdownMenuItem>
          )}

          {/* Snooze Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Clock className="mr-2 h-4 w-4" />
              Snooze
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {SNOOZE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.minutes}
                  onClick={() => handleSnooze(option.minutes)}
                  disabled={snoozeMutation.isPending}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Reschedule */}
          {onReschedule && (
            <DropdownMenuItem onClick={onReschedule}>
              <CalendarClock className="mr-2 h-4 w-4" />
              Reschedule...
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Cancel */}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setCancelDialogOpen(true)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Call
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Call?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the scheduled call. You can schedule a new call
              later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Call</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Call"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
