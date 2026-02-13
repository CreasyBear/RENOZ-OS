/* eslint-disable react-refresh/only-export-components -- Component exports component + discovery config */
/**
 * Feature Discovery Widget
 *
 * CRO Pattern: Progressive Disclosure
 * Shows features users haven't discovered yet, with contextual recommendations
 * based on their current usage patterns.
 *
 * Principles applied:
 * - "One Goal Per Session" - Suggests one next feature at a time
 * - "Progress Creates Motivation" - Shows "X of Y discovered"
 * - "Do, Don't Show" - Direct links to features with CTAs
 */
import { useMemo, useState, useEffect, startTransition } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Headphones,
  Mail,
  DollarSign,
  BarChart3,
  Shield,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Zap,
  CheckCircle2,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface DiscoverableFeature {
  id: string
  title: string
  description: string
  href: string
  icon: React.ElementType
  color: string
  // Priority: 1 = show first, higher = show later
  priority: number
  // Whether user has visited this feature
  discovered?: boolean
}

interface FeatureDiscoveryProps {
  /** IDs of features user has already visited/discovered */
  discoveredFeatures?: string[]
  /** Optional className */
  className?: string
}

// ============================================================================
// FEATURE DEFINITIONS
// ============================================================================

const DISCOVERABLE_FEATURES: DiscoverableFeature[] = [
  {
    id: 'support',
    title: 'Support Center',
    description: 'Track customer issues, warranties, and RMAs in one place',
    href: '/support',
    icon: Headphones,
    color: 'text-blue-500',
    priority: 1,
  },
  {
    id: 'communications',
    title: 'Email Campaigns',
    description: 'Send targeted emails to customers and track engagement',
    href: '/communications',
    icon: Mail,
    color: 'text-purple-500',
    priority: 2,
  },
  {
    id: 'financial',
    title: 'Financial Dashboard',
    description: 'Track AR aging, revenue recognition, and payment reminders',
    href: '/financial',
    icon: DollarSign,
    color: 'text-green-500',
    priority: 3,
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    description: 'Deep insights into sales, customers, and operations',
    href: '/reports',
    icon: BarChart3,
    color: 'text-orange-500',
    priority: 4,
  },
  {
    id: 'admin',
    title: 'Team Management',
    description: 'Invite team members, manage permissions, and view audit logs',
    href: '/admin',
    icon: Shield,
    color: 'text-red-500',
    priority: 5,
  },
]

// ============================================================================
// COMPONENTS
// ============================================================================

const STORAGE_KEY = 'feature-discovery-dismissed'

export function FeatureDiscovery({
  discoveredFeatures = [],
  className,
}: FeatureDiscoveryProps) {
  // Track if user dismissed this widget
  const [isDismissed, setIsDismissed] = useState(false)

  // Calculate discovery progress (must be before any early returns for rules-of-hooks)
  const { undiscoveredFeatures, discoveryProgress, hasMoreToDiscover } = useMemo(() => {
    const featuresWithStatus = DISCOVERABLE_FEATURES.map(f => ({
      ...f,
      discovered: discoveredFeatures.includes(f.id),
    }))
    const undiscovered = featuresWithStatus
      .filter(f => !f.discovered)
      .sort((a, b) => a.priority - b.priority)
    const discovered = featuresWithStatus.filter(f => f.discovered)
    const progress = Math.round((discovered.length / DISCOVERABLE_FEATURES.length) * 100)
    return {
      undiscoveredFeatures: undiscovered,
      discoveryProgress: progress,
      hasMoreToDiscover: undiscovered.length > 0,
    }
  }, [discoveredFeatures])

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed === 'true') {
      startTransition(() => setIsDismissed(true))
    }
  }, [])
  
  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsDismissed(true)
  }
  
  // Don't render if dismissed
  if (isDismissed) {
    return null
  }

  // Don't show if all features discovered
  if (!hasMoreToDiscover) {
    return (
      <Card className={cn('bg-green-50/50 border-green-100', className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">You&apos;re a power user!</p>
              <p className="text-sm text-green-700">
                You&apos;ve discovered all the main features. Explore settings for more options.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show top 3 undiscovered features
  const featuresToShow = undiscoveredFeatures.slice(0, 3)
  const nextFeature = featuresToShow[0]

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Discover More Features</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {discoveredFeatures.length}/{DISCOVERABLE_FEATURES.length} discovered
            </span>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Dismiss feature discovery"
              title="Dismiss"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <Progress value={discoveryProgress} className="h-1.5" />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Primary Recommendation - Big CTA */}
        {nextFeature && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className={cn('rounded-lg bg-white p-2 shadow-sm', nextFeature.color)}>
                <nextFeature.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{nextFeature.title}</h4>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {nextFeature.description}
                </p>
                <Link
                  to={nextFeature.href}
                  className={cn(buttonVariants({ size: "sm" }), "mt-3")}
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  Try it now
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Recommendations - Compact List */}
        {featuresToShow.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Also available
            </p>
            {featuresToShow.slice(1).map((feature) => (
              <Link
                key={feature.id}
                to={feature.href}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-muted transition-colors group"
              >
                <feature.icon className={cn('h-4 w-4', feature.color)} />
                <span className="text-sm font-medium flex-1">{feature.title}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        )}

        {/* Progress Incentive */}
        {discoveryProgress < 100 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>
              Discover {undiscoveredFeatures.length} more feature{undiscoveredFeatures.length !== 1 ? 's' : ''} to complete your setup
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TRACKING HOOK
// ============================================================================

/**
 * Hook to track feature discovery
 * In a real implementation, this would persist to backend/user preferences
 */
export function useFeatureDiscovery() {
  // This is a placeholder - implement with your actual tracking
  // Could use localStorage, user preferences API, or analytics
  const discoveredFeatures: string[] = []
  
  const markDiscovered = (featureId: string) => {
    // Implementation: call API or update localStorage
    logger.debug('Feature discovered', { featureId })
  }
  
  return { discoveredFeatures, markDiscovered }
}
