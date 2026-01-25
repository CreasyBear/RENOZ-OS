/**
 * HealthScoreGauge Component
 *
 * Visual gauge displaying customer health score with:
 * - Animated circular gauge
 * - Color-coded score indication
 * - Label and trend indicator
 */
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface HealthScoreGaugeProps {
  score: number | null
  previousScore?: number | null
  size?: 'sm' | 'md' | 'lg'
  showTrend?: boolean
  showLabel?: boolean
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function getScoreColor(score: number | null): {
  stroke: string
  bg: string
  text: string
  label: string
} {
  if (score === null) {
    return { stroke: '#9ca3af', bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not Rated' }
  }
  if (score >= 80) {
    return { stroke: '#22c55e', bg: 'bg-green-100', text: 'text-green-700', label: 'Excellent' }
  }
  if (score >= 60) {
    return { stroke: '#eab308', bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Good' }
  }
  if (score >= 40) {
    return { stroke: '#f97316', bg: 'bg-orange-100', text: 'text-orange-700', label: 'Fair' }
  }
  return { stroke: '#ef4444', bg: 'bg-red-100', text: 'text-red-700', label: 'At Risk' }
}

function getTrend(current: number | null, previous: number | null): 'up' | 'down' | 'stable' | null {
  if (current === null || previous === null) return null
  const diff = current - previous
  if (diff > 2) return 'up'
  if (diff < -2) return 'down'
  return 'stable'
}

const sizeConfig = {
  sm: { size: 80, strokeWidth: 6, fontSize: 'text-lg', labelSize: 'text-xs' },
  md: { size: 120, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-sm' },
  lg: { size: 160, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-base' },
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HealthScoreGauge({
  score,
  previousScore,
  size = 'md',
  showTrend = true,
  showLabel = true,
  className,
}: HealthScoreGaugeProps) {
  const config = sizeConfig[size]
  const colors = getScoreColor(score)
  const trend = getTrend(score, previousScore ?? null)

  // SVG calculations
  const radius = (config.size - config.strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const normalizedScore = score ?? 0
  const progress = (normalizedScore / 100) * circumference
  const offset = circumference - progress

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: config.size, height: config.size }}>
        {/* Background circle */}
        <svg
          className="transform -rotate-90"
          width={config.size}
          height={config.size}
        >
          <circle
            className="text-muted"
            strokeWidth={config.strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={config.size / 2}
            cy={config.size / 2}
          />
          {/* Progress circle */}
          <circle
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke={colors.stroke}
            fill="transparent"
            r={radius}
            cx={config.size / 2}
            cy={config.size / 2}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', config.fontSize, colors.text)}>
            {score ?? '—'}
          </span>
          {showTrend && trend && (
            <div className="flex items-center gap-0.5 mt-1">
              {trend === 'up' && (
                <TrendingUp className="h-3 w-3 text-green-600" />
              )}
              {trend === 'down' && (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              {trend === 'stable' && (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      </div>

      {showLabel && (
        <span className={cn('mt-2 font-medium', config.labelSize, colors.text)}>
          {colors.label}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// MINI VARIANT
// ============================================================================

interface HealthScoreBadgeProps {
  score: number | null
  className?: string
}

export function HealthScoreBadge({ score, className }: HealthScoreBadgeProps) {
  const colors = getScoreColor(score)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        colors.bg,
        colors.text,
        className
      )}
    >
      <span className="font-bold">{score ?? '—'}</span>
      <span className="opacity-75">/100</span>
    </span>
  )
}
