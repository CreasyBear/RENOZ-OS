/**
 * TemplateStatsCard Component
 *
 * Displays performance statistics for an email template:
 * - Open rate, click rate, bounce rate
 * - Usage count and average engagement metrics
 * - Top performing links
 *
 * @see DOM-COMMS-001c
 */
import { Mail, Eye, MousePointerClick, AlertTriangle, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface LinkStats {
  url: string
  clicks: number
  uniqueClicks: number
}

interface TemplateStats {
  templateId: string
  templateName: string
  period: string // e.g., "Last 30 days"

  // Counts
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalBounced: number

  // Rates (as percentages)
  openRate: number
  clickRate: number
  bounceRate: number

  // Engagement metrics
  avgOpensPerEmail: number
  avgTimeToOpenMinutes: number

  // Link performance
  topLinks: LinkStats[]
}

interface TemplateStatsCardProps {
  stats?: TemplateStats
  isLoading?: boolean
  className?: string
}

// Industry average benchmarks
const BENCHMARKS = {
  openRate: 54,
  clickRate: 18,
  bounceRate: 5,
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TemplateStatsCard({
  stats,
  isLoading = false,
  className,
}: TemplateStatsCardProps) {
  if (isLoading) {
    return <TemplateStatsCardSkeleton className={className} />
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No stats available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overview Stats */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{stats.templateName}</CardTitle>
            <span className="text-xs text-muted-foreground">{stats.period}</span>
          </div>
          <CardDescription>Performance metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Emails Sent */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Emails Sent</span>
            <span className="text-2xl font-semibold">{stats.totalSent.toLocaleString()}</span>
          </div>

          <Separator />

          {/* Open Rate */}
          <StatRow
            label="Open Rate"
            value={`${stats.openRate.toFixed(1)}%`}
            progress={stats.openRate}
            benchmark={BENCHMARKS.openRate}
            icon={Eye}
            iconColor="text-green-600"
          />

          {/* Click Rate */}
          <StatRow
            label="Click Rate"
            value={`${stats.clickRate.toFixed(1)}%`}
            progress={stats.clickRate}
            benchmark={BENCHMARKS.clickRate}
            icon={MousePointerClick}
            iconColor="text-blue-600"
          />

          {/* Bounce Rate */}
          <StatRow
            label="Bounce Rate"
            value={`${stats.bounceRate.toFixed(1)}%`}
            progress={stats.bounceRate}
            benchmark={BENCHMARKS.bounceRate}
            isNegative
            icon={AlertTriangle}
            iconColor="text-red-600"
          />

          <Separator />

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Avg Opens/Email</span>
              <p className="font-medium">{stats.avgOpensPerEmail.toFixed(1)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Time to Open</span>
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(stats.avgTimeToOpenMinutes)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Links */}
      {stats.topLinks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Performing Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topLinks.slice(0, 5).map((link, index) => (
              <div key={link.url} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                  <span className="text-sm truncate">{formatLinkLabel(link.url)}</span>
                </div>
                <span className="text-sm font-medium whitespace-nowrap">
                  {link.clicks.toLocaleString()} clicks
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatRowProps {
  label: string
  value: string
  progress: number
  benchmark: number
  isNegative?: boolean
  icon: typeof Eye
  iconColor: string
}

function StatRow({ label, value, progress, benchmark, isNegative = false, icon: Icon, iconColor }: StatRowProps) {
  const isAboveBenchmark = isNegative ? progress < benchmark : progress > benchmark
  const TrendIcon = isAboveBenchmark ? TrendingUp : TrendingDown

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', iconColor)} />
          <span className="text-sm">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{value}</span>
          <TrendIcon
            className={cn(
              'h-3 w-3',
              isAboveBenchmark
                ? (isNegative ? 'text-green-600' : 'text-green-600')
                : (isNegative ? 'text-red-600' : 'text-amber-600')
            )}
          />
        </div>
      </div>
      <Progress value={Math.min(progress, 100)} className="h-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Industry avg: {benchmark}%</span>
        <span className={cn(
          isAboveBenchmark
            ? (isNegative ? 'text-green-600' : 'text-green-600')
            : (isNegative ? 'text-red-600' : 'text-amber-600')
        )}>
          {isAboveBenchmark ? 'Above' : 'Below'} average
        </span>
      </div>
    </div>
  )
}

function TemplateStatsCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Separator />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const remainingMins = Math.round(minutes % 60)
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

function formatLinkLabel(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.length > 1 ? parsed.pathname : ''
    return `${parsed.hostname}${path}`
  } catch {
    return url.substring(0, 40)
  }
}

export type { TemplateStats, LinkStats, TemplateStatsCardProps }
