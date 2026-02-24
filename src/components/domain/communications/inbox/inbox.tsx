/**
 * Inbox Component (Presenter)
 *
 * Main unified inbox UI with split-pane layout.
 * Combines list and detail views.
 *
 * @source items from useInbox hook
 *
 * @see _reference/project-management-reference/components/inbox/InboxPage.tsx
 * @see _reference/.square-ui-reference/templates/emails/components/emails/email-detail.tsx
 * @see STANDARDS.md - Container/presenter pattern
 */

import { useState, useMemo, useEffect, useCallback, startTransition } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { InboxList } from "./inbox-list";
import { InboxDetail } from "./inbox-detail";
import { DomainFilterBar } from "@/components/shared/filters";
import {
  INBOX_FILTER_CONFIG,
  DEFAULT_INBOX_FILTERS,
  type InboxFiltersState,
} from "./inbox-filter-config";
import {
  useMarkEmailAsRead,
  useToggleEmailStarred,
  useArchiveEmail,
  useDeleteEmail,
} from "@/hooks/communications/use-inbox-actions";
import type { InboxEmailItem } from "@/lib/schemas/communications/inbox";

interface InboxProps {
  items: InboxEmailItem[];
  isLoading?: boolean;
  error?: unknown;
  filters: InboxFiltersState;
  onFiltersChange: (filters: InboxFiltersState) => void;
  /** Called when user retries after list/detail error (replaces window.location.reload) */
  onRetry?: () => void | Promise<void>;
  className?: string;
}

