/**
 * BulkOperationsModal Component
 *
 * A generic, configurable bulk operations component for performing actions
 * on multiple selected items. Supports different entity types (customers, products, etc.)
 * with customizable operations.
 *
 * @example
 * ```tsx
 * <BulkOperationsModal
 *   entityType="customer"
 *   selectedIds={selectedIds}
 *   operations={[
 *     { type: 'status', config: { options: ['active', 'inactive'] } },
 *     { type: 'delete', config: { warningItems: ['contacts', 'orders'] } },
 *   ]}
 *   onComplete={() => refetch()}
 * />
 * ```
 */
import { useState, useCallback } from 'react';
import { Settings, Trash2, AlertTriangle, Check, RefreshCw, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface OperationResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface StatusOption {
  value: string;
  label: string;
}

export interface StatusOperationConfig {
  type: 'status';
  label?: string;
  icon?: React.ReactNode;
  options: StatusOption[];
  onExecute: (status: string, selectedIds: string[]) => Promise<OperationResult>;
}

export interface DeleteOperationConfig {
  type: 'delete';
  label?: string;
  warningTitle?: string;
  warningItems?: string[];
  requireConfirmation?: boolean;
  confirmationText?: string;
  onExecute: (selectedIds: string[]) => Promise<OperationResult>;
}

export interface CustomOperationConfig {
  type: 'custom';
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline' | 'destructive';
  renderDialog?: (props: {
    isOpen: boolean;
    onClose: () => void;
    selectedIds: string[];
    isProcessing: boolean;
    onExecute: () => Promise<void>;
  }) => React.ReactNode;
  onExecute: (selectedIds: string[]) => Promise<OperationResult>;
}

export interface ActionButtonConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedIds: string[]) => void | Promise<void>;
  variant?: 'default' | 'outline' | 'destructive';
}

export type OperationConfig = StatusOperationConfig | DeleteOperationConfig | CustomOperationConfig;

export interface BulkOperationsModalProps {
  /** The type of entity being operated on (for display purposes) */
  entityType: string;
  /** Plural form of entity type (defaults to entityType + 's') */
  entityTypePlural?: string;
  /** Array of selected item IDs */
  selectedIds: string[];
  /** Available operations */
  operations: OperationConfig[];
  /** Quick action buttons shown in the main bar */
  quickActions?: ActionButtonConfig[];
  /** Additional menu items in the dropdown */
  menuItems?: ActionButtonConfig[];
  /** Callback when an operation completes successfully */
  onComplete?: () => void;
  /** Callback to clear selection */
  onClearSelection?: () => void;
  /** Display variant */
  variant?: 'card' | 'bar';
  /** Additional class names */
  className?: string;
  /** Show progress indicator during operations */
  showProgress?: boolean;
}

// ============================================================================
// OPERATION PROGRESS
// ============================================================================

interface OperationProgressProps {
  isRunning: boolean;
  progress: number;
  result: OperationResult | null;
  operationType: string;
}

