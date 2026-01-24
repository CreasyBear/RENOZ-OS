/**
 * BulkApprovalDialog Component
 *
 * Dialog for bulk approving or rejecting multiple purchase orders/amendments.
 * Following the bulk operations pattern from orders domain.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-APPROVAL-WORKFLOW)
 */
import { memo, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Users, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// TYPES
// ============================================================================

interface BulkApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: string[];
  onBulkDecision: (decision: 'approve' | 'reject', comments: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BulkApprovalDialog = memo(function BulkApprovalDialog({
  open,
  onOpenChange,
  selectedItems,
  onBulkDecision,
}: BulkApprovalDialogProps) {
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setComments('');
      setIsSubmitting(false);
    }
    onOpenChange(newOpen);
  };

  // Handle bulk decision
  const handleBulkDecision = async (decision: 'approve' | 'reject') => {
    setIsSubmitting(true);
    try {
      await onBulkDecision(decision, comments);
      handleOpenChange(false);
    } catch (error) {
      console.error('Bulk decision error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Approval Decision
          </DialogTitle>
          <DialogDescription>
            Apply the same decision to {selectedItems.length} selected item
            {selectedItems.length === 1 ? '' : 's'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-4 w-4" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Items selected:</span>
                  <Badge variant="secondary">{selectedItems.length}</Badge>
                </div>
                <div className="text-muted-foreground text-sm">
                  This action will apply to all selected purchase orders and amendments. Individual
                  item decisions cannot be undone.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Decision Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="bulk-comments">
                  Comments (Optional)
                  <span className="text-muted-foreground ml-1 text-sm">
                    Will be applied to all selected items
                  </span>
                </Label>
                <Textarea
                  id="bulk-comments"
                  placeholder="Explain your bulk decision..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. All selected items will be{' '}
              {selectedItems.length === 1 ? 'processed' : 'processed'} immediately.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleBulkDecision('reject')}
              disabled={isSubmitting}
              className="text-red-600 hover:text-red-700"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject All
            </Button>

            <Button
              onClick={() => handleBulkDecision('approve')}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve All
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
