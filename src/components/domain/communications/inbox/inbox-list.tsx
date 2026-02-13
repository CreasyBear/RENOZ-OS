/**
 * Inbox List Component (Presenter)
 *
 * Left pane list view for unified inbox.
 * Displays email items with selection state.
 * Virtualized for performance with 50+ items.
 *
 * @source items from useInbox hook
 *
 * @see _reference/.square-ui-reference/templates/emails/components/emails/email-list.tsx
 * @see STANDARDS.md - Container/presenter pattern
 * @see ACTIVITY-TIMELINE-STANDARDS.md - Virtualization pattern
 */

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, EmptyStateContainer } from "@/components/shared/empty-state";
import { Mail, AlertTriangle } from "lucide-react";
import { InboxListItem } from "./inbox-list-item";
import type { InboxListProps } from "@/lib/schemas/communications/inbox";

export function InboxList({
  items,
  isLoading = false,
  error,
  selectedId,
  onSelect,
  className,
}: InboxListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const useVirtualization = items.length > 50;

  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer returns functions that cannot be memoized; known TanStack Virtual limitation
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Email list item height estimate
    overscan: 5,
    enabled: useVirtualization,
  });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="size-3.5 rounded border border-border" />
            <p className="text-sm font-medium text-foreground">Inbox</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-card">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Unable to load emails. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    // Context-aware empty state based on filters
    const emptyTitle = "No emails found";
    const emptyMessage = "Your inbox is empty. Emails will appear here once sent.";

    return (
      <div className="flex h-full flex-col overflow-hidden bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="size-3.5 rounded border border-border" />
            <p className="text-sm font-medium text-foreground">Inbox</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyStateContainer variant="page">
            <EmptyState
              icon={Mail}
              title={emptyTitle}
              message={emptyMessage}
            />
          </EmptyStateContainer>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col overflow-hidden bg-card ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="size-3.5 rounded border border-border" />
          <p className="text-sm font-medium text-foreground">Inbox</p>
        </div>
      </div>

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto"
        style={useVirtualization ? { height: "100%" } : undefined}
      >
        {useVirtualization ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const email = items[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <InboxListItem
                    email={email}
                    isSelected={selectedId === email.id}
                    onClick={() => onSelect?.(email.id)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          items.map((email) => (
            <InboxListItem
              key={email.id}
              email={email}
              isSelected={selectedId === email.id}
              onClick={() => onSelect?.(email.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
