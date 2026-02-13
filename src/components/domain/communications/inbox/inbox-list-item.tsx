/**
 * Inbox List Item Component
 *
 * Individual email item in the inbox list (left pane).
 * Based on Square UI email list pattern.
 *
 * @source email item from InboxEmailItem type
 *
 * @see _reference/.square-ui-reference/templates/emails/components/emails/email-list.tsx
 */

import { formatDistanceToNow } from "date-fns";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InboxSourceIcon } from "./inbox-source-icon";
import type { InboxEmailItem } from "@/lib/schemas/communications/inbox";

interface InboxListItemProps {
  email: InboxEmailItem;
  isSelected: boolean;
  onClick: () => void;
}

function getTypeLabel(type: InboxEmailItem["type"]): string {
  switch (type) {
    case "history":
      return "Email";
    case "scheduled":
      return "Scheduled";
    case "campaign":
      return "Campaign";
    default:
      return "Email";
  }
}

export function InboxListItem({ email, isSelected, onClick }: InboxListItemProps) {
  const avatarInitial = email.from.name.charAt(0).toUpperCase();
  const relativeTime = formatDistanceToNow(email.sentAt || email.createdAt, { addSuffix: true });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full gap-2.5 border-b border-border p-4 text-left transition-colors hover:bg-muted/70 cursor-pointer",
        isSelected && "bg-muted",
        !email.read && "bg-muted/50 font-semibold"
      )}
      aria-selected={isSelected}
      aria-label={`Email from ${email.from.name}: ${email.subject}`}
    >
      <Avatar className="mt-1.5 size-7 shrink-0">
        <AvatarImage src={email.from.avatar ?? undefined} alt={email.from.name} />
        <AvatarFallback>{avatarInitial}</AvatarFallback>
      </Avatar>

      <div className="flex-1 overflow-hidden min-w-0">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex-1 overflow-hidden min-w-0">
            <div className="flex items-center gap-1">
              {/* Show source icon for synced emails */}
              {email.metadata && (
                <InboxSourceIcon metadata={email.metadata} email={email.from.email} />
              )}
              <p
                className={cn(
                  "truncate text-[14px] tracking-tight",
                  !email.read || isSelected
                    ? "font-semibold text-foreground"
                    : "font-medium text-foreground"
                )}
              >
                {email.from.name}
              </p>
            </div>
            <p className="truncate text-[12px] tracking-tight text-muted-foreground">
              {email.from.email}
            </p>
          </div>
          <p
            className={cn(
              "shrink-0 text-[12px] tracking-tight",
              !email.read ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {relativeTime}
          </p>
        </div>

        <div className="mt-1.5 space-y-0.5">
          <p
            className={cn(
              "line-clamp-1 text-[14px] tracking-tight",
              !email.read || isSelected
                ? "font-semibold text-foreground"
                : "font-medium text-foreground"
            )}
          >
            {email.subject}
          </p>
          <p
            className={cn(
              "line-clamp-2 text-[12px] leading-relaxed tracking-tight",
              !email.read || isSelected
                ? "text-foreground/80"
                : "text-muted-foreground"
            )}
          >
            {email.preview}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-medium">
            {getTypeLabel(email.type)}
          </Badge>
          {email.customerId && (
            <Link
              to="/customers/$customerId"
              params={{ customerId: email.customerId }}
              search={{}}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-muted-foreground truncate hover:underline"
            >
              {email.to.name}
            </Link>
          )}
          {!email.read && (
            <span
              className="ml-auto h-2 w-2 rounded-full bg-primary shrink-0"
              aria-label="Unread email"
            />
          )}
        </div>
      </div>
    </button>
  );
}
