/**
 * SegmentManager Component
 *
 * Manage saved customer segments:
 * - List all segments with key metrics
 * - Create, edit, delete segments
 * - View segment customers
 * - Segment overlap analysis
 */
import { useState } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit,
  Trash2,
  Eye,
  Copy,
  BarChart3,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { FormatAmount } from '@/components/shared/format'

// ============================================================================
// TYPES
// ============================================================================

interface Segment {
  id: string
  name: string
  description: string
  customerCount: number
  totalValue: number
  avgHealthScore: number
  growth: number // Percentage change from last period
  createdAt: string
  updatedAt: string
  isActive: boolean
  criteriaCount: number
}

interface SegmentManagerProps {
  segments?: Segment[]
  isLoading?: boolean
  onCreateSegment?: () => void
  onEditSegment?: (segmentId: string) => void
  onDeleteSegment?: (segmentId: string) => void
  onViewCustomers?: (segmentId: string) => void
  onViewAnalytics?: (segmentId: string) => void
  className?: string
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

function getHealthBg(score: number): string {
  if (score >= 80) return 'bg-green-100'
  if (score >= 60) return 'bg-yellow-100'
  if (score >= 40) return 'bg-orange-100'
  return 'bg-red-100'
}

// ============================================================================
// SEGMENT ROW COMPONENT
// ============================================================================

interface SegmentRowProps {
  segment: Segment
  onEdit?: () => void
  onDelete?: () => void
  onViewCustomers?: () => void
  onViewAnalytics?: () => void
}

function SegmentRow({
  segment,
  onEdit,
  onDelete,
  onViewCustomers,
  onViewAnalytics,
}: SegmentRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium">{segment.name}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">
            {segment.description}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{segment.customerCount.toLocaleString()}</span>
        </div>
      </TableCell>
      <TableCell>
        <span className="font-medium"><FormatAmount amount={segment.totalValue} cents={false} compact showCents={false} /></span>
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className={cn(getHealthBg(segment.avgHealthScore), getHealthColor(segment.avgHealthScore))}
        >
          {segment.avgHealthScore}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {segment.growth > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : segment.growth < 0 ? (
            <TrendingDown className="h-4 w-4 text-red-600" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={cn(
            'text-sm font-medium',
            segment.growth > 0 ? 'text-green-600' :
            segment.growth < 0 ? 'text-red-600' : 'text-muted-foreground'
          )}>
            {segment.growth > 0 ? '+' : ''}{segment.growth.toFixed(1)}%
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{segment.criteriaCount} rules</Badge>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {formatDate(segment.updatedAt)}
        </span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewCustomers}>
              <Eye className="h-4 w-4 mr-2" />
              View Customers
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onViewAnalytics}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Segment
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

// ============================================================================
// SEGMENT CARD (Mobile view)
// ============================================================================

interface SegmentCardProps {
  segment: Segment
  onEdit?: () => void
  onDelete?: () => void
  onViewCustomers?: () => void
}

function SegmentCard({ segment, onEdit, onViewCustomers }: SegmentCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{segment.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {segment.description}
            </CardDescription>
          </div>
          <Badge variant="outline">{segment.criteriaCount} rules</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-lg font-bold">{segment.customerCount}</p>
            <p className="text-xs text-muted-foreground">Customers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold"><FormatAmount amount={segment.totalValue} cents={false} compact showCents={false} /></p>
            <p className="text-xs text-muted-foreground">Value</p>
          </div>
          <div className="text-center">
            <p className={cn('text-lg font-bold', getHealthColor(segment.avgHealthScore))}>
              {segment.avgHealthScore}
            </p>
            <p className="text-xs text-muted-foreground">Health</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onViewCustomers}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SUMMARY STATS
// ============================================================================

interface SummaryStatsProps {
  segments: Segment[]
}

function SummaryStats({ segments }: SummaryStatsProps) {
  const totalCustomers = segments.reduce((sum, s) => sum + s.customerCount, 0)
  const totalValue = segments.reduce((sum, s) => sum + s.totalValue, 0)
  const avgHealth = segments.length > 0
    ? Math.round(segments.reduce((sum, s) => sum + s.avgHealthScore, 0) / segments.length)
    : 0

  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{segments.length}</p>
            <p className="text-sm text-muted-foreground">Active Segments</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{totalCustomers.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Customers</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-3xl font-bold"><FormatAmount amount={totalValue} cents={false} compact showCents={false} /></p>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className={cn('text-3xl font-bold', getHealthColor(avgHealth))}>
              {avgHealth}
            </p>
            <p className="text-sm text-muted-foreground">Avg Health Score</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SegmentManager({
  segments: propSegments,
  isLoading = false,
  onCreateSegment,
  onEditSegment,
  onDeleteSegment,
  onViewCustomers,
  onViewAnalytics,
  className,
}: SegmentManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Use provided segments or empty array
  const segments = propSegments ?? []

  // Filter segments by search
  const filteredSegments = segments.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = () => {
    if (deleteConfirmId && onDeleteSegment) {
      onDeleteSegment(deleteConfirmId)
    }
    setDeleteConfirmId(null)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Stats */}
      <SummaryStats segments={segments} />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search segments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onCreateSegment}>
          <Plus className="h-4 w-4 mr-2" />
          Create Segment
        </Button>
      </div>

      {/* Table (desktop) */}
      <div className="hidden lg:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Growth</TableHead>
                <TableHead>Criteria</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredSegments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No segments match your search' : 'No segments yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSegments.map(segment => (
                  <SegmentRow
                    key={segment.id}
                    segment={segment}
                    onEdit={() => onEditSegment?.(segment.id)}
                    onDelete={() => handleDelete(segment.id)}
                    onViewCustomers={() => onViewCustomers?.(segment.id)}
                    onViewAnalytics={() => onViewAnalytics?.(segment.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Cards (mobile) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredSegments.length === 0 ? (
          <Card className="sm:col-span-2">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {searchQuery ? 'No segments match your search' : 'No segments yet'}
            </CardContent>
          </Card>
        ) : (
          filteredSegments.map(segment => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              onEdit={() => onEditSegment?.(segment.id)}
              onDelete={() => handleDelete(segment.id)}
              onViewCustomers={() => onViewCustomers?.(segment.id)}
            />
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Segment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this segment? This action cannot be undone.
              Customers in this segment will not be affected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
