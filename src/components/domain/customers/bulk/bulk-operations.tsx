/**
 * BulkOperations Component
 *
 * ARCHITECTURE: Presenter Component - receives all data and handlers via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 *
 * Panel for executing bulk actions on selected customers:
 * - Status updates
 * - Tag assignment/removal
 * - Field updates
 * - Delete with confirmation
 */
import { useState, useMemo } from 'react'
import {
  Settings,
  Tag,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Check,
  Edit,
  Mail,
  Download,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { capitalizeFirst } from '@/lib/customer-utils'

// ============================================================================
// TYPES
// ============================================================================

export interface OperationResult {
  success: number
  failed: number
  errors: Array<{ customerId: string; error: string }>
  auditLogId?: string // For rollback capability
}

interface BulkOperationsProps {
  /** @source selectedCount from useTableSelection hook in container */
  selectedCount: number
  /** @source selectedIds from useTableSelection hook in container */
  selectedIds: string[]
  /** @source selectedCustomers from useTableSelection hook in container (for current state summary) */
  selectedCustomers?: Array<{ id: string; status: string; tags?: Array<{ id: string }> }>
  /** @source availableTags from useCustomerTags hook in container */
  availableTags: Array<{ id: string; name: string; color: string }>
  /** @source useCallback handler wrapping bulkUpdateCustomers mutation in container */
  onUpdateStatus: (status: string) => Promise<OperationResult>
  /** @source useCallback handler wrapping bulkAssignTags mutation in container */
  onAssignTags: (tagIds: string[], mode: 'add' | 'remove' | 'replace') => Promise<OperationResult>
  /** @source useCallback handler wrapping bulkUpdateHealthScores mutation in container */
  onUpdateHealthScore?: (healthScore: number, reason?: string) => Promise<OperationResult>
  /** @source useCallback handler wrapping bulkDeleteCustomers mutation in container */
  onDelete: () => Promise<OperationResult>
  /** @source useCallback handler for export action in container */
  onExport: () => void
  /** @source useCallback handler for bulk email action in container */
  onBulkEmail: () => void
  /** @source Combined isLoading state from all bulk operation mutations in container */
  isLoading?: boolean
  /** @source Progress percentage from mutation state in container (0-100) - optional, only if real progress available */
  progress?: number
  /** @source Operation result from last completed mutation in container */
  result?: OperationResult | null
  /** @source Current operation type being executed in container */
  currentOperation?: string
  /** When "embedded" (e.g. in drawer), hide the card header to avoid duplication */
  variant?: 'default' | 'embedded'
  className?: string
}

// ============================================================================
// OPERATION PROGRESS
// ============================================================================

interface OperationProgressProps {
  isRunning: boolean
  progress?: number // Optional - only show if we have real progress
  result: OperationResult | null
  operationType: string
}

function OperationProgress({ isRunning, progress, result, operationType }: OperationProgressProps) {
  if (!isRunning && !result) return null

  return (
    <div className="space-y-3 p-4 rounded-lg bg-muted">
      {isRunning ? (
        <>
          <div className="flex items-center justify-between text-sm">
            <span>Processing {operationType}…</span>
            {progress !== undefined && <span>{progress}%</span>}
          </div>
          {progress !== undefined ? (
            <Progress value={progress} />
          ) : (
            <div className="h-2 w-full bg-muted-foreground/20 rounded-full overflow-hidden">
              <div className="h-full w-full bg-primary/20 animate-pulse" />
            </div>
          )}
        </>
      ) : result ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <span className="font-medium">Operation Complete</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓ {result.success} succeeded</span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-red-600">✗ {result.failed} failed</span>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {result.errors.slice(0, 3).map((err, i) => (
                <p key={i}>• {err.error}</p>
              ))}
              {result.errors.length > 3 && (
                <p>…and {result.errors.length - 3} more errors</p>
              )}
            </div>
          )}
          {result.auditLogId && (
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Operation logged for rollback (24 hour limit)
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ============================================================================
// STATUS UPDATE SECTION
// ============================================================================

interface StatusUpdateProps {
  /** @source selectedCustomers from container (for current state summary) */
  selectedCustomers?: Array<{ id: string; status: string }>
  /** @source useCallback handler in BulkOperations component */
  onUpdate: (status: string) => void
  /** @source isDisabled prop from BulkOperations component */
  isDisabled: boolean
}

function StatusUpdateSection({ selectedCustomers = [], onUpdate, isDisabled }: StatusUpdateProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Calculate current state summary
  const currentStatusSummary = useMemo(() => {
    if (selectedCustomers.length === 0) return null;
    const statusCounts = selectedCustomers.reduce((acc, customer) => {
      acc[customer.status] = (acc[customer.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(statusCounts);
  }, [selectedCustomers]);

  return (
    <div className="space-y-3">
      {/* Current state summary */}
      {currentStatusSummary && currentStatusSummary.length > 0 && (
        <div className="text-sm space-y-1">
          <Label className="text-muted-foreground">Current statuses:</Label>
          <div className="flex flex-wrap gap-1">
            {currentStatusSummary.map(([status, count]) => (
              <Badge key={status} variant="outline" className="text-xs">
                {status}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      <Label>New Status</Label>
      <div className="flex gap-2">
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => onUpdate(selectedStatus)}
          disabled={!selectedStatus || isDisabled}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// HEALTH SCORE UPDATE SECTION
// ============================================================================

interface HealthScoreUpdateProps {
  /** @source useCallback handler in BulkOperations component */
  onUpdate: (healthScore: number, reason?: string) => void
  /** @source isDisabled prop from BulkOperations component */
  isDisabled: boolean
}

function HealthScoreUpdateSection({ onUpdate, isDisabled }: HealthScoreUpdateProps) {
  const [healthScore, setHealthScore] = useState<string>('')
  const [reason, setReason] = useState<string>('')

  const handleUpdate = () => {
    const score = parseInt(healthScore, 10)
    if (!isNaN(score) && score >= 0 && score <= 100) {
      onUpdate(score, reason.trim() || undefined)
      setHealthScore('')
      setReason('')
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="health-score">Health Score (0-100)</Label>
        <div className="flex gap-2">
          <Input
            id="health-score"
            type="number"
            min="0"
            max="100"
            value={healthScore}
            onChange={(e) => setHealthScore(e.target.value)}
            placeholder="Enter score…"
            inputMode="numeric"
            autoComplete="off"
          />
          <Button
            onClick={handleUpdate}
            disabled={!healthScore || isDisabled || parseInt(healthScore, 10) < 0 || parseInt(healthScore, 10) > 100}
          >
            Apply
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="health-reason">Reason (Optional)</Label>
        <Textarea
          id="health-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Add a reason for this update…"
          rows={2}
        />
      </div>
    </div>
  )
}

// ============================================================================
// TAG MANAGEMENT SECTION
// ============================================================================

interface TagManagementProps {
  /** @source selectedCustomers from container (for current state summary) */
  selectedCustomers?: Array<{ id: string; tags?: Array<{ id: string }> }>
  /** @source availableTags from useCustomerTags hook in container */
  availableTags: Array<{ id: string; name: string; color: string }>
  /** @source useCallback handler in BulkOperations component */
  onApply: (tagIds: string[], mode: 'add' | 'remove' | 'replace') => void
  /** @source isDisabled prop from BulkOperations component */
  isDisabled: boolean
}

function TagManagementSection({ selectedCustomers = [], availableTags, onApply, isDisabled }: TagManagementProps) {
  // Calculate current tags summary
  const currentTagsSummary = useMemo(() => {
    if (selectedCustomers.length === 0) return null;
    const tagCounts = new Map<string, number>();
    selectedCustomers.forEach((customer) => {
      customer.tags?.forEach((tag) => {
        tagCounts.set(tag.id, (tagCounts.get(tag.id) || 0) + 1);
      });
    });
    return Array.from(tagCounts.entries()).map(([tagId, count]) => {
      const tag = availableTags.find((t) => t.id === tagId);
      return { tagId, tagName: tag?.name || 'Unknown', count };
    });
  }, [selectedCustomers, availableTags]);
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [mode, setMode] = useState<'add' | 'remove' | 'replace'>('add')

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  return (
    <div className="space-y-3">
      {/* Current tags summary */}
      {currentTagsSummary && currentTagsSummary.length > 0 && (
        <div className="text-sm space-y-1">
          <Label className="text-muted-foreground">Current tags:</Label>
          <div className="flex flex-wrap gap-1">
            {currentTagsSummary.map(({ tagId, tagName, count }) => (
              <Badge key={tagId} variant="outline" className="text-xs">
                {tagName}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-4">
        <Label>Mode:</Label>
        <div className="flex gap-2">
          {(['add', 'remove', 'replace'] as const).map((m) => (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode(m)}
            >
              {capitalizeFirst(m)}
            </Button>
          ))}
        </div>
      </div>

      <Label>Tags</Label>
      <div className="flex flex-wrap gap-2 p-3 rounded-lg border min-h-[80px]">
        {availableTags.map((tag) => (
          <Badge
            key={tag.id}
            variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-colors',
              selectedTags.includes(tag.id) && 'bg-primary'
            )}
            style={{
              borderColor: tag.color,
              color: selectedTags.includes(tag.id) ? undefined : tag.color,
            }}
            onClick={() => toggleTag(tag.id)}
          >
            {tag.name}
          </Badge>
        ))}
        {availableTags.length === 0 && (
          <span className="text-sm text-muted-foreground">No tags available</span>
        )}
      </div>

      <Button
        onClick={() => onApply(selectedTags, mode)}
        disabled={selectedTags.length === 0 || isDisabled}
        className="w-full"
      >
        {mode === 'add' && 'Add Tags'}
        {mode === 'remove' && 'Remove Tags'}
        {mode === 'replace' && 'Replace Tags'}
      </Button>
    </div>
  )
}

// ============================================================================
// DELETE CONFIRMATION
// ============================================================================

interface DeleteConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  onConfirm: () => void
  isLoading: boolean
}

function DeleteConfirmation({
  open,
  onOpenChange,
  count,
  onConfirm,
  isLoading,
}: DeleteConfirmationProps) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete {count} Customer{count !== 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. All selected customers and their related
            data will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            This will delete all contacts, addresses, activities, and order history
            associated with these customers.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-2 py-4">
          <Checkbox
            id="confirm-delete"
            checked={confirmed}
            onCheckedChange={(c) => setConfirmed(c === true)}
          />
          <Label htmlFor="confirm-delete" className="text-sm">
            I understand that this action is permanent and cannot be reversed
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!confirmed || isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {count} Customer{count !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BulkOperations({
  selectedCount,
  selectedIds: _selectedIds,
  selectedCustomers = [],
  availableTags,
  onUpdateStatus,
  onAssignTags,
  onUpdateHealthScore,
  onDelete,
  onExport,
  onBulkEmail,
  isLoading = false,
  progress,
  result = null,
  currentOperation = '',
  variant = 'default',
  className,
}: BulkOperationsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const isDisabled = selectedCount === 0 || isLoading

  // Handle status update
  const handleStatusUpdate = async (status: string) => {
    await onUpdateStatus(status)
  }

  // Handle tag assignment
  const handleTagAssignment = async (tagIds: string[], mode: 'add' | 'remove' | 'replace') => {
    await onAssignTags(tagIds, mode)
  }

  // Handle health score update
  const handleHealthScoreUpdate = async (healthScore: number, reason?: string) => {
    if (!onUpdateHealthScore) return
    await onUpdateHealthScore(healthScore, reason)
  }

  // Handle delete
  const handleDelete = async () => {
    await onDelete()
    setShowDeleteDialog(false)
  }

  // Hide entirely when fewer than 2 selected
  if (selectedCount < 2) return null

  return (
    <Card className={className}>
      {variant === 'default' && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Bulk Operations
          </CardTitle>
          <CardDescription>
            {selectedCount} customer{selectedCount !== 1 ? 's' : ''} selected
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={cn(variant === 'embedded' && 'pt-0')}>
        <div className="space-y-4">
        {/* Progress */}
        <OperationProgress
          isRunning={isLoading}
          progress={progress}
          result={result || null}
          operationType={currentOperation}
        />

        {/* Quick Actions - compact inline buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onExport} disabled={isDisabled}>
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={onBulkEmail} disabled={isDisabled}>
            <Mail className="h-4 w-4 mr-1.5" />
            Send Email
          </Button>
        </div>

        {/* Accordion for detailed operations - compact triggers */}
        <Accordion type="single" collapsible className="w-full">
          {/* Status Update */}
          <AccordionItem value="status" className="rounded-lg">
            <AccordionTrigger className="hover:no-underline py-2">
              <div className="flex items-center gap-2 text-sm">
                <Edit className="h-4 w-4 shrink-0" />
                Update Status
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <StatusUpdateSection
                selectedCustomers={selectedCustomers}
                onUpdate={handleStatusUpdate}
                isDisabled={isDisabled}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Tag Management */}
          <AccordionItem value="tags" className="rounded-lg">
            <AccordionTrigger className="hover:no-underline py-2">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 shrink-0" />
                Manage Tags
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <TagManagementSection
                selectedCustomers={selectedCustomers}
                availableTags={availableTags}
                onApply={handleTagAssignment}
                isDisabled={isDisabled}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Health Score Update */}
          {onUpdateHealthScore && (
            <AccordionItem value="health-score" className="rounded-lg">
              <AccordionTrigger className="hover:no-underline py-2">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 shrink-0" />
                  Update Health Scores
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <HealthScoreUpdateSection
                  onUpdate={handleHealthScoreUpdate}
                  isDisabled={isDisabled}
                />
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Delete */}
          <AccordionItem value="delete" className="rounded-lg">
            <AccordionTrigger className="hover:no-underline text-red-600 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Trash2 className="h-4 w-4 shrink-0" />
                Delete Customers
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Deleting customers is permanent and cannot be undone.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDisabled}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete {selectedCount} Customer{selectedCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmation
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          count={selectedCount}
          onConfirm={handleDelete}
          isLoading={isLoading}
        />
        </div>
      </CardContent>
    </Card>
  )
}
