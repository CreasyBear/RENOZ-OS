/**
 * Customer Health Hooks
 *
 * TanStack Query hooks for customer health monitoring:
 * - Health score tracking
 * - Health history
 * - At-risk customer alerts
 * - Health score calculations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCustomerHealthMetrics,
  createCustomerHealthMetric,
} from '@/server/customers'
import { customerKeys } from './use-customers'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const healthKeys = {
  all: ['customer-health'] as const,
  metrics: (customerId: string) => [...healthKeys.all, 'metrics', customerId] as const,
  history: (customerId: string, months?: number) =>
    [...healthKeys.all, 'history', customerId, months] as const,
  atRisk: () => [...healthKeys.all, 'at-risk'] as const,
  distribution: () => [...healthKeys.all, 'distribution'] as const,
}

// ============================================================================
// TYPES
// ============================================================================

export interface HealthMetrics {
  recencyScore: number
  frequencyScore: number
  monetaryScore: number
  engagementScore: number
  overallScore: number
}

export interface HealthHistoryPoint {
  date: string
  overallScore: number
  recencyScore: number
  frequencyScore: number
  monetaryScore: number
  engagementScore?: number
}

export interface AtRiskCustomer {
  id: string
  name: string
  healthScore: number
  trend: 'declining' | 'stable' | 'improving'
  riskFactors: string[]
  lastOrderDate: string | null
  lifetimeValue: number | null
}

export interface HealthDistribution {
  excellent: number // 80-100
  good: number // 60-79
  fair: number // 40-59
  atRisk: number // 0-39
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get health metrics for a specific customer
 */
export function useCustomerHealthMetrics(customerId: string, enabled = true) {
  return useQuery({
    queryKey: healthKeys.metrics(customerId),
    queryFn: async () => {
      const result = await getCustomerHealthMetrics({ data: { customerId } })
      if (!result || result.length === 0) {
        return null
      }
      const latest = result[0]
      return {
        recencyScore: latest.recencyScore ?? 0,
        frequencyScore: latest.frequencyScore ?? 0,
        monetaryScore: latest.monetaryScore ?? 0,
        engagementScore: latest.engagementScore ?? 0,
        overallScore: latest.overallScore ?? 0,
      } as HealthMetrics
    },
    enabled: enabled && !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get health score history for trend analysis
 */
export function useCustomerHealthHistory(
  customerId: string,
  months = 6,
  enabled = true
) {
  return useQuery({
    queryKey: healthKeys.history(customerId, months),
    queryFn: async () => {
      const result = await getCustomerHealthMetrics({ data: { customerId } })
      return (result ?? []).map((m: {
        metricDate: string;
        overallScore: number | null;
        recencyScore: number | null;
        frequencyScore: number | null;
        monetaryScore: number | null;
        engagementScore: number | null;
      }) => ({
        date: m.metricDate,
        overallScore: m.overallScore ?? 0,
        recencyScore: m.recencyScore ?? 0,
        frequencyScore: m.frequencyScore ?? 0,
        monetaryScore: m.monetaryScore ?? 0,
        engagementScore: m.engagementScore ?? 0,
      })) as HealthHistoryPoint[]
    },
    enabled: enabled && !!customerId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Create/update health metric for a customer
 */
export function useCreateHealthMetric() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      customerId: string;
      metricDate: string;
      recencyScore?: number;
      frequencyScore?: number;
      monetaryScore?: number;
      engagementScore?: number;
      overallScore?: number;
    }) => createCustomerHealthMetric({ data }),
    onSuccess: (_data, variables) => {
      // Invalidate health metrics and customer detail
      queryClient.invalidateQueries({ queryKey: healthKeys.metrics(variables.customerId) })
      queryClient.invalidateQueries({ queryKey: healthKeys.history(variables.customerId) })
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.customerId) })
    },
  })
}

// ============================================================================
// HEALTH SCORE UTILITIES
// ============================================================================

/**
 * Get health score level (excellent, good, fair, atRisk)
 */
export function getHealthLevel(score: number): 'excellent' | 'good' | 'fair' | 'atRisk' {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'atRisk'
}

/**
 * Get health score color class
 */
export function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

/**
 * Get health score background color class
 */
export function getHealthBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100'
  if (score >= 60) return 'bg-yellow-100'
  if (score >= 40) return 'bg-orange-100'
  return 'bg-red-100'
}

/**
 * Get health score label
 */
export function getHealthLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'At Risk'
}

/**
 * Calculate health trend from history
 */
export function calculateHealthTrend(
  history: HealthHistoryPoint[]
): 'improving' | 'stable' | 'declining' {
  if (history.length < 2) return 'stable'

  const recent = history.slice(0, 3)
  const avgRecent = recent.reduce((sum, h) => sum + h.overallScore, 0) / recent.length

  const older = history.slice(-3)
  const avgOlder = older.reduce((sum, h) => sum + h.overallScore, 0) / older.length

  const diff = avgRecent - avgOlder

  if (diff > 5) return 'improving'
  if (diff < -5) return 'declining'
  return 'stable'
}

/**
 * Get recommendations based on health metrics
 */
export function getHealthRecommendations(metrics: HealthMetrics): string[] {
  const recommendations: string[] = []

  if (metrics.recencyScore < 50) {
    recommendations.push('Schedule a follow-up call or send a re-engagement email')
  }

  if (metrics.frequencyScore < 50) {
    recommendations.push('Consider loyalty incentives to increase order frequency')
  }

  if (metrics.monetaryScore < 50) {
    recommendations.push('Explore upselling or cross-selling opportunities')
  }

  if (metrics.engagementScore < 50) {
    recommendations.push('Increase touchpoints through newsletters or updates')
  }

  if (metrics.overallScore < 40) {
    recommendations.push('Priority: Create an account recovery action plan')
  }

  return recommendations
}
