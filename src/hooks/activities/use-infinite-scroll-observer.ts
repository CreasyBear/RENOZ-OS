/**
 * Custom hook for infinite scroll using IntersectionObserver
 * 
 * Handles intersection observer setup and cleanup for infinite scroll triggers.
 * Returns a ref that should be attached to the trigger element.
 */

import * as React from "react";

export interface UseInfiniteScrollObserverOptions {
  /** Whether there are more pages to load */
  hasNextPage: boolean;
  /** Whether currently fetching next page */
  isFetchingNextPage: boolean;
  /** Function to fetch next page */
  fetchNextPage: () => void;
  /** Scroll container ref (for ScrollArea viewport) */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  /** Threshold for intersection (0-1) */
  threshold?: number;
  /** Root margin for intersection */
  rootMargin?: string;
  /** Skip first intersection on mount */
  skipInitialIntersection?: boolean;
}

/**
 * Hook for infinite scroll using IntersectionObserver
 * 
 * @example
 * ```tsx
 * const scrollRef = useRef<HTMLDivElement>(null);
 * const triggerRef = useInfiniteScrollObserver({
 *   hasNextPage: query.hasNextPage,
 *   isFetchingNextPage: query.isFetchingNextPage,
 *   fetchNextPage: query.fetchNextPage,
 *   scrollContainerRef: scrollRef,
 * });
 * 
 * return (
 *   <ScrollArea ref={scrollRef}>
 *     {hasNextPage && <div ref={triggerRef} />}
 *   </ScrollArea>
 * );
 * ```
 */
export function useInfiniteScrollObserver({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  scrollContainerRef,
  threshold = 0.1,
  rootMargin = "100px",
  skipInitialIntersection = true,
}: UseInfiniteScrollObserverOptions) {
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const isInitialRender = React.useRef(skipInitialIntersection);
  const fetchNextPageRef = React.useRef(fetchNextPage);

  // Keep refs up to date
  React.useEffect(() => {
    fetchNextPageRef.current = fetchNextPage;
  }, [fetchNextPage]);

  React.useEffect(() => {
    const element = triggerRef.current;
    if (!element) return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let observer: IntersectionObserver | null = null;

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      // Find ScrollArea viewport element
      const viewport = scrollContainer.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement | null;

      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry?.isIntersecting) return;

          // Skip first intersection on mount if requested
          if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
          }

          // Don't trigger if already fetching or no more pages
          if (isFetchingNextPage || !hasNextPage) return;

          fetchNextPageRef.current();
        },
        {
          threshold,
          rootMargin,
          root: viewport || null,
        }
      );

      observer.observe(element);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [hasNextPage, isFetchingNextPage, scrollContainerRef, threshold, rootMargin]);

  return triggerRef;
}
