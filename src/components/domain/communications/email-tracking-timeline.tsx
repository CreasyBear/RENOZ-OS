/**
 * EmailTrackingTimeline Component
 *
 * Displays a timeline of tracking events for a specific email:
 * - Email sent event
 * - Open events (with device/location info)
 * - Click events (with link details)
 *
 * @see DOM-COMMS-001c
 */
import { Mail, Eye, MousePointerClick, Send, Clock, Monitor, Smartphone, Tablet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { LinkClicks } from '@/../drizzle/schema'

// ============================================================================
// TYPES
// ============================================================================

type TrackingEventType = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced'

interface TrackingEvent {
  id: string
  type: TrackingEventType
  timestamp: Date
  details?: {
    url?: string
    linkId?: string
    userAgent?: string
    location?: string
  }
}

interface EmailTrackingTimelineProps {
  emailId: string
  sentAt?: Date | null
  deliveredAt?: Date | null
  openedAt?: Date | null
  clickedAt?: Date | null
  bouncedAt?: Date | null
  bounceReason?: string | null
  linkClicks?: LinkClicks | null
  isLoading?: boolean
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function formatDate(date: Date): string {
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return `Today at ${formatTime(date)}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${formatTime(date)}`
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function parseUserAgent(userAgent?: string): { device: string; icon: typeof Monitor } {
  if (!userAgent) return { device: 'Unknown device', icon: Monitor }

  const ua = userAgent.toLowerCase()

  if (ua.includes('iphone') || ua.includes('android') && ua.includes('mobile')) {
    return { device: 'Mobile', icon: Smartphone }
  }
  if (ua.includes('ipad') || ua.includes('tablet')) {
    return { device: 'Tablet', icon: Tablet }
  }

  // Extract browser
  let browser = 'Browser'
  if (ua.includes('chrome') && !ua.includes('edge')) browser = 'Chrome'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('edge')) browser = 'Edge'

  // Extract OS
  let os = ''
  if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS'
  else if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('linux')) os = 'Linux'

  return {
    device: os ? `${browser} on ${os}` : browser,
    icon: Monitor
  }
}

function buildTimelineEvents(props: EmailTrackingTimelineProps): TrackingEvent[] {
  const events: TrackingEvent[] = []

  // Add sent event
  if (props.sentAt) {
    events.push({
      id: 'sent',
      type: 'sent',
      timestamp: new Date(props.sentAt),
    })
  }

  // Add delivered event
  if (props.deliveredAt) {
    events.push({
      id: 'delivered',
      type: 'delivered',
      timestamp: new Date(props.deliveredAt),
    })
  }

  // Add bounced event
  if (props.bouncedAt) {
    events.push({
      id: 'bounced',
      type: 'bounced',
      timestamp: new Date(props.bouncedAt),
      details: {
        url: props.bounceReason || undefined,
      },
    })
  }

  // Add opened event (first open)
  if (props.openedAt && !props.bouncedAt) {
    events.push({
      id: 'opened',
      type: 'opened',
      timestamp: new Date(props.openedAt),
    })
  }

  // Add clicked event (first click)
  if (props.clickedAt && !props.bouncedAt) {
    events.push({
      id: 'clicked',
      type: 'clicked',
      timestamp: new Date(props.clickedAt),
    })
  }

  // Add individual link click events
  if (props.linkClicks?.clicks) {
    props.linkClicks.clicks.forEach((click, index) => {
      events.push({
        id: `click-${index}`,
        type: 'clicked',
        timestamp: new Date(click.clickedAt),
        details: {
          url: click.url,
          linkId: click.linkId,
          userAgent: click.userAgent,
        },
      })
    })
  }

  // Sort events by timestamp (newest first)
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EmailTrackingTimeline({
  emailId,
  sentAt,
  deliveredAt,
  openedAt,
  clickedAt,
  bouncedAt,
  bounceReason,
  linkClicks,
  isLoading = false,
  className,
}: EmailTrackingTimelineProps) {
  const events = buildTimelineEvents({
    emailId,
    sentAt,
    deliveredAt,
    openedAt,
    clickedAt,
    bouncedAt,
    bounceReason,
    linkClicks,
  })

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No tracking events yet</p>
      </div>
    )
  }

  return (
    <div className={cn('relative pl-4', className)}>
      {/* Timeline line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

      <div className="space-y-4">
        {events.map((event, index) => (
          <TimelineEvent key={event.id} event={event} isFirst={index === 0} />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function TimelineEvent({ event, isFirst }: { event: TrackingEvent; isFirst: boolean }) {
  const config = getEventConfig(event.type)
  const Icon = config.icon
  const deviceInfo = event.details?.userAgent ? parseUserAgent(event.details.userAgent) : null
  const DeviceIcon = deviceInfo?.icon || Monitor

  return (
    <div className="relative flex gap-3">
      {/* Timeline dot */}
      <div
        className={cn(
          'relative z-10 flex h-4 w-4 items-center justify-center rounded-full',
          config.bgColor,
          isFirst && 'ring-2 ring-primary/20'
        )}
      >
        <Icon className={cn('h-2.5 w-2.5', config.textColor)} />
      </div>

      {/* Event content */}
      <Card className="flex-1">
        <CardContent className="pt-3 pb-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{config.label}</h4>

              {/* Event-specific details */}
              {event.type === 'clicked' && event.details?.url && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {new URL(event.details.url).hostname}{new URL(event.details.url).pathname}
                </p>
              )}

              {event.type === 'bounced' && event.details?.url && (
                <p className="text-xs text-destructive mt-0.5">
                  {event.details.url}
                </p>
              )}

              {/* Device info */}
              {deviceInfo && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <DeviceIcon className="h-3 w-3" />
                  <span>{deviceInfo.device}</span>
                </div>
              )}
            </div>

            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(event.timestamp)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getEventConfig(type: TrackingEventType): {
  icon: typeof Mail
  label: string
  bgColor: string
  textColor: string
} {
  switch (type) {
    case 'sent':
      return {
        icon: Send,
        label: 'Email Sent',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
      }
    case 'delivered':
      return {
        icon: Mail,
        label: 'Email Delivered',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600',
      }
    case 'opened':
      return {
        icon: Eye,
        label: 'Email Opened',
        bgColor: 'bg-green-100',
        textColor: 'text-green-600',
      }
    case 'clicked':
      return {
        icon: MousePointerClick,
        label: 'Link Clicked',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-600',
      }
    case 'bounced':
      return {
        icon: Mail,
        label: 'Email Bounced',
        bgColor: 'bg-red-100',
        textColor: 'text-red-600',
      }
    default:
      return {
        icon: Mail,
        label: 'Event',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
      }
  }
}

export type { TrackingEvent, TrackingEventType, EmailTrackingTimelineProps }
