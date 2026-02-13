/**
 * Rollback UI Component
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 *
 * Displays recent bulk operations with rollback capability.
 */

import { useState } from 'react';
import { Undo2, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface BulkOperation {
  id: string;
  action: string;
  entityType: string;
  timestamp: Date | string;
  affectedCount: number;
  operationType: string;
  canRollback: boolean;
}

export interface RollbackUIProps {
  /** @source useRecentBulkOperations hook in container */
  operations: BulkOperation[];
  /** @source useRecentBulkOperations hook in container */
  isLoading?: boolean;
  /** Handler to rollback an operation */
  onRollback: (auditLogId: string) => Promise<void>;
  /** Handler to refresh operations list */
  onRefresh?: () => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatOperationName(action: string): string {
  if (action.includes('health_scores')) return 'Health Score Update';
  if (action.includes('status')) return 'Status Update';
  if (action.includes('tags')) return 'Tag Assignment';
  if (action.includes('delete')) return 'Delete';
  return 'Bulk Operation';
}

function formatTimeAgo(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }
  return 'Just now';
}

function canRollback(timestamp: Date | string): boolean {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  return diffMs <= maxAge;
}

// ============================================================================
// ROLLBACK CONFIRMATION DIALOG
// ============================================================================

interface RollbackConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: BulkOperation | null;
  onConfirm: () => Promise<void>;
  isRollingBack: boolean;
}

function RollbackConfirmationDialog({
  open,
  onOpenChange,
  operation,
  onConfirm,
  isRollingBack,
}: RollbackConfirmationDialogProps) {
  if (!operation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rollback Bulk Operation?</DialogTitle>
          <DialogDescription>
            This will restore the previous state for {operation.affectedCount} customer
            {operation.affectedCount !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. The operation will be rolled back to its previous
              state.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Operation:</span>
              <span className="font-medium">{formatOperationName(operation.action)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Affected:</span>
              <span className="font-medium">{operation.affectedCount} customers</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">{formatTimeAgo(operation.timestamp)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRollingBack}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isRollingBack} variant="default">
            {isRollingBack ? 'Rolling back…' : 'Rollback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RollbackUI({
  operations,
  isLoading = false,
  onRollback,
  onRefresh,
  className,
}: RollbackUIProps) {
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const handleRollbackClick = (operation: BulkOperation) => {
    if (!operation.canRollback || !canRollback(operation.timestamp)) {
      return;
    }
    setSelectedOperation(operation);
    setRollbackDialogOpen(true);
  };

  const handleConfirmRollback = async () => {
    if (!selectedOperation) return;

    setIsRollingBack(true);
    try {
      await onRollback(selectedOperation.id);
      setRollbackDialogOpen(false);
      setSelectedOperation(null);
      onRefresh?.();
    } catch {
      // Error handled by mutation
    } finally {
      setIsRollingBack(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">Recent Bulk Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (operations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">Recent Bulk Operations</CardTitle>
          <CardDescription>No recent bulk operations</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Recent Bulk Operations</CardTitle>
              <CardDescription>Rollback recent bulk changes (24 hour limit)</CardDescription>
            </div>
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {operations.map((operation) => {
            const canRollbackOp = operation.canRollback && canRollback(operation.timestamp);

            return (
              <div
                key={operation.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  !canRollbackOp && 'opacity-60'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {formatOperationName(operation.action)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {operation.affectedCount} customers
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(operation.timestamp)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRollbackClick(operation)}
                  disabled={!canRollbackOp}
                  className="ml-2"
                >
                  <Undo2 className="h-4 w-4 mr-1" />
                  Rollback
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <RollbackConfirmationDialog
        open={rollbackDialogOpen}
        onOpenChange={setRollbackDialogOpen}
        operation={selectedOperation}
        onConfirm={handleConfirmRollback}
        isRollingBack={isRollingBack}
      />
    </>
  );
}
