/**
 * Pull-to-Refresh Container
 *
 * ARCHITECTURE: Presenter Component - Pure UI with touch gesture handling.
 *
 * Touch-enabled pull-to-refresh functionality for mobile dashboard.
 * Uses pointer events for cross-platform touch/mouse support.
 *
 * Features:
 * - Pull gesture detection with threshold
 * - Visual pull indicator with spinner
 * - Haptic-like visual feedback during pull
 * - Prevents default scroll behavior during refresh
 *
 * @see _Initiation/_prd/2-domains/dashboard/dashboard.prd.json - DASH-MOBILE-UI
 */

import { memo, useState, useRef, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { ArrowDown, RefreshCw } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the PullToRefresh component.
 */
export interface PullToRefreshProps {
  /** @source Container async callback - triggers data refetch */
  onRefresh: () => Promise<void>;
  /** @source Container state - external refresh state if needed */
  isRefreshing?: boolean;
  /** Content to render inside the pull area */
  children: ReactNode;
  /** Distance in pixels required to trigger refresh */
  pullThreshold?: number;
  /** Maximum pull distance for visual effect */
  maxPullDistance?: number;
  /** Enable/disable the pull-to-refresh feature */
  enabled?: boolean;
  /** Optional className for container */
  className?: string;
}

/**
 * Internal state for pull gesture tracking.
 */
interface PullState {
  isPulling: boolean;
  pullDistance: number;
  startY: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PULL_THRESHOLD = 80;
const DEFAULT_MAX_PULL_DISTANCE = 120;

// ============================================================================
// PULL INDICATOR SUB-COMPONENT
// ============================================================================

interface PullIndicatorProps {
  pullDistance: number;
  pullThreshold: number;
  isRefreshing: boolean;
  isPulling: boolean;
}

const PullIndicator = memo(function PullIndicator({
  pullDistance,
  pullThreshold,
  isRefreshing,
  isPulling,
}: PullIndicatorProps) {
  const progress = Math.min(pullDistance / pullThreshold, 1);
  const isReady = pullDistance >= pullThreshold;

  if (!isPulling && !isRefreshing && pullDistance === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute left-0 right-0 top-0 flex items-center justify-center overflow-hidden transition-all duration-200',
        isPulling ? 'ease-out' : 'ease-in-out'
      )}
      style={{
        height: isRefreshing ? 48 : Math.min(pullDistance, DEFAULT_MAX_PULL_DISTANCE),
        opacity: Math.max(0.3, progress),
      }}
      role="status"
      aria-live="polite"
      aria-label={isRefreshing ? 'Refreshing content' : isReady ? 'Release to refresh' : 'Pull down to refresh'}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-primary/10 p-2 transition-transform duration-200',
          isReady && !isRefreshing && 'scale-110 bg-primary/20'
        )}
        style={{
          transform: isPulling && !isRefreshing ? `rotate(${progress * 180}deg)` : undefined,
        }}
      >
        {isRefreshing ? (
          <Spinner className="size-5 text-primary" />
        ) : isReady ? (
          <RefreshCw className="size-5 text-primary" />
        ) : (
          <ArrowDown className="size-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Pull-to-refresh container for mobile touch interactions.
 *
 * @example
 * ```tsx
 * <PullToRefresh
 *   onRefresh={async () => {
 *     await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() });
 *   }}
 *   isRefreshing={isFetching}
 * >
 *   <MobileDashboard widgets={widgets} />
 * </PullToRefresh>
 * ```
 */
export const PullToRefresh = memo(function PullToRefresh({
  onRefresh,
  isRefreshing: externalRefreshing = false,
  children,
  pullThreshold = DEFAULT_PULL_THRESHOLD,
  maxPullDistance = DEFAULT_MAX_PULL_DISTANCE,
  enabled = true,
  className,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const [pullState, setPullState] = useState<PullState>({
    isPulling: false,
    pullDistance: 0,
    startY: 0,
  });

  const isRefreshing = externalRefreshing || internalRefreshing;

  // Handle touch/pointer start
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || isRefreshing) return;

      // Only start pull if at top of scroll
      const container = containerRef.current;
      if (container && container.scrollTop > 0) return;

      setPullState({
        isPulling: true,
        pullDistance: 0,
        startY: e.clientY,
      });
    },
    [enabled, isRefreshing]
  );

  // Handle touch/pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pullState.isPulling || isRefreshing) return;

      const deltaY = e.clientY - pullState.startY;

      // Only allow pulling down
      if (deltaY < 0) {
        setPullState((prev) => ({ ...prev, pullDistance: 0 }));
        return;
      }

      // Apply resistance as pull distance increases
      const resistance = 1 - Math.min(deltaY / (maxPullDistance * 2), 0.7);
      const adjustedDistance = deltaY * resistance;

      setPullState((prev) => ({
        ...prev,
        pullDistance: Math.min(adjustedDistance, maxPullDistance),
      }));

      // Prevent scroll while pulling
      if (deltaY > 5) {
        e.preventDefault();
      }
    },
    [pullState.isPulling, pullState.startY, isRefreshing, maxPullDistance]
  );

  // Handle touch/pointer end
  const handlePointerUp = useCallback(async () => {
    if (!pullState.isPulling) return;

    const shouldRefresh = pullState.pullDistance >= pullThreshold;

    setPullState({
      isPulling: false,
      pullDistance: shouldRefresh ? pullThreshold : 0,
      startY: 0,
    });

    if (shouldRefresh && !isRefreshing) {
      try {
        setInternalRefreshing(true);
        await onRefresh();
      } finally {
        setInternalRefreshing(false);
        setPullState({
          isPulling: false,
          pullDistance: 0,
          startY: 0,
        });
      }
    }
  }, [pullState, pullThreshold, isRefreshing, onRefresh]);

  // Handle pointer cancel (e.g., touch interrupted)
  const handlePointerCancel = useCallback(() => {
    setPullState({
      isPulling: false,
      pullDistance: 0,
      startY: 0,
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto touch-pan-y', className)}
      onPointerDown={enabled ? handlePointerDown : undefined}
      onPointerMove={enabled ? handlePointerMove : undefined}
      onPointerUp={enabled ? handlePointerUp : undefined}
      onPointerCancel={enabled ? handlePointerCancel : undefined}
      onPointerLeave={enabled ? handlePointerUp : undefined}
      style={{
        touchAction: pullState.isPulling ? 'none' : 'pan-y',
      }}
    >
      <PullIndicator
        pullDistance={pullState.pullDistance}
        pullThreshold={pullThreshold}
        isRefreshing={isRefreshing}
        isPulling={pullState.isPulling}
      />

      <div
        className={cn(
          'transition-transform duration-200',
          pullState.isPulling ? 'ease-out' : 'ease-in-out'
        )}
        style={{
          transform:
            pullState.pullDistance > 0 || isRefreshing
              ? `translateY(${isRefreshing ? 48 : pullState.pullDistance}px)`
              : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default PullToRefresh;
