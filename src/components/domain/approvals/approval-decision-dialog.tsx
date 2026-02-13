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
import { useOrgFormat } from '@/hooks/use-org-format';
import { toastError } from '@/hooks';
import { logger } from '@/lib/logger';
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
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusCell } from '@/components/shared/data-table';
import { APPROVAL_PRIORITY_CONFIG } from './approval-status-config';
import type { ApprovalItem } from '@/lib/schemas/approvals';

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ApprovalItem | null;
  onDecision: (
    decision: 'approve' | 'reject' | 'escalate',
    data: { comments: string; escalateTo?: string }
  ) => void;
  escalationUsers: Array<{ id: string; name: string | null; email: string | null }>;
  /** @source useApprovalDetails in /approvals/index.tsx */
  approvalDetails?: {
    items?: Array<{
      id: string;
      productName: string;
      productSku?: string | null;
      quantity: number;
      unitPrice?: number | null;
      lineTotal?: number | null;
    }>;
  };
  /** @source useApprovalDetails loading state in /approvals/index.tsx */
  isLoadingApprovalDetails?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ApprovalDecisionDialog = memo(function ApprovalDecisionDialog({
  open,
  onOpenChange,
  item,
  onDecision,
  escalationUsers,
  approvalDetails,
  isLoadingApprovalDetails = false,
}: ApprovalDecisionDialogProps) {
  const [comments, setComments] = useState('');
  const [escalateTo, setEscalateTo] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [escalationError, setEscalationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formatCurrency, formatDate } = useOrgFormat();

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setComments('');
      setIsSubmitting(false);
      setEscalateTo('');
      setEscalationReason('');
      setEscalationError(null);
    }
    onOpenChange(newOpen);
  };

  // Handle decision
  const handleDecision = async (decision: 'approve' | 'reject' | 'escalate') => {
    if (!item) return;

    if (decision === 'escalate') {
      if (!escalateTo || !escalationReason.trim()) {
        setEscalationError('Select a user and provide an escalation reason.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (decision === 'escalate') {
        await onDecision(decision, { comments: escalationReason, escalateTo });
      } else {
        await onDecision(decision, { comments });
      }
      handleOpenChange(false);
    } catch (error) {
      logger.error('Decision error', error);
      toastError(error instanceof Error ? error.message : 'Failed to submit decision');
    } finally {
      setIsSubmitting(false);
    }
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
                    {formatCurrency(item.amount, {
                      currency: item.currency,
                      cents: false,
                      showCents: true,
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm font-medium">Priority</span>
                  <div className="mt-1">
                    <StatusCell
                      status={item.priority as 'low' | 'medium' | 'high' | 'urgent'}
                      statusConfig={APPROVAL_PRIORITY_CONFIG}
                      showIcon
                    />
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm font-medium">Due Date</span>
                  <p className="font-medium">
                    {item.dueDate ? formatDate(item.dueDate, { format: 'short' }) : 'No deadline'}
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
                    Submitted {formatDate(item.submittedAt, { format: 'short', includeTime: true })}
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

          {/* Item Details */}
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
                    {isLoadingApprovalDetails && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground text-sm">
                          Loading items…
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoadingApprovalDetails && (approvalDetails?.items?.length ?? 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground text-sm">
                          No items available.
                        </TableCell>
                      </TableRow>
                    )}
                    {approvalDetails?.items?.map((lineItem) => (
                      <TableRow key={lineItem.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{lineItem.productName}</p>
                            {lineItem.productSku && (
                              <p className="text-muted-foreground text-sm">
                                SKU: {lineItem.productSku}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{lineItem.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(lineItem.unitPrice ?? 0), {
                            currency: item.currency,
                            cents: false,
                            showCents: true,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(lineItem.lineTotal ?? 0), {
                            currency: item.currency,
                            cents: false,
                            showCents: true,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
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

          {/* Escalation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Escalation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Escalate To</Label>
                <Select value={escalateTo} onValueChange={setEscalateTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {escalationUsers.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No users available
                      </SelectItem>
                    ) : (
                      escalationUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name ?? user.email ?? 'Unnamed user'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="escalation-reason">
                  Escalation Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="escalation-reason"
                  placeholder="Explain why this approval is being escalated..."
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  rows={3}
                />
              </div>
              {escalationError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{escalationError}</AlertDescription>
                </Alert>
              )}
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
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Escalate
            </Button>

            <Button
              variant="destructive"
              onClick={() => handleDecision('reject')}
              disabled={isSubmitting}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>

            <Button
              variant="default"
              onClick={() => handleDecision('approve')}
              disabled={isSubmitting}
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
