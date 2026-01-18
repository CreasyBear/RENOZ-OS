/**
 * BulkOperations Component
 *
 * Panel for executing bulk actions on selected customers:
 * - Status updates
 * - Tag assignment/removal
 * - Field updates
 * - Delete with confirmation
 */
import { useState } from 'react'
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
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
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

// ============================================================================
// TYPES
// ============================================================================

interface OperationResult {
  success: number
  failed: number
  errors: Array<{ customerId: string; error: string }>
}

interface BulkOperationsProps {
  selectedCount: number
  selectedIds: string[]
  availableTags: Array<{ id: string; name: string; color: string }>
  onUpdateStatus: (status: string) => Promise<OperationResult>
  onAssignTags: (tagIds: string[], mode: 'add' | 'remove' | 'replace') => Promise<OperationResult>
  onDelete: () => Promise<OperationResult>
  onExport: () => void
  onBulkEmail: () => void
  className?: string
}

// ============================================================================
// OPERATION PROGRESS
// ============================================================================

interface OperationProgressProps {
  isRunning: boolean
  progress: number
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
            <span>Processing {operationType}...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
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
                <p>...and {result.errors.length - 3} more errors</p>
              )}
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
  onUpdate: (status: string) => void
  isDisabled: boolean
}

function StatusUpdateSection({ onUpdate, isDisabled }: StatusUpdateProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  return (
    <div className="space-y-3">
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
// TAG MANAGEMENT SECTION
// ============================================================================

interface TagManagementProps {
  availableTags: Array<{ id: string; name: string; color: string }>
  onApply: (tagIds: string[], mode: 'add' | 'remove' | 'replace') => void
  isDisabled: boolean
}

function TagManagementSection({ availableTags, onApply, isDisabled }: TagManagementProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [mode, setMode] = useState<'add' | 'remove' | 'replace'>('add')

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  return (
    <div className="space-y-3">
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
              {m.charAt(0).toUpperCase() + m.slice(1)}
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
                Deleting...
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
  availableTags,
  onUpdateStatus,
  onAssignTags,
  onDelete,
  onExport,
  onBulkEmail,
  className,
}: BulkOperationsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<OperationResult | null>(null)
  const [currentOperation, setCurrentOperation] = useState<string>('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const isDisabled = selectedCount === 0 || isProcessing

  // Simulate progress for operations
  const simulateProgress = async (operation: () => Promise<OperationResult>) => {
    setIsProcessing(true)
    setProgress(0)
    setResult(null)

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 20, 90))
    }, 200)

    try {
      const result = await operation()
      clearInterval(interval)
      setProgress(100)
      setResult(result)
    } catch (error) {
      clearInterval(interval)
      setResult({
        success: 0,
        failed: selectedCount,
        errors: [{ customerId: '', error: String(error) }],
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle status update
  const handleStatusUpdate = async (status: string) => {
    setCurrentOperation('status update')
    await simulateProgress(() => onUpdateStatus(status))
  }

  // Handle tag assignment
  const handleTagAssignment = async (tagIds: string[], mode: 'add' | 'remove' | 'replace') => {
    setCurrentOperation('tag assignment')
    await simulateProgress(() => onAssignTags(tagIds, mode))
  }

  // Handle delete
  const handleDelete = async () => {
    setCurrentOperation('deletion')
    await simulateProgress(async () => {
      const result = await onDelete()
      setShowDeleteDialog(false)
      return result
    })
  }

  if (selectedCount === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 text-center py-8">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Bulk Operations</h3>
          <p className="text-muted-foreground">
            Select customers to enable bulk actions
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Bulk Operations
        </CardTitle>
        <CardDescription>
          {selectedCount} customer{selectedCount !== 1 ? 's' : ''} selected
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <OperationProgress
          isRunning={isProcessing}
          progress={progress}
          result={result}
          operationType={currentOperation}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onExport} disabled={isDisabled}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={onBulkEmail} disabled={isDisabled}>
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </div>

        {/* Accordion for detailed operations */}
        <Accordion type="single" collapsible className="w-full">
          {/* Status Update */}
          <AccordionItem value="status">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Update Status
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <StatusUpdateSection
                onUpdate={handleStatusUpdate}
                isDisabled={isDisabled}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Tag Management */}
          <AccordionItem value="tags">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Manage Tags
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <TagManagementSection
                availableTags={availableTags}
                onApply={handleTagAssignment}
                isDisabled={isDisabled}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Delete */}
          <AccordionItem value="delete">
            <AccordionTrigger className="hover:no-underline text-red-600">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
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
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isDisabled}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
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
          isLoading={isProcessing}
        />
      </CardContent>
    </Card>
  )
}
