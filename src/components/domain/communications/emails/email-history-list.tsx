/**
 * Email History List
 *
 * Displays organization-level email delivery history.
 */
import { format } from "date-fns";
import { Link } from "@tanstack/react-router";
import { Mail, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, EmptyStateContainer } from "@/components/shared/empty-state";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  sent: { label: "Sent", variant: "secondary" },
  delivered: { label: "Delivered", variant: "default" },
  opened: { label: "Opened", variant: "default" },
  clicked: { label: "Clicked", variant: "default" },
  bounced: { label: "Bounced", variant: "outline" },
  failed: { label: "Failed", variant: "outline" },
  pending: { label: "Pending", variant: "secondary" },
};

import type {
  EmailHistoryListItem,
  EmailHistoryListProps,
} from "@/lib/schemas/communications";

// Re-export types for backward compatibility
export type { EmailHistoryListItem, EmailHistoryListProps };

export function EmailHistoryList({
  items,
  isLoading = false,
  error,
  hasNextPage = false,
}: EmailHistoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">
            Unable to load email history. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyStateContainer variant="page">
        <EmptyState
          icon={Mail}
          title="No email history yet"
          message="Sent emails will appear here once campaigns or scheduled emails are delivered."
        />
      </EmptyStateContainer>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const status = STATUS_LABELS[item.status] ?? STATUS_LABELS.pending;
        const sentAt = item.sentAt ? new Date(item.sentAt) : new Date(item.createdAt);
        const customerName = item.customerName ?? item.toAddress;

        return (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base">{item.subject || "(No subject)"}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    To:{" "}
                    {item.customerId && customerName ? (
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: item.customerId }}
                        search={{}}
                        className="font-medium hover:underline text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {customerName}
                      </Link>
                    ) : (
                      customerName
                    )}{" "}
                    · From: {item.fromAddress}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(sentAt, "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              <p className="line-clamp-2">{item.bodyText || "No preview available."}</p>
            </CardContent>
          </Card>
        );
      })}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" disabled>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmailHistoryList;
