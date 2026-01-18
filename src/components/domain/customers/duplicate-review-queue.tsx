/**
 * DuplicateReviewQueue Component
 *
 * Queue interface for reviewing potential duplicate pairs.
 * Shows list of pairs and allows navigation through them.
 */
import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Users,
  RefreshCw,
  Filter,
  History,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DuplicateComparison } from './duplicate-comparison'
import { TruncateTooltip } from '@/components/shared/truncate-tooltip'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface CustomerData {
  id: string
  customerCode: string
  name: string
  email: string | null
  phone: string | null
  status: string
  lifetimeValue: number
  createdAt: string
  totalOrders?: number
  healthScore?: number
}

interface DuplicatePair {
  id: string
  customer1: CustomerData
  customer2: CustomerData
  matchScore: number
  matchReasons: string[]
  status: 'pending' | 'merged' | 'dismissed'
}

interface AuditEntry {
  id: string
  action: 'merged' | 'dismissed' | 'undone'
  primaryName: string
  secondaryName: string
  performedAt: string
  performedBy: string
}

interface DuplicateReviewQueueProps {
  /** List of duplicate pairs to review */
  pairs: DuplicatePair[]
  /** Whether more pairs can be loaded */
  hasMore?: boolean
  /** Total count of pairs */
  total?: number
  /** Whether data is loading */
  isLoading?: boolean
  /** Called when a pair is merged */
  onMerge?: (pairId: string, primaryId: string, secondaryId: string) => Promise<void>
  /** Called when a pair is dismissed */
  onDismiss?: (pairId: string) => Promise<void>
  /** Called to load more pairs */
  onLoadMore?: () => void
  /** Called to refresh the list */
  onRefresh?: () => void
  /** Audit history */
  auditHistory?: AuditEntry[]
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// PAIR LIST ITEM
// ============================================================================

interface PairListItemProps {
  pair: DuplicatePair
  isActive: boolean
  onClick: () => void
}

function PairListItem({ pair, isActive, onClick }: PairListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-colors',
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:bg-muted/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <TruncateTooltip text={pair.customer1.name} maxLength={30} className="font-medium" />
          <div className="text-sm text-muted-foreground">
            ↔ <TruncateTooltip text={pair.customer2.name} maxLength={30} className="inline" />
          </div>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            'text-xs flex-shrink-0',
            pair.matchScore >= 0.7
              ? 'bg-red-100 text-red-700'
              : pair.matchScore >= 0.5
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-blue-100 text-blue-700'
          )}
        >
          {Math.round(pair.matchScore * 100)}%
        </Badge>
      </div>
      <div className="flex gap-1 mt-1">
        {pair.matchReasons.slice(0, 2).map((reason, idx) => (
          <Badge key={idx} variant="outline" className="text-[10px] py-0">
            {reason.split(':')[0]}
          </Badge>
        ))}
      </div>
    </button>
  )
}

// ============================================================================
// AUDIT HISTORY ITEM
// ============================================================================

interface AuditItemProps {
  entry: AuditEntry
}

