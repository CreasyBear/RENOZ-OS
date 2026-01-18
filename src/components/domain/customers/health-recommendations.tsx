/**
 * HealthRecommendations Component
 *
 * Displays health factor breakdown and actionable recommendations:
 * - RFM score breakdown (Recency, Frequency, Monetary)
 * - Factor-specific insights
 * - Improvement action items
 */
import {
  Calendar,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface HealthMetrics {
  recencyScore: number
  frequencyScore: number
  monetaryScore: number
  overallScore: number
  recencyDays?: number
  orderCount?: number
  totalValue?: number
}

interface HealthRecommendationsProps {
  metrics: HealthMetrics | null
  className?: string
}

interface Recommendation {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: 'recency' | 'frequency' | 'monetary' | 'general'
}

// ============================================================================
// HELPERS
// ============================================================================

function getScoreLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'poor'
}

function getScoreColor(level: string): string {
  switch (level) {
    case 'excellent': return 'text-green-600'
    case 'good': return 'text-yellow-600'
    case 'fair': return 'text-orange-600'
    case 'poor': return 'text-red-600'
    default: return 'text-muted-foreground'
  }
}

function getProgressColor(level: string): string {
  switch (level) {
    case 'excellent': return 'bg-green-500'
    case 'good': return 'bg-yellow-500'
    case 'fair': return 'bg-orange-500'
    case 'poor': return 'bg-red-500'
    default: return 'bg-muted'
  }
}

function generateRecommendations(metrics: HealthMetrics): Recommendation[] {
  const recommendations: Recommendation[] = []

  // Recency recommendations
  if (metrics.recencyScore < 40) {
    recommendations.push({
      id: 'recency-critical',
      title: 'Re-engage dormant customer',
      description: 'No orders in 90+ days. Schedule a check-in call or send a personalized offer.',
      priority: 'high',
      category: 'recency',
    })
  } else if (metrics.recencyScore < 60) {
    recommendations.push({
      id: 'recency-warning',
      title: 'Follow up on engagement',
      description: 'Activity declining. Send relevant content or promotional offer.',
      priority: 'medium',
      category: 'recency',
    })
  }

  // Frequency recommendations
  if (metrics.frequencyScore < 40) {
    recommendations.push({
      id: 'frequency-critical',
      title: 'Increase order frequency',
      description: 'Low order volume. Consider loyalty program or subscription options.',
      priority: 'high',
      category: 'frequency',
    })
  } else if (metrics.frequencyScore < 60) {
    recommendations.push({
      id: 'frequency-warning',
      title: 'Encourage repeat purchases',
      description: 'Moderate order frequency. Highlight complementary products.',
      priority: 'medium',
      category: 'frequency',
    })
  }

  // Monetary recommendations
  if (metrics.monetaryScore < 40) {
    recommendations.push({
      id: 'monetary-critical',
      title: 'Increase order value',
      description: 'Low average order value. Suggest bundled products or volume discounts.',
      priority: 'high',
      category: 'monetary',
    })
  } else if (metrics.monetaryScore < 60) {
    recommendations.push({
      id: 'monetary-warning',
      title: 'Upsell opportunities',
      description: 'Room for growth in order value. Recommend premium products.',
      priority: 'medium',
      category: 'monetary',
    })
  }

  // General recommendations for healthy customers
  if (recommendations.length === 0 && metrics.overallScore >= 80) {
    recommendations.push({
      id: 'general-excellent',
      title: 'Maintain relationship',
      description: 'Strong customer relationship. Consider for case studies or referral program.',
      priority: 'low',
      category: 'general',
    })
  }

  return recommendations
}

// ============================================================================
// FACTOR CARD
// ============================================================================

interface FactorCardProps {
  icon: typeof Calendar
  title: string
  score: number
  detail?: string
}

function FactorCard({ icon: Icon, title, score, detail }: FactorCardProps) {
  const level = getScoreLevel(score)

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border">
      <div className={cn('p-2 rounded-full', `${getProgressColor(level)}/10`)}>
        <Icon className={cn('h-5 w-5', getScoreColor(level))} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{title}</span>
          <span className={cn('text-sm font-bold', getScoreColor(level))}>{score}</span>
        </div>
        <Progress value={score} className="h-2" />
        {detail && (
          <p className="text-xs text-muted-foreground mt-1">{detail}</p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// RECOMMENDATION ITEM
// ============================================================================

interface RecommendationItemProps {
  recommendation: Recommendation
}

function RecommendationItem({ recommendation }: RecommendationItemProps) {
  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  }

  const priorityIcons = {
    high: AlertTriangle,
    medium: Lightbulb,
    low: CheckCircle,
  }

  const Icon = priorityIcons[recommendation.priority]

  return (
    <div className={cn('p-3 rounded-lg border', priorityColors[recommendation.priority])}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{recommendation.title}</p>
          <p className="text-xs opacity-80 mt-0.5">{recommendation.description}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 opacity-50" />
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HealthRecommendations({ metrics, className }: HealthRecommendationsProps) {
  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Health Analysis</CardTitle>
          <CardDescription>No health metrics available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Health metrics will appear once the customer has order history.
          </p>
        </CardContent>
      </Card>
    )
  }

  const recommendations = generateRecommendations(metrics)

  return (
    <div className={cn('space-y-4', className)}>
      {/* RFM Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Health Factors
          </CardTitle>
          <CardDescription>RFM score breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FactorCard
            icon={Calendar}
            title="Recency"
            score={metrics.recencyScore}
            detail={metrics.recencyDays !== undefined
              ? `Last order ${metrics.recencyDays} days ago`
              : undefined
            }
          />
          <FactorCard
            icon={ShoppingCart}
            title="Frequency"
            score={metrics.frequencyScore}
            detail={metrics.orderCount !== undefined
              ? `${metrics.orderCount} total orders`
              : undefined
            }
          />
          <FactorCard
            icon={DollarSign}
            title="Monetary"
            score={metrics.monetaryScore}
            detail={metrics.totalValue !== undefined
              ? `$${metrics.totalValue.toLocaleString()} lifetime value`
              : undefined
            }
          />
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
            <CardDescription>
              {recommendations.filter(r => r.priority === 'high').length} high priority actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.map((rec) => (
              <RecommendationItem key={rec.id} recommendation={rec} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
