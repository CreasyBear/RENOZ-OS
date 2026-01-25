/**
 * Swipe Container
 *
 * ARCHITECTURE: Presenter Component - Pure UI with touch gesture handling.
 *
 * Horizontal swipe navigation for paginated content like dashboard widgets.
 * Supports swipe left/right gestures with momentum-based navigation.
 *
 * Features:
 * - Horizontal swipe detection with momentum
 * - Page indicators (dots)
 * - Smooth transitions between pages
 * - Touch-friendly with large swipe targets
 * - Keyboard navigation support (arrow keys)
 *
 * @see _Initiation/_prd/2-domains/dashboard/dashboard.prd.json - DASH-MOBILE-UI
 */

import { memo, useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the SwipeContainer component.
 */
export interface SwipeContainerProps {
  /** Array of pages/slides to render */
  children: ReactNode[];
  /** @source Container state - externally controlled current page index */
  currentPage?: number;
  /** @source Container callback - fires when page changes */
  onPageChange?: (index: number) => void;
  /** Minimum swipe distance to trigger navigation (px) */
  swipeThreshold?: number;
  /** Minimum swipe velocity to trigger navigation (px/ms) */
  velocityThreshold?: number;
  /** Show navigation arrows on desktop */
  showArrows?: boolean;
  /** Show page indicator dots */
  showDots?: boolean;
  /** Enable/disable swipe gestures */
  enabled?: boolean;
  /** Optional className for container */
  className?: string;
  /** Optional className for each page wrapper */
  pageClassName?: string;
}

/**
 * Internal state for swipe gesture tracking.
 */
interface SwipeState {
  isSwiping: boolean;
  startX: number;
  startTime: number;
  currentX: number;
  translateX: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SWIPE_THRESHOLD = 50;
const DEFAULT_VELOCITY_THRESHOLD = 0.3;

// ============================================================================
// PAGE INDICATOR SUB-COMPONENT
// ============================================================================

interface PageIndicatorProps {
  totalPages: number;
  currentPage: number;
  onPageSelect: (index: number) => void;
}

const PageIndicator = memo(function PageIndicator({
  totalPages,
  currentPage,
  onPageSelect,
}: PageIndicatorProps) {
  if (totalPages <= 1) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 py-3"
      role="tablist"
      aria-label="Dashboard pages"
    >
      {Array.from({ length: totalPages }).map((_, index) => (
        <button
          key={index}
          type="button"
          role="tab"
          aria-selected={currentPage === index}
          aria-label={`Go to page ${index + 1}`}
          onClick={() => onPageSelect(index)}
          className={cn(
            'h-2 rounded-full transition-all duration-200',
            currentPage === index
              ? 'w-6 bg-primary'
              : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
          )}
        />
      ))}
    </div>
  );
});

// ============================================================================
// NAVIGATION ARROWS SUB-COMPONENT
// ============================================================================

interface NavigationArrowsProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

const NavigationArrows = memo(function NavigationArrows({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: NavigationArrowsProps) {
  if (totalPages <= 1) return null;

  return (
    <>
      {/* Left arrow */}
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage === 0}
        aria-label="Previous page"
        className={cn(
          'absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md backdrop-blur-sm transition-opacity md:block',
          currentPage === 0 ? 'cursor-not-allowed opacity-30' : 'hover:bg-background hover:shadow-lg'
        )}
      >
        <ChevronLeft className="size-5" />
      </button>

      {/* Right arrow */}
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage === totalPages - 1}
        aria-label="Next page"
        className={cn(
          'absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md backdrop-blur-sm transition-opacity md:block',
          currentPage === totalPages - 1 ? 'cursor-not-allowed opacity-30' : 'hover:bg-background hover:shadow-lg'
        )}
      >
        <ChevronRight className="size-5" />
      </button>
    </>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Swipe container for mobile horizontal navigation.
 *
 * @example
 * ```tsx
 * <SwipeContainer
 *   currentPage={activePage}
 *   onPageChange={setActivePage}
 *   showDots
 * >
 *   <MetricsPage />
 *   <ChartsPage />
 *   <ActivityPage />
 * </SwipeContainer>
 * ```
 */
export const SwipeContainer = memo(function SwipeContainer({
  children,
  currentPage: controlledPage,
  onPageChange,
  swipeThreshold = DEFAULT_SWIPE_THRESHOLD,
  velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
  showArrows = true,
  showDots = true,
  enabled = true,
  className,
  pageClassName,
}: SwipeContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalPage, setInternalPage] = useState(0);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    isSwiping: false,
    startX: 0,
    startTime: 0,
    currentX: 0,
    translateX: 0,
  });

  const totalPages = children.length;
  const currentPage = controlledPage ?? internalPage;

  // Normalize page to valid range
  const normalizedPage = Math.max(0, Math.min(currentPage, totalPages - 1));

  // Handle page change
  const goToPage = useCallback(
    (index: number) => {
      const validIndex = Math.max(0, Math.min(index, totalPages - 1));
      if (onPageChange) {
        onPageChange(validIndex);
      } else {
        setInternalPage(validIndex);
      }
    },
    [totalPages, onPageChange]
  );

  const goToPrevious = useCallback(() => {
    goToPage(normalizedPage - 1);
  }, [normalizedPage, goToPage]);

  const goToNext = useCallback(() => {
    goToPage(normalizedPage + 1);
  }, [normalizedPage, goToPage]);

  // Handle pointer/touch start
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || totalPages <= 1) return;

      setSwipeState({
        isSwiping: true,
        startX: e.clientX,
        startTime: Date.now(),
        currentX: e.clientX,
        translateX: 0,
      });
    },
    [enabled, totalPages]
  );

  // Handle pointer/touch move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!swipeState.isSwiping) return;

      const deltaX = e.clientX - swipeState.startX;

      // Apply resistance at edges
      let adjustedDelta = deltaX;
      if (
        (normalizedPage === 0 && deltaX > 0) ||
        (normalizedPage === totalPages - 1 && deltaX < 0)
      ) {
        adjustedDelta = deltaX * 0.3; // Resistance at edges
      }

      setSwipeState((prev) => ({
        ...prev,
        currentX: e.clientX,
        translateX: adjustedDelta,
      }));

      // Prevent vertical scroll while swiping horizontally
      if (Math.abs(deltaX) > 10) {
        e.preventDefault();
      }
    },
    [swipeState.isSwiping, swipeState.startX, normalizedPage, totalPages]
  );

  // Handle pointer/touch end
  const handlePointerUp = useCallback(() => {
    if (!swipeState.isSwiping) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const deltaTime = Date.now() - swipeState.startTime;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Determine navigation based on distance or velocity
    const shouldNavigate =
      Math.abs(deltaX) > swipeThreshold || velocity > velocityThreshold;

    if (shouldNavigate) {
      if (deltaX > 0 && normalizedPage > 0) {
        goToPrevious();
      } else if (deltaX < 0 && normalizedPage < totalPages - 1) {
        goToNext();
      }
    }

    setSwipeState({
      isSwiping: false,
      startX: 0,
      startTime: 0,
      currentX: 0,
      translateX: 0,
    });
  }, [
    swipeState,
    swipeThreshold,
    velocityThreshold,
    normalizedPage,
    totalPages,
    goToPrevious,
    goToNext,
  ]);

  // Handle pointer cancel
  const handlePointerCancel = useCallback(() => {
    setSwipeState({
      isSwiping: false,
      startX: 0,
      startTime: 0,
      currentX: 0,
      translateX: 0,
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabled || totalPages <= 1) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, totalPages, goToPrevious, goToNext]);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Dashboard widget carousel"
    >
      {/* Navigation arrows (desktop) */}
      {showArrows && (
        <NavigationArrows
          currentPage={normalizedPage}
          totalPages={totalPages}
          onPrevious={goToPrevious}
          onNext={goToNext}
        />
      )}

      {/* Swipeable content area */}
      <div
        className="touch-pan-x"
        onPointerDown={enabled ? handlePointerDown : undefined}
        onPointerMove={enabled ? handlePointerMove : undefined}
        onPointerUp={enabled ? handlePointerUp : undefined}
        onPointerCancel={enabled ? handlePointerCancel : undefined}
        onPointerLeave={enabled ? handlePointerUp : undefined}
        style={{
          touchAction: swipeState.isSwiping ? 'none' : 'pan-x',
        }}
      >
        <div
          className={cn(
            'flex transition-transform duration-300 ease-out',
            swipeState.isSwiping && 'transition-none'
          )}
          style={{
            transform: `translateX(calc(-${normalizedPage * 100}% + ${swipeState.translateX}px))`,
          }}
        >
          {children.map((child, index) => (
            <div
              key={index}
              className={cn('w-full flex-shrink-0', pageClassName)}
              role="tabpanel"
              aria-label={`Page ${index + 1} of ${totalPages}`}
              aria-hidden={normalizedPage !== index}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Page indicators */}
      {showDots && (
        <PageIndicator
          totalPages={totalPages}
          currentPage={normalizedPage}
          onPageSelect={goToPage}
        />
      )}
    </div>
  );
});

export default SwipeContainer;