function AuditItem({ entry }: AuditItemProps) {
  const icons = {
    merged: <Check className="h-4 w-4 text-green-600" />,
    dismissed: <X className="h-4 w-4 text-gray-600" />,
    undone: <RefreshCw className="h-4 w-4 text-yellow-600" />,
  }

  const labels = {
    merged: 'Merged',
    dismissed: 'Dismissed',
    undone: 'Undone',
  }

  return (
    <div className="flex items-start gap-3 p-3 border-b last:border-0">
      <div className="mt-0.5">{icons[entry.action]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{entry.primaryName}</span>
          {entry.action === 'merged' && (
            <span className="text-muted-foreground">
              {' '}← merged with {entry.secondaryName}
            </span>
          )}
          {entry.action === 'dismissed' && (
            <span className="text-muted-foreground">
              {' '}≠ {entry.secondaryName}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(entry.performedAt).toLocaleString()}
        </p>
      </div>
      <Badge variant="outline" className="text-xs">
        {labels[entry.action]}
      </Badge>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DuplicateReviewQueue({
  pairs,
  hasMore = false,
  total = 0,
  isLoading = false,
  onMerge,
  onDismiss,
  onLoadMore,
  onRefresh,
  auditHistory = [],
  className,
}: DuplicateReviewQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMerging, setIsMerging] = useState(false)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [tab, setTab] = useState<'queue' | 'history'>('queue')

  // Filter pairs
  const filteredPairs = pairs.filter((pair) => {
    if (pair.status !== 'pending') return false
    if (filter === 'all') return true
    if (filter === 'high') return pair.matchScore >= 0.7
    if (filter === 'medium') return pair.matchScore >= 0.5 && pair.matchScore < 0.7
    if (filter === 'low') return pair.matchScore < 0.5
    return true
  })

  const currentPair = filteredPairs[currentIndex]
  const progress = total > 0 ? ((total - filteredPairs.length) / total) * 100 : 0

  // Navigation
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < filteredPairs.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  // Handle merge
  const handleMerge = async (primaryId: string, secondaryId: string) => {
    if (!currentPair || !onMerge) return

    setIsMerging(true)
    try {
      await onMerge(currentPair.id, primaryId, secondaryId)
      // Move to next pair
      if (currentIndex >= filteredPairs.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1))
      }
    } finally {
      setIsMerging(false)
    }
  }

  // Handle dismiss
  const handleDismiss = async () => {
    if (!currentPair || !onDismiss) return

    setIsMerging(true)
    try {
      await onDismiss(currentPair.id)
      // Move to next pair
      if (currentIndex >= filteredPairs.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1))
      }
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <div className={cn('flex h-full', className)}>
      {/* Left sidebar - pair list */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Duplicates
              {filteredPairs.length > 0 && (
                <Badge variant="secondary">{filteredPairs.length}</Badge>
              )}
            </h2>
            <Button variant="ghost" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Filter */}
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by confidence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All matches</SelectItem>
              <SelectItem value="high">High confidence (≥70%)</SelectItem>
              <SelectItem value="medium">Medium (50-69%)</SelectItem>
              <SelectItem value="low">Low (&lt;50%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="queue" className="flex-1">
              Queue
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <History className="h-3 w-3 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {isLoading && filteredPairs.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPairs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>All duplicates reviewed!</p>
                  </div>
                ) : (
                  filteredPairs.map((pair, idx) => (
                    <PairListItem
                      key={pair.id}
                      pair={pair}
                      isActive={idx === currentIndex}
                      onClick={() => setCurrentIndex(idx)}
                    />
                  ))
                )}

                {hasMore && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={onLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Load more'
                    )}
                  </Button>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-2">
                {auditHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2" />
                    <p>No merge history yet</p>
                  </div>
                ) : (
                  auditHistory.map((entry) => (
                    <AuditItem key={entry.id} entry={entry} />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Main content - comparison view */}
      <div className="flex-1 flex flex-col">
        {/* Navigation header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              disabled={currentIndex === 0 || filteredPairs.length === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              {filteredPairs.length > 0
                ? `${currentIndex + 1} of ${filteredPairs.length}`
                : 'No pairs'}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              disabled={
                currentIndex >= filteredPairs.length - 1 || filteredPairs.length === 0
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {currentPair && (
            <Badge
              variant="outline"
              className={cn(
                currentPair.matchScore >= 0.7
                  ? 'border-red-300 text-red-700'
                  : currentPair.matchScore >= 0.5
                    ? 'border-yellow-300 text-yellow-700'
                    : 'border-blue-300 text-blue-700'
              )}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {Math.round(currentPair.matchScore * 100)}% Match Confidence
            </Badge>
          )}
        </div>

        {/* Comparison content */}
        <div className="flex-1 overflow-auto p-6">
          {currentPair ? (
            <DuplicateComparison
              customer1={currentPair.customer1}
              customer2={currentPair.customer2}
              matchScore={currentPair.matchScore}
              matchReasons={currentPair.matchReasons}
              onMerge={handleMerge}
              onDismiss={handleDismiss}
              isMerging={isMerging}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Check className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-foreground">
                All Duplicates Reviewed
              </h3>
              <p className="text-sm">
                You've reviewed all potential duplicates in the queue
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
