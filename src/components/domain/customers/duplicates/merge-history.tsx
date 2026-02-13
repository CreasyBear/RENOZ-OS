/**
 * MergeHistory Component
 *
 * Audit trail for customer merge operations:
 * - View all past merges
 * - Merge details and field changes
 * - Undo capability
 * - Export audit log
 *
 * ARCHITECTURE: Presentational component - receives data via props from route.
 */
import { useState } from 'react'
import {
  History,
  Undo2,
  Eye,
  Download,
  Search,
  Calendar,
  User,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface MergeRecord {
  id: string
  organizationId?: string
  primaryCustomerId: string
  mergedCustomerId: string | null
  action: string
  reason?: string | null
  performedBy: string
  performedAt: string
  mergedData?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  // Extended fields for display (may come from joins)
  primaryCustomer?: {
    id: string
    code: string
    name: string
  }
  secondaryCustomer?: {
    id: string
    code: string
    name: string
  }
  mergedByName?: string
  fieldChanges?: Array<{
    field: string
    fromValue: string | null
    toValue: string | null
    source: 'primary' | 'secondary'
  }>
  relatedDataMerged?: {
    contacts: number
    addresses: number
    orders: number
    activities: number
  }
}

interface MergeHistoryProps {
  /** Merge history records from server */
  history?: MergeRecord[]
  /** Loading state */
  isLoading?: boolean
  /** View customer handler */
  onViewCustomer?: (customerId: string) => void
  /** Undo merge handler */
  onUndo?: (mergeId: string) => void
  className?: string
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function MergeHistorySkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-12 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// MERGE DETAIL DIALOG
// ============================================================================

interface MergeDetailDialogProps {
  merge: MergeRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewCustomer: (customerId: string) => void
  onUndo: () => void
}

function MergeDetailDialog({
  merge,
  open,
  onOpenChange,
  onViewCustomer,
  onUndo,
}: MergeDetailDialogProps) {
  if (!merge) return null

  const isUndone = merge.action === 'undone'
  const isDismissed = merge.action === 'dismissed'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isDismissed ? 'Dismissal Details' : 'Merge Details'}
          </DialogTitle>
          <DialogDescription>
            {merge.reason || 'No additional details available'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          {isUndone && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">This operation was undone</span>
            </div>
          )}

          {/* Customers */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">
                {isDismissed ? 'Customer 1' : 'Secondary (Archived)'}
              </p>
              <p className="font-medium">
                {merge.secondaryCustomer?.name ?? merge.mergedCustomerId}
              </p>
              <p className="text-sm text-muted-foreground">
                {merge.secondaryCustomer?.code ?? ''}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="p-3 rounded-lg bg-primary/10">
              <p className="text-sm text-muted-foreground">
                {isDismissed ? 'Customer 2' : 'Primary (Kept)'}
              </p>
              <p className="font-medium">
                {merge.primaryCustomer?.name ?? merge.primaryCustomerId}
              </p>
              <p className="text-sm text-muted-foreground">
                {merge.primaryCustomer?.code ?? ''}
              </p>
              {merge.primaryCustomer && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 -ml-2"
                  onClick={() => onViewCustomer(merge.primaryCustomerId)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              )}
            </div>
          </div>

          {/* Field Changes (if available) */}
          {merge.fieldChanges && merge.fieldChanges.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Field Changes</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merge.fieldChanges.map((change, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{change.field}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {change.fromValue ?? '(empty)'}
                      </TableCell>
                      <TableCell>{change.toValue ?? '(empty)'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{change.source}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Related Data (if available) */}
          {merge.relatedDataMerged && (
            <div>
              <h4 className="font-medium mb-2">Related Data Merged</h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 rounded-lg bg-muted">
                  <p className="text-lg font-bold">{merge.relatedDataMerged.contacts}</p>
                  <p className="text-xs text-muted-foreground">Contacts</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted">
                  <p className="text-lg font-bold">{merge.relatedDataMerged.addresses}</p>
                  <p className="text-xs text-muted-foreground">Addresses</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted">
                  <p className="text-lg font-bold">{merge.relatedDataMerged.orders}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted">
                  <p className="text-lg font-bold">{merge.relatedDataMerged.activities}</p>
                  <p className="text-xs text-muted-foreground">Activities</p>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-sm text-muted-foreground border-t pt-4">
            <p>
              {isDismissed ? 'Dismissed' : 'Merged'} by{' '}
              {merge.mergedByName ?? merge.performedBy} on{' '}
              {new Date(merge.performedAt).toLocaleString()}
            </p>
          </div>
        </div>

        <DialogFooter>
          {merge.action === 'merged' && (
            <Button variant="outline" onClick={onUndo}>
              <Undo2 className="h-4 w-4 mr-2" />
              Undo Merge
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MergeHistory({
  history,
  isLoading = false,
  onViewCustomer,
  onUndo,
  className,
}: MergeHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'merged' | 'dismissed' | 'undone'>('all')
  const [selectedMerge, setSelectedMerge] = useState<MergeRecord | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  // Filter history
  const filteredHistory = (history ?? []).filter((merge) => {
    // Status filter
    if (statusFilter !== 'all' && merge.action !== statusFilter) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const primaryName = merge.primaryCustomer?.name?.toLowerCase() ?? ''
      const secondaryName = merge.secondaryCustomer?.name?.toLowerCase() ?? ''
      const primaryCode = merge.primaryCustomer?.code?.toLowerCase() ?? ''
      const secondaryCode = merge.secondaryCustomer?.code?.toLowerCase() ?? ''
      const performerName = merge.mergedByName?.toLowerCase() ?? merge.performedBy.toLowerCase()

      return (
        primaryName.includes(query) ||
        secondaryName.includes(query) ||
        primaryCode.includes(query) ||
        secondaryCode.includes(query) ||
        performerName.includes(query)
      )
    }

    return true
  })

  // Handle view
  const handleViewMerge = (merge: MergeRecord) => {
    setSelectedMerge(merge)
    setShowDetailDialog(true)
  }

  // Handle undo
  const handleUndo = (mergeId: string) => {
    setShowDetailDialog(false)
    onUndo?.(mergeId)
  }

  // Export to CSV
  const handleExport = () => {
    const csv = [
      ['Date', 'Action', 'Primary Customer', 'Secondary Customer', 'Performed By'].join(','),
      ...filteredHistory.map((m) =>
        [
          new Date(m.performedAt).toLocaleDateString(),
          m.action,
          `"${m.primaryCustomer?.name ?? m.primaryCustomerId}"`,
          `"${m.secondaryCustomer?.name ?? m.mergedCustomerId}"`,
          `"${m.mergedByName ?? m.performedBy}"`,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `merge-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Calculate stats
  const stats = {
    totalMerges: (history ?? []).filter((h) => h.action === 'merged').length,
    thisMonth: (history ?? []).filter((h) => {
      const date = new Date(h.performedAt)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length,
    undone: (history ?? []).filter((h) => h.action === 'undone').length,
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6" />
              Merge History
            </h2>
            <p className="text-muted-foreground">View and manage past customer merges</p>
          </div>
        </div>
        <MergeHistorySkeleton />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Merge History
          </h2>
          <p className="text-muted-foreground">View and manage past customer merges</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!filteredHistory.length}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search history…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="merged">Merged</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="undone">Undone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalMerges}</div>
            <p className="text-sm text-muted-foreground">Total Merges</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-sm text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.undone}</div>
            <p className="text-sm text-muted-foreground">Undone</p>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audit Log</CardTitle>
          <CardDescription>
            {filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Primary Customer</TableHead>
                <TableHead>Secondary Customer</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((merge) => (
                  <TableRow key={merge.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(merge.performedAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          merge.action === 'merged' && 'bg-green-100 text-green-700',
                          merge.action === 'dismissed' && 'bg-blue-100 text-blue-700',
                          merge.action === 'undone' && 'bg-yellow-100 text-yellow-700'
                        )}
                      >
                        {merge.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {merge.primaryCustomer?.name ?? merge.primaryCustomerId}
                        </p>
                        {merge.primaryCustomer?.code && (
                          <p className="text-sm text-muted-foreground">
                            {merge.primaryCustomer.code}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {merge.secondaryCustomer?.name ?? merge.mergedCustomerId}
                        </p>
                        {merge.secondaryCustomer?.code && (
                          <p className="text-sm text-muted-foreground">
                            {merge.secondaryCustomer.code}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {merge.mergedByName ?? merge.performedBy}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewMerge(merge)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <MergeDetailDialog
        merge={selectedMerge}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onViewCustomer={(id) => {
          setShowDetailDialog(false)
          onViewCustomer?.(id)
        }}
        onUndo={() => selectedMerge && handleUndo(selectedMerge.id)}
      />
    </div>
  )
}
