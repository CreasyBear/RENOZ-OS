/**
 * EmailTrackingBadge Component
 *
 * Displays email tracking status (opens, clicks, bounces) as visual badges.
 * Used in email lists and timelines to show engagement at a glance.
 *
 * @see DOM-COMMS-001c
 */
import { MousePointerClick, AlertTriangle, Clock, Check, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

type EmailStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'

interface EmailTrackingData {
  status: EmailStatus
  openedAt?: Date | null
  clickedAt?: Date | null
  openCount?: number
  clickCount?: number
  bouncedAt?: Date | null
  bounceReason?: string | null
  sentAt?: Date | null
}

interface EmailTrackingBadgeProps {
  tracking: EmailTrackingData
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EmailTrackingBadge({
  tracking,
  variant = 'default',
  className,
}: EmailTrackingBadgeProps) {
  const { status, openedAt, clickedAt, openCount = 0, clickCount = 0, bouncedAt, bounceReason } = tracking

  // Handle bounced/failed status
  if (bouncedAt || status === 'bounced' || status === 'failed') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="destructive" className={cn('gap-1', className)}>
              <AlertTriangle className="h-3 w-3" />
              {status === 'bounced' ? 'Bounced' : 'Failed'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{bounceReason || 'Email could not be delivered'}</p>
            {bouncedAt && <p className="text-xs text-muted-foreground">{formatRelativeTime(new Date(bouncedAt))}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Compact variant - single badge showing primary status
  if (variant === 'compact') {
    if (clickedAt || clickCount > 0) {
      return (
        <Badge variant="default" className={cn('gap-1 bg-blue-600', className)}>
          <MousePointerClick className="h-3 w-3" />
          {clickCount > 1 ? `${clickCount}x` : 'Clicked'}
        </Badge>
      )
    }
    if (openedAt || openCount > 0) {
      return (
        <Badge variant="default" className={cn('gap-1 bg-green-600', className)}>
          <Eye className="h-3 w-3" />
          {openCount > 1 ? `${openCount}x` : 'Opened'}
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className={cn('gap-1', className)}>
        <Check className="h-3 w-3" />
        Sent
      </Badge>
    )
  }

  // Default and detailed variants - multiple badges
  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {/* Open badge */}
      {openedAt || openCount > 0 ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                <Eye className="h-3 w-3" />
                Opened {openCount > 1 ? `${openCount}x` : ''}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Opened {openCount} time{openCount !== 1 ? 's' : ''}</p>
              {openedAt && <p className="text-xs text-muted-foreground">First opened: {formatRelativeTime(new Date(openedAt))}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : status !== 'pending' && (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Eye className="h-3 w-3" />
          Not opened
        </Badge>
      )}

      {/* Click badge */}
      {(clickedAt || clickCount > 0) && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="default" className="gap-1 bg-blue-600 hover:bg-blue-700">
                <MousePointerClick className="h-3 w-3" />
                Clicked {clickCount > 1 ? `${clickCount}x` : ''}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clicked {clickCount} time{clickCount !== 1 ? 's' : ''}</p>
              {clickedAt && <p className="text-xs text-muted-foreground">First clicked: {formatRelativeTime(new Date(clickedAt))}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Pending/Sent status when no engagement */}
      {!openedAt && !clickedAt && openCount === 0 && clickCount === 0 && (
        <Badge variant="secondary" className="gap-1">
          {status === 'pending' ? (
            <>
              <Clock className="h-3 w-3" />
              Pending
            </>
          ) : (
            <>
              <Check className="h-3 w-3" />
              Sent
            </>
          )}
        </Badge>
      )}

      {/* Detailed variant shows additional info */}
      {variant === 'detailed' && tracking.sentAt && (
        <span className="text-xs text-muted-foreground">
          Sent {formatRelativeTime(new Date(tracking.sentAt))}
        </span>
      )}
    </div>
  )
}

export type { EmailStatus, EmailTrackingData, EmailTrackingBadgeProps }
