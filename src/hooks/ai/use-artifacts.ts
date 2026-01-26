/**
 * AI Artifacts Hooks
 *
 * React hooks for consuming streaming artifacts from AI agents.
 * Wraps @ai-sdk-tools/artifacts/client for Renoz-specific usage.
 *
 * @see src/lib/ai/artifacts/definitions.ts
 * @see https://github.com/midday-ai/ai-sdk-tools/tree/main/packages/artifacts
 */

import {
  useArtifact as useArtifactBase,
  useArtifacts as useArtifactsBase,
  type UseArtifactReturn,
  type UseArtifactActions,
  type UseArtifactsReturn,
  type UseArtifactsActions,
  type ArtifactData,
  type ArtifactStatus,
  type ArtifactCallbacks,
} from '@ai-sdk-tools/artifacts/client';
import { useMemo } from 'react';

import {
  revenueChartArtifact,
  ordersPipelineArtifact,
  customerSummaryArtifact,
  metricsCardArtifact,
  topCustomersArtifact,
  type RevenueChartData,
  type OrdersPipelineData,
  type CustomerSummaryData,
  type MetricsCardData,
  type TopCustomersData,
  type ArtifactType,
} from '@/lib/ai/artifacts';

// ============================================================================
// RE-EXPORT TYPES
// ============================================================================

export type {
  ArtifactStatus,
  ArtifactData,
  ArtifactCallbacks,
  UseArtifactReturn,
  UseArtifactActions,
  UseArtifactsReturn,
  UseArtifactsActions,
};

// ============================================================================
// INDIVIDUAL ARTIFACT HOOKS
// ============================================================================

/**
 * Hook for consuming revenue chart artifacts.
 *
 * @example
 * ```tsx
 * function RevenueChart() {
 *   const [artifact, actions] = useRevenueChartArtifact({
 *     onComplete: (data) => console.log('Chart ready:', data.summary)
 *   });
 *
 *   if (!artifact.data) return null;
 *   return <LineChart data={artifact.data.data} />;
 * }
 * ```
 */
export function useRevenueChartArtifact(
  callbacks?: ArtifactCallbacks<RevenueChartData>
): [UseArtifactReturn<RevenueChartData>, UseArtifactActions] {
  return useArtifactBase(revenueChartArtifact, callbacks);
}

/**
 * Hook for consuming orders pipeline artifacts.
 */
export function useOrdersPipelineArtifact(
  callbacks?: ArtifactCallbacks<OrdersPipelineData>
): [UseArtifactReturn<OrdersPipelineData>, UseArtifactActions] {
  return useArtifactBase(ordersPipelineArtifact, callbacks);
}

/**
 * Hook for consuming customer summary artifacts.
 */
export function useCustomerSummaryArtifact(
  callbacks?: ArtifactCallbacks<CustomerSummaryData>
): [UseArtifactReturn<CustomerSummaryData>, UseArtifactActions] {
  return useArtifactBase(customerSummaryArtifact, callbacks);
}

/**
 * Hook for consuming metrics card artifacts.
 */
export function useMetricsCardArtifact(
  callbacks?: ArtifactCallbacks<MetricsCardData>
): [UseArtifactReturn<MetricsCardData>, UseArtifactActions] {
  return useArtifactBase(metricsCardArtifact, callbacks);
}

/**
 * Hook for consuming top customers artifacts.
 */
export function useTopCustomersArtifact(
  callbacks?: ArtifactCallbacks<TopCustomersData>
): [UseArtifactReturn<TopCustomersData>, UseArtifactActions] {
  return useArtifactBase(topCustomersArtifact, callbacks);
}

// ============================================================================
// ALL ARTIFACTS HOOK
// ============================================================================

export interface UseAllArtifactsOptions {
  /** Callback fired when any artifact updates */
  onData?: (artifactType: ArtifactType, data: ArtifactData<unknown>) => void;
  /** Filter to only include certain artifact types */
  include?: ArtifactType[];
  /** Filter to exclude certain artifact types */
  exclude?: ArtifactType[];
}

export interface AllArtifactsResult extends UseArtifactsReturn {
  /** Check if any artifact is currently streaming */
  isStreaming: boolean;
  /** Check if any artifact has an error */
  hasError: boolean;
  /** Typed byType with ArtifactType keys */
  byType: Record<ArtifactType, ArtifactData<unknown>[]>;
  /** Typed latestByType with ArtifactType keys */
  latestByType: Partial<Record<ArtifactType, ArtifactData<unknown>>>;
}

/**
 * Hook for consuming all artifacts across all types.
 * Ideal for canvas/panel components that render different artifact types.
 *
 * @example
 * ```tsx
 * function ArtifactCanvas() {
 *   const [artifacts, actions] = useAllArtifacts({
 *     onData: (type, data) => console.log(`New ${type}:`, data)
 *   });
 *
 *   if (!artifacts.current) return <EmptyCanvas />;
 *
 *   switch (artifacts.current.type) {
 *     case 'revenue-chart':
 *       return <RevenueChartView data={artifacts.current.payload} />;
 *     case 'orders-pipeline':
 *       return <PipelineView data={artifacts.current.payload} />;
 *     default:
 *       return <GenericView data={artifacts.current.payload} />;
 *   }
 * }
 * ```
 */
export function useAllArtifacts(
  options?: UseAllArtifactsOptions
): [AllArtifactsResult, UseArtifactsActions] {
  const [result, actions] = useArtifactsBase({
    onData: options?.onData as (type: string, data: ArtifactData<unknown>) => void,
    include: options?.include,
    exclude: options?.exclude,
  });

  // Compute derived state
  const derivedState = useMemo(() => {
    const artifacts = result.artifacts;
    const isStreaming = artifacts.some(
      (a) => a.status === 'streaming' || a.status === 'loading'
    );
    const hasError = artifacts.some((a) => a.status === 'error');

    return {
      isStreaming,
      hasError,
    };
  }, [result.artifacts]);

  const enrichedResult: AllArtifactsResult = {
    ...result,
    byType: result.byType as Record<ArtifactType, ArtifactData<unknown>[]>,
    latestByType: result.latestByType as Partial<Record<ArtifactType, ArtifactData<unknown>>>,
    ...derivedState,
  };

  return [enrichedResult, actions];
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to check if any artifacts are available.
 * Useful for conditionally showing a canvas panel.
 */
export function useHasArtifacts(): boolean {
  const [{ artifacts }] = useAllArtifacts();
  return artifacts.length > 0;
}

/**
 * Hook to get the current artifact for canvas display.
 * Returns null if no artifacts are streaming.
 */
export function useCurrentArtifact(): {
  artifact: ArtifactData<unknown> | null;
  isStreaming: boolean;
} {
  const [{ current, isStreaming }] = useAllArtifacts();
  return { artifact: current, isStreaming };
}
