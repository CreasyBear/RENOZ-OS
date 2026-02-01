/**
 * Welcome Checklist Component
 *
 * Dashboard widget that tracks new user onboarding progress.
 * Shows completion status for: add first customer, add first product, create first quote.
 *
 * Features:
 * - SVG progress ring with percentage
 * - Checklist items with completion state
 * - Permanent dismissal persisted to organization settings
 * - Accessible with proper ARIA attributes
 * - Supports reduced motion preferences
 *
 * @example
 * ```tsx
 * <WelcomeChecklist />
 * ```
 */
import { useCallback, useId, useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"
import { Link } from "@tanstack/react-router"
import {
  Circle,
  CheckCircle2,
  X,
  Users,
  Package,
  FileText,
  ArrowRight,
  Shield,
  Mail,
  BarChart3,
} from "lucide-react"
import { cn } from "~/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Button, buttonVariants } from "~/components/ui/button"
import {
  getOnboardingProgress,
  dismissWelcomeChecklist,
} from "~/server/onboarding"

// ============================================================================
// TYPES
// ============================================================================

export interface ChecklistItem {
  id: string
  title: string
  description: string
  icon: React.ElementType
  completed: boolean
  href: string
  completedHref?: string
}

// ============================================================================
// PROGRESS RING COMPONENT
// ============================================================================

interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
}

function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Onboarding progress"
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="motion-safe:transition-transform motion-safe:duration-300"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary motion-safe:transition-all motion-safe:duration-400 motion-safe:ease-out"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
          }}
        />
      </svg>
      {/* Center percentage */}
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {Math.round(progress)}%
      </span>
    </div>
  )
}

// ============================================================================
// CHECKLIST ITEM COMPONENT
// ============================================================================

interface ChecklistItemRowProps {
  item: ChecklistItem
  onComplete?: () => void
}

