/**
 * ApprovalDecisionDialog Component
 *
 * Dialog for reviewing and approving/rejecting/escalating purchase orders and amendments.
 * Following the amendment review dialog pattern.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-APPROVAL-WORKFLOW)
 */
import { memo, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  FileText,
  Calendar,
  Building2,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
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
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { ApprovalItem } from './approval-dashboard';

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ApprovalItem | null;
  onDecision: (decision: 'approve' | 'reject' | 'escalate', comments: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ApprovalDecisionDialog = memo(function ApprovalDecisionDialog({
  open,
  onOpenChange,
  item,
  onDecision,
}: ApprovalDecisionDialogProps) {
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

  // Handle decision
  const handleDecision = async (decision: 'approve' | 'reject' | 'escalate') => {
    if (!item) return;

    setIsSubmitting(true);
    try {
      await onDecision(decision, comments);
      handleOpenChange(false);
    } catch (error) {
      console.error('Decision error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Render priority badge
  const renderPriorityBadge = () => {
    if (!item) return null;
    const config = PRIORITY_CONFIG[item.priority];
    return (
      <Badge variant="secondary" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review {item.type === 'purchase_order' ? 'Purchase Order' : 'Amendment'}
          </DialogTitle>
          <DialogDescription>Review the details and make your approval decision</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <span className="text-muted-foreground text-sm font-medium">
                    {item.type === 'purchase_order' ? 'PO Number' : 'Reference'}
                  </span>
                  <p className="font-mono font-medium">
                    {item.poNumber || item.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm font-medium">Amount</span>
                  <p className="text-lg font-medium">
                    {formatCurrency(item.amount, item.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm font-medium">Priority</span>
                  <div className="mt-1">{renderPriorityBadge()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm font-medium">Due Date</span>
                  <p className="font-medium">
                    {item.dueDate ? format(new Date(item.dueDate), 'MMM dd, yyyy') : 'No deadline'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requester Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-4 w-4" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {item.requester
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{item.requester}</p>
                    <p className="text-muted-foreground text-sm">Requester</p>
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    Submitted {format(new Date(item.submittedAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                  {item.supplierName && (
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4" />
                      Supplier: {item.supplierName}
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <h4 className="mb-2 font-medium">{item.title}</h4>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Item Details - Mock data for now */}
          {item.type === 'purchase_order' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-4 w-4" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Mock items - will be replaced with real data */}
                    <TableRow>
                      <TableCell>
                        <div>
                          <p className="font-medium">Office Chair</p>
                          <p className="text-muted-foreground text-sm">SKU: CHR-001</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">5</TableCell>
                      <TableCell className="text-right">$250.00</TableCell>
                      <TableCell className="text-right">$1,250.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div>
                          <p className="font-medium">Standing Desk</p>
                          <p className="text-muted-foreground text-sm">SKU: DSK-002</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">3</TableCell>
                      <TableCell className="text-right">$450.00</TableCell>
                      <TableCell className="text-right">$1,350.00</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Decision Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="comments">
                  Comments (Optional)
                  <span className="text-muted-foreground ml-1 text-sm">
                    Add notes about your decision
                  </span>
                </Label>
                <Textarea
                  id="comments"
                  placeholder="Explain your decision or add any conditions..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleDecision('escalate')}
              disabled={isSubmitting}
              className="text-orange-600 hover:text-orange-700"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Escalate
            </Button>

            <Button
              variant="outline"
              onClick={() => handleDecision('reject')}
              disabled={isSubmitting}
              className="text-red-600 hover:text-red-700"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>

            <Button
              onClick={() => handleDecision('approve')}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