export function Inbox({
  items,
  isLoading = false,
  error,
  filters,
  onFiltersChange,
  onRetry,
  className,
}: InboxProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first item when items change
  useEffect(() => {
    if (!selectedId && items.length > 0) {
      startTransition(() => setSelectedId(items[0].id));
    } else if (selectedId && !items.some((item) => item.id === selectedId)) {
      startTransition(() => setSelectedId(items.length > 0 ? items[0].id : null));
    }
  }, [items, selectedId]);

  const selectedEmail = useMemo(() => {
    if (!selectedId) return null;
    return items.find((item) => item.id === selectedId) ?? null;
  }, [items, selectedId]);

  const currentIndex = useMemo(() => {
    if (!selectedId) return -1;
    return items.findIndex((item) => item.id === selectedId);
  }, [items, selectedId]);

  const handleTabChange = useCallback((tab: string) => {
    onFiltersChange({ ...filters, tab: tab as InboxFiltersState["tab"] });
    setSelectedId(null); // Reset selection on tab change
  }, [filters, onFiltersChange]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedId(items[currentIndex - 1].id);
    }
  }, [currentIndex, items]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setSelectedId(items[currentIndex + 1].id);
    }
  }, [currentIndex, items]);

  // Inbox action mutations
  const markAsReadMutation = useMarkEmailAsRead();
  const toggleStarredMutation = useToggleEmailStarred();
  const archiveMutation = useArchiveEmail();
  const deleteMutation = useDeleteEmail();

  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsReadMutation.mutate(id);
    },
    [markAsReadMutation]
  );

  const handleStar = useCallback(
    (id: string) => {
      toggleStarredMutation.mutate(id);
    },
    [toggleStarredMutation]
  );

  const handleArchive = useCallback(
    (id: string) => {
      archiveMutation.mutate(id);
      // If archiving the selected email, move to next
      if (selectedId === id && currentIndex < items.length - 1) {
        setSelectedId(items[currentIndex + 1].id);
      } else if (selectedId === id && currentIndex > 0) {
        setSelectedId(items[currentIndex - 1].id);
      } else if (selectedId === id) {
        setSelectedId(null);
      }
    },
    [archiveMutation, selectedId, currentIndex, items]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
      // If deleting the selected email, move to next
      if (selectedId === id && currentIndex < items.length - 1) {
        setSelectedId(items[currentIndex + 1].id);
      } else if (selectedId === id && currentIndex > 0) {
        setSelectedId(items[currentIndex - 1].id);
      } else if (selectedId === id) {
        setSelectedId(null);
      }
    },
    [deleteMutation, selectedId, currentIndex, items]
  );

  const openMailto = useCallback((to: string, subject: string, body: string) => {
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  }, []);

  const handleReply = useCallback((id: string) => {
    const email = items.find((item) => item.id === id);
    if (!email) {
      toast.error("Email not found");
      return;
    }

    const replySubject = /^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`;
    const quotedBody = email.bodyText?.trim() || email.preview;
    const body = [
      "",
      "",
      `On ${email.sentAt ? email.sentAt.toLocaleString() : "a previous message"}, ${email.from.name} <${email.from.email}> wrote:`,
      `> ${quotedBody.replace(/\n/g, "\n> ")}`,
    ].join("\n");

    openMailto(email.from.email, replySubject, body);
  }, [items, openMailto]);

  const handleForward = useCallback((id: string) => {
    const email = items.find((item) => item.id === id);
    if (!email) {
      toast.error("Email not found");
      return;
    }

    const forwardSubject = /^fwd:/i.test(email.subject) ? email.subject : `Fwd: ${email.subject}`;
    const forwardedBody = email.bodyText?.trim() || email.preview;
    const body = [
      "",
      "",
      "---------- Forwarded message ---------",
      `From: ${email.from.name} <${email.from.email}>`,
      `Date: ${email.sentAt ? email.sentAt.toLocaleString() : "Unknown"}`,
      `Subject: ${email.subject}`,
      `To: ${email.to.name} <${email.to.email}>`,
      "",
      forwardedBody,
    ].join("\n");

    openMailto("", forwardSubject, body);
  }, [items, openMailto]);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  // j/k navigation (Gmail-style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      // j = next email, k = previous email
      if (e.key === "j" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleNext();
      } else if (e.key === "k" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handlePrevious();
      }
      // r = reply, f = forward, a = archive, d = delete
      else if (selectedEmail) {
        if (e.key === "r" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          handleReply(selectedEmail.id);
        } else if (e.key === "f" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          handleForward(selectedEmail.id);
        } else if (e.key === "a" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          handleArchive(selectedEmail.id);
        } else if (e.key === "d" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          handleDelete(selectedEmail.id);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedEmail, handleNext, handlePrevious, handleReply, handleForward, handleArchive, handleDelete]);

  return (
    <div className={`flex flex-1 flex-col min-h-0 bg-background ${className ?? ""}`}>
      {/* Header */}
      <header className="flex flex-col border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/70">
          <div className="flex items-center gap-3">
            <p className="text-base font-medium text-foreground">Inbox</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled>
              Mark all as read
            </Button>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="flex flex-col gap-2 px-4 pb-3 pt-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full md:w-auto md:justify-start">
            <DomainFilterBar
              config={INBOX_FILTER_CONFIG}
              filters={filters}
              onFiltersChange={onFiltersChange}
              defaultFilters={DEFAULT_INBOX_FILTERS}
            />
          </div>

          <Tabs
            value={filters.tab}
            onValueChange={handleTabChange}
            className="w-full md:w-auto"
          >
            <TabsList className="inline-flex w-full justify-between rounded-full border border-border/50 bg-muted px-1 py-0.5 text-xs md:w-auto md:justify-start h-8">
              <TabsTrigger
                value="all"
                className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Unread
              </TabsTrigger>
              <TabsTrigger
                value="sent"
                className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Sent
              </TabsTrigger>
              <TabsTrigger
                value="scheduled"
                className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Scheduled
              </TabsTrigger>
              <TabsTrigger
                value="failed"
                className="h-7 rounded-full px-3 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Failed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Split-pane layout */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* List pane */}
        <ErrorBoundary
          FallbackComponent={({ resetErrorBoundary }) => (
            <Card className="border-destructive/50 m-4">
              <CardContent className="py-8 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-sm text-muted-foreground mb-4">
                  Failed to load email list
                </p>
                {onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void Promise.resolve(onRetry()).then(() => resetErrorBoundary())}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        >
          <div className="border-b border-border/40 md:border-b-0 md:border-r md:w-[320px] lg:w-[360px] flex flex-col min-h-0">
            <InboxList
              items={items}
              isLoading={isLoading}
              error={error}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </ErrorBoundary>

        {/* Detail pane */}
        <ErrorBoundary
          fallback={
            <Card className="border-destructive/50 m-4">
              <CardContent className="py-8 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-sm text-muted-foreground mb-4">
                  Failed to load email details
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedId(null)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Selection
                </Button>
              </CardContent>
            </Card>
          }
        >
          <div className="flex-1 min-h-0 flex flex-col">
            <InboxDetail
              email={selectedEmail}
              isLoading={false}
              onMarkAsRead={handleMarkAsRead}
              onStar={handleStar}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onReply={handleReply}
              onForward={handleForward}
              currentIndex={currentIndex >= 0 ? currentIndex : undefined}
              totalCount={items.length}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onClose={() => setSelectedId(null)}
            />
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