function ChecklistItemRow({ item }: ChecklistItemRowProps) {
  const Icon = item.icon
  const linkHref = item.completed && item.completedHref ? item.completedHref : item.href

  return (
    <li
      role="listitem"
      aria-checked={item.completed}
      className={cn(
        "flex items-start gap-3 rounded-lg p-3 min-h-12",
        "motion-safe:transition-colors",
        item.completed
          ? "bg-muted/50"
          : "hover:bg-muted/30 cursor-pointer"
      )}
    >
      {/* Status icon */}
      <div className="flex-shrink-0 mt-0.5">
        {item.completed ? (
          <CheckCircle2
            className={cn(
              "h-5 w-5 text-green-600",
              "motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-200"
            )}
            aria-hidden="true"
          />
        ) : (
          <Circle
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
          <span
            className={cn(
              "text-sm font-medium",
              item.completed && "line-through text-muted-foreground"
            )}
          >
            {item.title}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.description}
        </p>
      </div>

      {/* Action */}
      <div className="flex-shrink-0">
        {item.completed ? (
          <Link
            to={linkHref}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            View
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : (
          <Link
            to={item.href}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-8")}
          >
            Get started
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        )}
      </div>
    </li>
  )
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const onboardingKeys = {
  all: ["onboarding"] as const,
  progress: () => [...onboardingKeys.all, "progress"] as const,
}

// ============================================================================
// PHASE 2 ITEMS - Revealed after Phase 1 complete
// ============================================================================

const PHASE_2_ITEMS: ChecklistItem[] = [
  {
    id: "warranty",
    title: "Set up warranty policies",
    description: "Define warranty terms for your products",
    icon: Shield,
    completed: false,
    href: "/settings/warranty-policies",
  },
  {
    id: "email",
    title: "Connect your email",
    description: "Send campaigns and track communications",
    icon: Mail,
    completed: false,
    href: "/communications",
  },
  {
    id: "teammate",
    title: "Invite a team member",
    description: "Collaborate with your team in Renoz",
    icon: Users,
    completed: false,
    href: "/admin/users",
  },
  {
    id: "report",
    title: "View your first report",
    description: "Get insights into your business metrics",
    icon: BarChart3,
    completed: false,
    href: "/reports",
  },
]

// ============================================================================
// WELCOME CHECKLIST COMPONENT
// ============================================================================

export interface WelcomeChecklistProps {
  className?: string
}

export function WelcomeChecklist({ className }: WelcomeChecklistProps) {
  const queryClient = useQueryClient()
  const titleId = useId()
  const descriptionId = useId()
  const [showPhase2, setShowPhase2] = useState(false)
  const [celebratedPhase1, setCelebratedPhase1] = useState(false)

  // Server function bindings
  const getProgressFn = useServerFn(getOnboardingProgress)
  const dismissFn = useServerFn(dismissWelcomeChecklist)

  // Fetch onboarding progress
  const { data, isLoading, isError } = useQuery({
    queryKey: onboardingKeys.progress(),
    queryFn: async () => {
      return await getProgressFn()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async () => {
      return await dismissFn()
    },
    onSuccess: () => {
      // Invalidate the query to refetch
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() })
    },
  })

  const handleDismiss = useCallback(() => {
    dismissMutation.mutate()
  }, [dismissMutation])

  // Don't render if dismissed, loading, or error
  if (isLoading || isError || !data || data.dismissed) {
    return null
  }

  // Build Phase 1 checklist items from progress data
  const phase1Items: ChecklistItem[] = [
    {
      id: "customer",
      title: "Add your first customer",
      description: "Create a customer record to track contacts and orders",
      icon: Users,
      completed: data.hasCustomer,
      href: "/customers/new",
      completedHref: "/customers",
    },
    {
      id: "product",
      title: "Add your first product",
      description: "Set up your product catalog with pricing",
      icon: Package,
      completed: data.hasProduct,
      href: "/products/new",
      completedHref: "/products",
    },
    {
      id: "quote",
      title: "Create your first quote",
      description: "Build a quote or opportunity in the pipeline",
      icon: FileText,
      completed: data.hasQuote,
      href: "/pipeline/new",
      completedHref: "/pipeline",
    },
  ]

  const phase1Completed = phase1Items.filter((item) => item.completed).length
  const phase1Total = phase1Items.length
  const phase1Progress = (phase1Completed / phase1Total) * 100
  const phase1AllComplete = phase1Completed === phase1Total

  // Auto-reveal Phase 2 when Phase 1 complete (with delay for celebration)
  useEffect(() => {
    if (phase1AllComplete && !celebratedPhase1) {
      setCelebratedPhase1(true)
      // Small delay for celebration effect
      const timer = setTimeout(() => {
        setShowPhase2(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [phase1AllComplete, celebratedPhase1])

  const totalCompleted = phase1Completed + (showPhase2 ? 0 : 0) // Phase 2 not tracked yet
  const totalItems = phase1Total + (showPhase2 ? PHASE_2_ITEMS.length : 0)
  const totalProgress = (totalCompleted / totalItems) * 100

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300",
        className
      )}
    >
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle id={titleId} className="text-lg">
            {phase1AllComplete && !showPhase2 
              ? "🎉 Phase 1 Complete!" 
              : phase1AllComplete && showPhase2
              ? "Getting Started"
              : "Getting Started"}
          </CardTitle>
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {phase1AllComplete && !showPhase2
              ? "Great job! Unlock more features to get even more from Renoz."
              : phase1AllComplete && showPhase2
              ? `Complete these steps to unlock the full power of Renoz (${totalCompleted}/${totalItems})`
              : `Complete these steps to get the most out of Renoz (${phase1Completed}/${phase1Total})`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ProgressRing progress={showPhase2 ? totalProgress : phase1Progress} />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            disabled={dismissMutation.isPending}
            aria-label="Dismiss getting started checklist"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Phase 1 Items */}
        <ul role="list" className="space-y-2" aria-label="Onboarding tasks phase 1">
          {phase1Items.map((item) => (
            <ChecklistItemRow key={item.id} item={item} />
          ))}
        </ul>

        {/* Phase 2 Reveal */}
        {phase1AllComplete && showPhase2 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Unlock More Features
            </p>
            <ul role="list" className="space-y-2" aria-label="Onboarding tasks phase 2">
              {PHASE_2_ITEMS.map((item) => (
                <ChecklistItemRow key={item.id} item={item} />
              ))}
            </ul>
          </div>
        )}

        {/* Phase 2 Teaser (shown when Phase 1 complete but not yet revealed) */}
        {phase1AllComplete && !showPhase2 && (
          <div
            className="mt-4 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-center motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-300"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-medium text-amber-900">
              🎉 Congratulations on completing the basics!
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Revealing more features...
            </p>
          </div>
        )}

        {/* Dismiss CTA when all complete */}
        {phase1AllComplete && showPhase2 && (
          <div
            className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              You're on your way to becoming a Renoz expert!
            </p>
            <Button 
              variant="link" 
              size="sm" 
              className="text-green-600 mt-1 h-auto p-0"
              onClick={handleDismiss}
            >
              Dismiss checklist
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
