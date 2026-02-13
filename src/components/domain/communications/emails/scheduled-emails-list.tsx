/**
 * ScheduledEmailsList Component
 *
 * Data table displaying scheduled emails with filtering, sorting, and actions.
 * Supports edit and cancel operations with confirmation dialogs.
 *
 * @see DOM-COMMS-002c
 */

import { memo, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Send,
  Calendar,
  Mail,
  User,
  RefreshCw,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { ScheduledEmailBadge } from "./scheduled-email-badge";

// ============================================================================
// TYPES
// ============================================================================

import type {
  ScheduledEmail,
  ScheduledEmailStatus,
  ScheduledEmailsListProps,
} from "@/lib/schemas/communications";

// Re-export types for backward compatibility
export type { ScheduledEmail, ScheduledEmailStatus, ScheduledEmailsListProps };

// ============================================================================
// SKELETON
// ============================================================================

export function ScheduledEmailsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ScheduledEmailsList = memo(function ScheduledEmailsList({
  items,
  total,
  totalAll,
  isLoading = false,
  error,
  onRefresh,
  isRefreshing = false,
  onCancel,
  isCancelling = false,
  onEdit,
  onCompose,
  className,
}: ScheduledEmailsListProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [emailToCancel, setEmailToCancel] = useState<ScheduledEmail | null>(null);

  const handleCancelClick = useCallback((email: ScheduledEmail) => {
    setEmailToCancel(email);
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (!emailToCancel || !onCancel) return;

    const didCancel = await onCancel(emailToCancel.id);
    if (didCancel) {
      setCancelDialogOpen(false);
      setEmailToCancel(null);
    }
  }, [emailToCancel, onCancel]);

  // Loading state
  if (isLoading) {
    return <ScheduledEmailsSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("border-destructive/50", className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <RefreshCw className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">Failed to load scheduled emails</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
            </div>
            <Button variant="outline" onClick={() => onRefresh?.()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <Empty className={className}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Mail className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>No scheduled emails</EmptyTitle>
          <EmptyDescription>Schedule emails to be sent at a specific time.</EmptyDescription>
        </EmptyHeader>
        {onCompose && (
          <Button onClick={onCompose}>
            <Send className="mr-2 h-4 w-4" />
            Compose Email
          </Button>
        )}
      </Empty>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">Scheduled Emails</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
              <span className="text-sm text-muted-foreground">
                {total} {total === 1 ? "email" : "emails"}
                {totalAll && totalAll !== total && ` of ${totalAll}`}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-[180px]">Scheduled For</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[50px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((email) => (
                <TableRow key={email.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {email.recipientName || "Unknown"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {email.recipientEmail}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="truncate max-w-[300px]">{email.subject}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">
                          {format(new Date(email.scheduledAt), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(email.scheduledAt), "h:mm a")} ({email.timezone})
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ScheduledEmailBadge status={email.status} size="sm" />
                  </TableCell>
                  <TableCell>
                    {email.status === "pending" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Open actions menu"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(email.id)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleCancelClick(email)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Email?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the scheduled email to{" "}
              <strong>{emailToCancel?.recipientEmail}</strong>. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Keep Scheduled
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelling..." : "Cancel Email"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
