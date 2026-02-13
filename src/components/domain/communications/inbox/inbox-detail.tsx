/**
 * Inbox Detail Component (Presenter)
 *
 * Right pane detail view for selected email.
 * Shows full email content, tracking timeline, and actions.
 * Enhanced with navigation and action toolbar from Square UI reference.
 *
 * @source email from InboxEmailItem type
 *
 * @see _reference/.square-ui-reference/templates/emails/components/emails/email-detail.tsx
 * @see _reference/project-management-reference/components/inbox/InboxPage.tsx
 */

import { format } from "date-fns";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Mail,
  MoreVertical,
  Reply,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmailTrackingTimeline } from "../emails/email-tracking-timeline";
import { EmailTrackingBadge, type EmailStatus } from "../emails/email-tracking-badge";
import type { InboxDetailProps } from "@/lib/schemas/communications/inbox";

export function InboxDetail({
  email,
  isLoading = false,
  onMarkAsRead,
  onStar,
  onArchive,
  onDelete,
  onReply,
  onForward,
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
  onClose,
  className,
}: InboxDetailProps) {
  if (isLoading) {
    return (
      <div className={`flex-1 min-h-0 flex flex-col ${className ?? ""}`}>
        <div className="border-b border-border px-3 md:px-6 py-3 md:py-4">
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="border-b border-border px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-3 md:p-6 space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full mt-4" />
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className={`flex-1 min-h-0 flex items-center justify-center ${className ?? ""}`}>
        <div className="text-center text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select an email from the list to view details</p>
        </div>
      </div>
    );
  }

  const avatarInitial = email.from.name.charAt(0).toUpperCase();
  const formattedDate = email.sentAt
    ? format(email.sentAt, "MMMM dd, yyyy hh:mm")
    : format(email.createdAt, "MMMM dd, yyyy hh:mm");

  const isFirstEmail = currentIndex === 0;
  const isLastEmail = currentIndex !== undefined && totalCount !== undefined && currentIndex === totalCount - 1;

  return (
    <div className={`flex-1 min-h-0 flex flex-col bg-card ${className ?? ""}`}>
      {/* Action Toolbar Header - Square UI pattern */}
      <div className="flex items-center justify-between border-b border-border px-3 md:px-6 py-3 md:py-4">
        <div className="hidden lg:flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Archive</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onDelete?.(email.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onReply?.(email.id)}
                >
                  <Reply className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reply</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onForward?.(email.id)}
                >
                  <Send className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Forward</p>
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {!email.read && onMarkAsRead && (
                  <DropdownMenuItem onClick={() => onMarkAsRead(email.id)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onArchive?.(email.id)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete?.(email.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>

        {/* Mobile actions */}
        <div className="flex lg:hidden items-center gap-1 md:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => onArchive?.(email.id)}>
                <Archive className="h-4 w-4 mr-2" />
                <span>Archive</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReply?.(email.id)}>
                <Reply className="h-4 w-4 mr-2" />
                <span>Reply</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onForward?.(email.id)}>
                <Send className="h-4 w-4 mr-2" />
                <span>Forward</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!email.read && onMarkAsRead && (
                <DropdownMenuItem onClick={() => onMarkAsRead(email.id)}>
                  <Mail className="h-4 w-4 mr-2" />
                  <span>Mark as read</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(email.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation - Square UI pattern */}
        <div className="flex items-center gap-2 md:gap-3">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hidden md:flex h-8 w-8"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          {currentIndex !== undefined && totalCount !== undefined && (
            <p className="hidden sm:block text-[11px] md:text-[13px] text-muted-foreground whitespace-nowrap">
              {currentIndex + 1} of {totalCount}
            </p>
          )}
          <div className="flex items-center gap-0.5 md:gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              disabled={isFirstEmail}
              className="h-8 w-8"
            >
              <ChevronLeft
                className={cn(
                  "h-4 w-4",
                  isFirstEmail ? "text-muted-foreground/30" : "text-muted-foreground"
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={isLastEmail}
              className="h-8 w-8"
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4",
                  isLastEmail ? "text-muted-foreground/30" : "text-muted-foreground"
                )}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Email Header */}
      <div className="border-b border-border px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-start md:items-center justify-between gap-2 md:gap-4">
          <div className="flex items-start md:items-center gap-2 md:gap-2.5 flex-1 min-w-0">
            <Avatar className="size-8 md:size-10 shrink-0">
              <AvatarImage src={email.from.avatar ?? undefined} alt={email.from.name} />
              <AvatarFallback className="text-xs font-semibold">{avatarInitial}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-medium text-sm md:text-base text-foreground truncate">
                  {email.from.name}
                </p>
              </div>
              <p className="text-[12px] md:text-[14px] text-muted-foreground truncate">
                <span className="hidden sm:inline">From: </span>
                <span className="text-foreground">{email.from.email}</span>
              </p>
              <p className="text-[11px] md:hidden text-muted-foreground mt-0.5">
                {formattedDate}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <p className="hidden lg:block text-[14px] text-muted-foreground opacity-70 whitespace-nowrap">
              {formattedDate}
            </p>
            {onStar && (
              <Button variant="ghost" size="icon" onClick={() => onStar(email.id)} className="h-8 w-8">
                <Star
                  className={cn(
                    "h-4 w-4",
                    email.starred
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-muted-foreground"
                  )}
                />
              </Button>
            )}
            <EmailTrackingBadge
              tracking={{
                status: email.status as EmailStatus,
                sentAt: email.sentAt,
                openedAt: null,
                clickedAt: null,
              }}
            />
            <Badge variant={email.read ? "outline" : "default"} className="h-6 rounded-full px-2 text-[10px]">
              {email.read ? "Read" : "Unread"}
            </Badge>
          </div>

          {/* Mobile header actions */}
          <div className="flex md:hidden items-center gap-1 shrink-0">
            {onStar && (
              <Button variant="ghost" size="icon" onClick={() => onStar(email.id)} className="h-8 w-8">
                <Star
                  className={cn(
                    "h-4 w-4",
                    email.starred
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-muted-foreground"
                  )}
                />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-6 py-3 md:py-4">
        <p className="mb-3 md:mb-4 text-[18px] md:text-[20px] font-medium leading-tight tracking-tight text-foreground">
          {email.subject}
        </p>

        {email.bodyHtml ? (
          <div
            className="text-sm md:text-[14px] leading-relaxed text-foreground/80 dark:text-[#cccccc] prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
          />
        ) : email.bodyText ? (
          <div className="text-sm md:text-[14px] leading-relaxed text-foreground/80 dark:text-[#cccccc] whitespace-pre-wrap">
            {email.bodyText}
          </div>
        ) : (
          <div className="text-sm md:text-[14px] leading-relaxed text-muted-foreground">
            {email.preview}
          </div>
        )}

        {/* Tracking Timeline - if available */}
        {email.type === "history" && email.sentAt && (
          <div className="mt-6 pt-6 border-t border-border">
            <EmailTrackingTimeline
              emailId={email.id}
              sentAt={email.sentAt}
              deliveredAt={null}
              openedAt={null}
              clickedAt={null}
              bouncedAt={null}
              bounceReason={null}
              linkClicks={{ clicks: [], totalClicks: 0, uniqueLinksClicked: 0 }}
            />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 px-3 md:px-6 pb-3 md:pb-4 border-t border-border pt-3 md:pt-4">
        <div className="flex items-center gap-2">
          {email.customerId && (
            <Link
              to="/customers/$customerId"
              params={{ customerId: email.customerId }}
              search={{}}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              View Customer
            </Link>
          )}
          {email.campaignId && (
            <Link
              to="/communications/campaigns/$campaignId"
              params={{ campaignId: email.campaignId }}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              View Campaign
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onReply && (
            <Button size="sm" variant="outline" onClick={() => onReply(email.id)}>
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
          )}
          {onForward && (
            <Button size="sm" variant="outline" onClick={() => onForward(email.id)}>
              <Send className="h-4 w-4 mr-2" />
              Forward
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
