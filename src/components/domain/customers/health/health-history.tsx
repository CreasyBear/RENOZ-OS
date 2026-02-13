/**
 * HealthHistory Component
 *
 * Simplified chart component displaying health score history over time.
 * Shows the last 6 data points as a bar chart.
 */
import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getHealthScoreSemanticColor } from '../customer-status-config'
import { STATUS_COLORS } from '@/lib/status/colors'

// ============================================================================
// TYPES
// ============================================================================

interface HealthHistoryProps {
  metrics: Array<{
    metricDate: string
    overallScore: number | null
  }>
}

// ============================================================================
// HELPERS
// ============================================================================

function getHealthScoreBarColor(score: number): string {
  const semanticColor = getHealthScoreSemanticColor(score)
  const colorDef = STATUS_COLORS[semanticColor]
  return colorDef.light.bg
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HealthHistory({ metrics }: HealthHistoryProps) {
  if (metrics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No health history available</p>
      </div>
    )
  }

  // Get last 6 data points, filter out null scores
  const dataPoints = metrics
    .filter((m) => m.overallScore !== null)
    .slice(0, 6)
    .reverse()
  const maxScore = 100
  const minScore = 0
  const range = maxScore - minScore

  if (dataPoints.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No health history available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 h-24">
        {dataPoints.map((point, i) => {
          const score = point.overallScore ?? 0
          const height = ((score - minScore) / range) * 100
          const isLast = i === dataPoints.length - 1
          const bgColor = getHealthScoreBarColor(score)

          return (
            <div
              key={point.metricDate}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className={cn(
                  'w-full rounded-t transition-all',
                  bgColor,
                  isLast && 'ring-2 ring-offset-1 ring-primary'
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 text-[10px] text-muted-foreground">
        {dataPoints.map((point) => (
          <div key={point.metricDate} className="flex-1 text-center truncate">
            {new Date(point.metricDate).toLocaleDateString('en-AU', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