function OperationProgress({ isRunning, progress, result, operationType }: OperationProgressProps) {
  if (!isRunning && !result) return null;

  return (
    <div className="bg-muted space-y-3 rounded-lg p-4">
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
              <span className="text-green-600">{result.success} succeeded</span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-red-600">{result.failed} failed</span>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="text-muted-foreground text-sm">
              {result.errors.slice(0, 3).map((err, i) => (
                <p key={i}>{err.error}</p>
              ))}
              {result.errors.length > 3 && <p>...and {result.errors.length - 3} more errors</p>}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// STATUS UPDATE DIALOG
// ============================================================================

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: StatusOperationConfig;
  selectedCount: number;
  entityType: string;
  isProcessing: boolean;
  onExecute: (status: string) => Promise<void>;
}

function StatusUpdateDialog({
  open,
  onOpenChange,
  config,
  selectedCount,
  entityType,
  isProcessing,
  onExecute,
}: StatusUpdateDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    setError(null);
    try {
      await onExecute(selectedStatus);
      setSelectedStatus('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleClose = () => {
    setSelectedStatus('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.label || 'Update Status'}</DialogTitle>
          <DialogDescription>
            Change the status for {selectedCount} selected {entityType}
            {selectedCount !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {config.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedStatus || isProcessing}>
            {isProcessing ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// DELETE CONFIRMATION DIALOG
// ============================================================================

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DeleteOperationConfig;
  selectedCount: number;
  entityType: string;
  entityTypePlural: string;
  isProcessing: boolean;
  onExecute: () => Promise<void>;
}

function DeleteConfirmationDialog({
  open,
  onOpenChange,
  config,
  selectedCount,
  entityType,
  entityTypePlural,
  isProcessing,
  onExecute,
}: DeleteConfirmationDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (config.requireConfirmation !== false && !confirmed) return;
    setError(null);
    try {
      await onExecute();
      setConfirmed(false);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    setError(null);
    onOpenChange(false);
  };

  const displayName = selectedCount === 1 ? entityType : entityTypePlural;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete {selectedCount} {displayName}
          </DialogTitle>
          <DialogDescription>
            {config.warningTitle ||
              `Are you sure you want to delete ${selectedCount} ${displayName}? This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {config.warningItems && config.warningItems.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                <p>This will also delete:</p>
                <ul className="mt-2 ml-4 list-disc">
                  {config.warningItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {config.requireConfirmation !== false && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="confirm-delete"
                checked={confirmed}
                onCheckedChange={(c) => setConfirmed(c === true)}
              />
              <Label htmlFor="confirm-delete" className="text-sm">
                {config.confirmationText ||
                  'I understand that this action is permanent and cannot be reversed'}
              </Label>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={(config.requireConfirmation !== false && !confirmed) || isProcessing}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedCount} {displayName}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BulkOperationsModal({
  entityType,
  entityTypePlural,
  selectedIds,
  operations,
  quickActions = [],
  menuItems = [],
  onComplete,
  onClearSelection,
  variant = 'bar',
  className,
  showProgress = true,
}: BulkOperationsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OperationResult | null>(null);
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const selectedCount = selectedIds.length;
  const plural = entityTypePlural || `${entityType}s`;

  // Simulate progress for operations
  const executeWithProgress = useCallback(
    async (operation: () => Promise<OperationResult>, operationName: string) => {
      setIsProcessing(true);
      setProgress(0);
      setResult(null);
      setCurrentOperation(operationName);

      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 20, 90));
      }, 200);

      try {
        const opResult = await operation();
        clearInterval(interval);
        setProgress(100);
        setResult(opResult);
        onComplete?.();
        onClearSelection?.();
        return opResult;
      } catch (error) {
        clearInterval(interval);
        const errorResult: OperationResult = {
          success: 0,
          failed: selectedCount,
          errors: [{ id: '', error: String(error) }],
        };
        setResult(errorResult);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedCount, onComplete, onClearSelection]
  );

  // Get operation configs by type
  const statusOp = operations.find((op): op is StatusOperationConfig => op.type === 'status');
  const deleteOp = operations.find((op): op is DeleteOperationConfig => op.type === 'delete');
  const customOps = operations.filter((op): op is CustomOperationConfig => op.type === 'custom');

  if (selectedCount === 0) {
    if (variant === 'card') {
      return (
        <Card className={className}>
          <CardContent className="py-8 pt-6 text-center">
            <Settings className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <h3 className="text-lg font-medium">Bulk Operations</h3>
            <p className="text-muted-foreground">Select {plural} to enable bulk actions</p>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  // Bar variant (default)
  if (variant === 'bar') {
    return (
      <>
        <div className={cn('bg-muted flex items-center gap-3 rounded-lg p-3', className)}>
          <Badge variant="secondary" className="text-sm">
            {selectedCount} selected
          </Badge>

          <div className="flex items-center gap-2">
            {/* Status operation button */}
            {statusOp && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDialog('status')}
                disabled={isProcessing}
              >
                {statusOp.icon}
                {statusOp.label || 'Update Status'}
              </Button>
            )}

            {/* Quick actions */}
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={() => action.onClick(selectedIds)}
                disabled={isProcessing}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}

            {/* Custom operations as buttons */}
            {customOps.map((op) => (
              <Button
                key={op.id}
                variant={op.variant || 'outline'}
                size="sm"
                onClick={() => setActiveDialog(op.id)}
                disabled={isProcessing}
              >
                {op.icon}
                {op.label}
              </Button>
            ))}

            {/* Menu for delete and additional items */}
            {(deleteOp || menuItems.length > 0) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuItems.map((item) => (
                    <DropdownMenuItem key={item.id} onClick={() => item.onClick(selectedIds)}>
                      {item.icon}
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                  {menuItems.length > 0 && deleteOp && <DropdownMenuSeparator />}
                  {deleteOp && (
                    <DropdownMenuItem onClick={() => setActiveDialog('delete')}>
                      <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                      <span className="text-red-600">{deleteOp.label || 'Delete Selected'}</span>
                    </DropdownMenuItem>
                  )}
                  {(menuItems.length > 0 || deleteOp) && onClearSelection && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onClearSelection}>
                        Clear Selection
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        {showProgress && (isProcessing || result) && (
          <OperationProgress
            isRunning={isProcessing}
            progress={progress}
            result={result}
            operationType={currentOperation}
          />
        )}

        {/* Dialogs */}
        {statusOp && (
          <StatusUpdateDialog
            open={activeDialog === 'status'}
            onOpenChange={(open) => !open && setActiveDialog(null)}
            config={statusOp}
            selectedCount={selectedCount}
            entityType={entityType}
            isProcessing={isProcessing}
            onExecute={async (status) => {
              await executeWithProgress(
                () => statusOp.onExecute(status, selectedIds),
                'status update'
              );
            }}
          />
        )}

        {deleteOp && (
          <DeleteConfirmationDialog
            open={activeDialog === 'delete'}
            onOpenChange={(open) => !open && setActiveDialog(null)}
            config={deleteOp}
            selectedCount={selectedCount}
            entityType={entityType}
            entityTypePlural={plural}
            isProcessing={isProcessing}
            onExecute={async () => {
              await executeWithProgress(() => deleteOp.onExecute(selectedIds), 'deletion');
            }}
          />
        )}

        {/* Custom operation dialogs */}
        {customOps.map((op) =>
          op.renderDialog?.({
            isOpen: activeDialog === op.id,
            onClose: () => setActiveDialog(null),
            selectedIds,
            isProcessing,
            onExecute: async () => {
              await executeWithProgress(() => op.onExecute(selectedIds), op.label.toLowerCase());
            },
          })
        )}
      </>
    );
  }

  // Card variant
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Bulk Operations
        </CardTitle>
        <CardDescription>
          {selectedCount} {selectedCount === 1 ? entityType : plural} selected
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        {showProgress && (
          <OperationProgress
            isRunning={isProcessing}
            progress={progress}
            result={result}
            operationType={currentOperation}
          />
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                onClick={() => action.onClick(selectedIds)}
                disabled={isProcessing}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Operation buttons */}
        <div className="space-y-2">
          {statusOp && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setActiveDialog('status')}
              disabled={isProcessing}
            >
              {statusOp.icon}
              {statusOp.label || 'Update Status'}
            </Button>
          )}

          {customOps.map((op) => (
            <Button
              key={op.id}
              variant={op.variant || 'outline'}
              className="w-full justify-start"
              onClick={() => setActiveDialog(op.id)}
              disabled={isProcessing}
            >
              {op.icon}
              {op.label}
            </Button>
          ))}

          {deleteOp && (
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => setActiveDialog('delete')}
              disabled={isProcessing}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteOp.label ||
                `Delete ${selectedCount} ${selectedCount === 1 ? entityType : plural}`}
            </Button>
          )}
        </div>

        {/* Dialogs */}
        {statusOp && (
          <StatusUpdateDialog
            open={activeDialog === 'status'}
            onOpenChange={(open) => !open && setActiveDialog(null)}
            config={statusOp}
            selectedCount={selectedCount}
            entityType={entityType}
            isProcessing={isProcessing}
            onExecute={async (status) => {
              await executeWithProgress(
                () => statusOp.onExecute(status, selectedIds),
                'status update'
              );
            }}
          />
        )}

        {deleteOp && (
          <DeleteConfirmationDialog
            open={activeDialog === 'delete'}
            onOpenChange={(open) => !open && setActiveDialog(null)}
            config={deleteOp}
            selectedCount={selectedCount}
            entityType={entityType}
            entityTypePlural={plural}
            isProcessing={isProcessing}
            onExecute={async () => {
              await executeWithProgress(() => deleteOp.onExecute(selectedIds), 'deletion');
            }}
          />
        )}

        {/* Custom operation dialogs */}
        {customOps.map((op) =>
          op.renderDialog?.({
            isOpen: activeDialog === op.id,
            onClose: () => setActiveDialog(null),
            selectedIds,
            isProcessing,
            onExecute: async () => {
              await executeWithProgress(() => op.onExecute(selectedIds), op.label.toLowerCase());
            },
          })
        )}
      </CardContent>
    </Card>
  );
}
