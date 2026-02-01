/**
 * ActivityTimeline Component
 *
 * @deprecated Use CustomerActivityTimelineContainer from
 * '@/components/domain/customers' instead for better consistency
 * with the unified activity system.
 *
 * Migration:
 * ```tsx
 * // Before
 * import { ActivityTimeline } from '@/components/domain/customers/activity-timeline';
 * <ActivityTimeline activities={activities} />
 *
 * // After
 * import { CustomerActivityTimelineContainer } from '@/components/domain/customers';
 * <CustomerActivityTimelineContainer customerId={customerId} />
 * ```
 *
 * Or use the shared UnifiedActivityTimeline directly for more control.
 */
import { useEffect } from 'react';
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  FileText,
  ShoppingCart,
  AlertCircle,
  ThumbsUp,
  Globe,
  Share2,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface Activity {
  id: string
  activityType: string
  direction?: string | null
  subject?: string | null
  description: string
  createdAt: string
  completedAt?: string | null
  duration?: number | null
}

interface ActivityTimelineProps {
  activities: Activity[]
}

// ============================================================================
// HELPERS
// ============================================================================

const activityConfig: Record<
  string,
  { icon: typeof Phone; color: string; label: string }
> = {
  call: { icon: Phone, color: 'text-blue-600 bg-blue-100', label: 'Call' },
  email: { icon: Mail, color: 'text-green-600 bg-green-100', label: 'Email' },
  meeting: { icon: Calendar, color: 'text-purple-600 bg-purple-100', label: 'Meeting' },
  note: { icon: MessageSquare, color: 'text-gray-600 bg-gray-100', label: 'Note' },
  quote: { icon: FileText, color: 'text-amber-600 bg-amber-100', label: 'Quote' },
  order: { icon: ShoppingCart, color: 'text-indigo-600 bg-indigo-100', label: 'Order' },
  complaint: { icon: AlertCircle, color: 'text-red-600 bg-red-100', label: 'Complaint' },
  feedback: { icon: ThumbsUp, color: 'text-teal-600 bg-teal-100', label: 'Feedback' },
  website_visit: { icon: Globe, color: 'text-cyan-600 bg-cyan-100', label: 'Website Visit' },
  social_interaction: { icon: Share2, color: 'text-pink-600 bg-pink-100', label: 'Social' },
}

function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffWeek < 4) return `${diffWeek}w ago`
  if (diffMonth < 12) return `${diffMonth}mo ago`
  return then.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-AU', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

function ActivityItem({ activity }: { activity: Activity }) {
  const config = activityConfig[activity.activityType] || {
    icon: MessageSquare,
    color: 'text-gray-600 bg-gray-100',
    label: activity.activityType,
  }
  const Icon = config.icon

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-5 top-10 bottom-0 w-px bg-border last:hidden" />

      {/* Icon */}
      <div
        className={cn(
          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          config.color
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{config.label}</span>
          {activity.direction && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {activity.direction === 'inbound' ? (
                <ArrowDownLeft className="h-3 w-3" />
              ) : activity.direction === 'outbound' ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : null}
              {activity.direction}
            </span>
          )}
          {activity.duration && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(activity.duration)}
            </span>
          )}
        </div>

        {activity.subject && (
          <p className="text-sm font-medium text-foreground mt-1">
            {activity.subject}
          </p>
        )}

        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {activity.description}
        </p>

        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span title={formatDateTime(activity.createdAt)}>
            {formatRelativeTime(activity.createdAt)}
          </span>
          {activity.completedAt && (
            <span className="text-green-600">
              Completed {formatRelativeTime(activity.completedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  // Deprecation warning
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[DEPRECATED] ActivityTimeline from @/components/domain/customers/activity-timeline is deprecated. ' +
        'Use CustomerActivityTimelineContainer from @/components/domain/customers or ' +
        'UnifiedActivityTimeline from @/components/shared/activity instead.'
      );
    }
  }, []);

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-1">No activities yet</h3>
        <p className="text-sm text-muted-foreground">
          Activities will appear here as you interact with this customer
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  )
}
