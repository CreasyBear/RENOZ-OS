/**
 * DuplicateWarningPanel Component
 *
 * Displays potential duplicate customer matches during creation/editing.
 * Shows match details and allows user to view existing customer or continue.
 *
 * @example
 * <DuplicateWarningPanel
 *   duplicates={duplicates}
 *   isChecking={isChecking}
 *   onViewCustomer={(id) => navigate(`/customers/${id}`)}
 *   onDismiss={(id) => dismissDuplicate(id)}
 *   onContinue={() => setDismissAll(true)}
 * />
 */
import { useState } from 'react'
import {
  AlertTriangle,
  ExternalLink,
  X,
  Loader2,
  Users,
  Mail,
  Phone,
  Hash,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { TruncateTooltip } from '@/components/shared/truncate-tooltip'
import { cn } from '@/lib/utils'
import type { DuplicateMatch } from '@/hooks'

// ============================================================================
// TYPES
// ============================================================================

interface DuplicateWarningPanelProps {
  /** List of potential duplicate matches */
  duplicates: DuplicateMatch[]
  /** Whether a check is in progress */
  isChecking?: boolean
  /** Whether there are more matches beyond the displayed limit */
  hasMore?: boolean
  /** Called when user clicks to view an existing customer */
  onViewCustomer?: (customerId: string) => void
  /** Called when user dismisses a specific match (not a duplicate) */
  onDismiss?: (customerId: string) => void
  /** Called when user wants to continue despite duplicates */
  onContinue?: () => void
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatMatchScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

function getMatchScoreColor(score: number): string {
  if (score >= 0.8) return 'text-red-600 bg-red-100'
  if (score >= 0.6) return 'text-orange-600 bg-orange-100'
  if (score >= 0.4) return 'text-yellow-600 bg-yellow-100'
  return 'text-blue-600 bg-blue-100'
}

// ============================================================================
// MATCH CARD COMPONENT
// ============================================================================

interface MatchCardProps {
  match: DuplicateMatch
  onView?: () => void
  onDismiss?: () => void
}

function MatchCard({ match, onView, onDismiss }: MatchCardProps) {
  return (
    <Card className="border-l-4 border-l-yellow-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Match Info */}
          <div className="flex-1 min-w-0">
            {/* Header with name and score */}
            <div className="flex items-center gap-2 mb-2">
              <TruncateTooltip text={match.name} maxLength={40} className="font-medium" />
              <Badge
                variant="secondary"
                className={cn('text-xs', getMatchScoreColor(match.matchScore))}
              >
                {formatMatchScore(match.matchScore)} match
              </Badge>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" />
                <TruncateTooltip text={match.customerCode} maxLength={20} />
              </div>
              {match.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <TruncateTooltip text={match.email} maxLength={25} />
                </div>
              )}
              {match.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  <TruncateTooltip text={match.phone} maxLength={20} />
                </div>
              )}
            </div>

            {/* Match reasons */}
            <div className="flex flex-wrap gap-1 mt-2">
              {match.matchReasons.map((reason, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={onView}
                className="text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-xs text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Not this
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DuplicateWarningPanel({
  duplicates,
  isChecking = false,
  hasMore = false,
  onViewCustomer,
  onDismiss,
  onContinue,
  className,
}: DuplicateWarningPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  // Don't show anything if no duplicates and not checking
  if (!isChecking && duplicates.length === 0) {
    return null
  }

  // If user dismissed the panel
  if (dismissed) {
    return (
      <Alert className={cn('border-green-200 bg-green-50', className)}>
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Confirmed</AlertTitle>
        <AlertDescription className="text-green-700">
          You&apos;ve confirmed this is a new customer.{' '}
          <Button
            variant="link"
            className="p-0 h-auto text-green-700 underline"
            onClick={() => setDismissed(false)}
          >
            Show matches again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Loading state
  if (isChecking && duplicates.length === 0) {
    return (
      <Alert className={cn('border-blue-200 bg-blue-50', className)}>
        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        <AlertTitle className="text-blue-800">Checking for duplicates…</AlertTitle>
        <AlertDescription className="text-blue-700">
          Searching for similar existing customers
        </AlertDescription>
      </Alert>
    )
  }

  // Duplicates found
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Alert
        variant="default"
        className={cn('border-yellow-300 bg-yellow-50', className)}
      >
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <AlertTitle className="text-yellow-800 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Similar customers found ({duplicates.length}
              {hasMore ? '+' : ''})
              {isChecking && (
                <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />
              )}
            </AlertTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-yellow-700">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <AlertDescription className="text-yellow-700 mt-1">
            These customers have similar information. Please review before creating
            a new record.
          </AlertDescription>
        </div>
      </Alert>

      <CollapsibleContent className="mt-2 space-y-2">
        {duplicates.map((match) => (
          <MatchCard
            key={match.customerId}
            match={match}
            onView={onViewCustomer ? () => onViewCustomer(match.customerId) : undefined}
            onDismiss={onDismiss ? () => onDismiss(match.customerId) : undefined}
          />
        ))}

        {hasMore && (
          <p className="text-sm text-muted-foreground text-center py-2">
            More similar customers exist. Refine your search for better matches.
          </p>
        )}

        {/* Continue anyway button */}
        {onContinue && (
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDismissed(true)
                onContinue()
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              This is a new customer - Continue
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

// ============================================================================
// COMPACT VARIANT (for inline use in forms)
// ============================================================================

interface CompactDuplicateWarningProps {
  duplicates: DuplicateMatch[]
  isChecking?: boolean
  onViewCustomer?: (customerId: string) => void
  className?: string
}

export function CompactDuplicateWarning({
  duplicates,
  isChecking = false,
  onViewCustomer,
  className,
}: CompactDuplicateWarningProps) {
  if (!isChecking && duplicates.length === 0) {
    return null
  }

  if (isChecking) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking for duplicates…
      </div>
    )
  }

  const topMatch = duplicates[0]

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-md border border-yellow-200',
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate">
        Similar: <strong>{topMatch.name}</strong>
        {duplicates.length > 1 && ` (+${duplicates.length - 1} more)`}
      </span>
      {onViewCustomer && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onViewCustomer(topMatch.customerId)}
        >
          View
        </Button>
      )}
    </div>
  )
}
