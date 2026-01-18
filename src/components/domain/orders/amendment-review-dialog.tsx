/**
 * AmendmentReviewDialog Component
 *
 * Dialog for reviewing and approving/rejecting order amendments.
 *
 * @see _Initiation/_prd/2-domains/orders/orders.prd.json (ORD-AMENDMENTS-UI)
 */

import { memo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Check,
  X,
  AlertCircle,
  Loader2,
  ArrowRight,
  FileText,
  User,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { toastSuccess, toastError } from "@/hooks/use-toast";
import {
  getAmendment,
  approveAmendment,
  rejectAmendment,
} from "@/lib/server/functions/order-amendments";
import type { AmendmentChanges, ItemChange, FinancialImpact, AmendmentStatus } from "@/lib/schemas/order-amendments";

// ============================================================================
// TYPES
// ============================================================================

export interface AmendmentReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amendmentId: string;
  onSuccess?: () => void;
}

interface AmendmentDetail {
  id: string;
  organizationId: string;
  orderId: string;
  amendmentType: string;
  reason: string;
  changes: AmendmentChanges | null;
  status: AmendmentStatus;
  requestedAt: Date;
  requestedBy: string;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  approvalNotes: { note?: string; conditions?: string[]; internalOnly?: boolean } | null;
  appliedAt: Date | null;
  appliedBy: string | null;
  orderVersionBefore: number | null;
  orderVersionAfter: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  requester: { name: string | null; email: string } | null;
  reviewer: { name: string | null; email: string } | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AmendmentReviewDialog = memo(function AmendmentReviewDialog({
  open,
  onOpenChange,
  amendmentId,
  onSuccess,
}: AmendmentReviewDialogProps) {
  const queryClient = useQueryClient();

  // Form state
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Fetch amendment details
  const { data: amendment, isLoading } = useQuery<AmendmentDetail>({
    queryKey: ["amendment", amendmentId],
    queryFn: () => getAmendment({ data: { id: amendmentId } }) as Promise<AmendmentDetail>,
    enabled: open,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      return approveAmendment({
        data: {
          amendmentId,
          notes: approvalNotes ? { note: approvalNotes } : undefined,
        },
      });
    },
    onSuccess: () => {
      toastSuccess("Amendment approved");
      queryClient.invalidateQueries({ queryKey: ["amendments"] });
      queryClient.invalidateQueries({ queryKey: ["amendment", amendmentId] });
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setApprovalNotes("");
    },
    onError: (error) => {
      toastError(
        error instanceof Error ? error.message : "Failed to approve amendment"
      );
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectionReason.trim()) {
        throw new Error("Please provide a rejection reason");
      }
      return rejectAmendment({
        data: {
          amendmentId,
          reason: rejectionReason.trim(),
        },
      });
    },
    onSuccess: () => {
      toastSuccess("Amendment rejected");
      queryClient.invalidateQueries({ queryKey: ["amendments"] });
      queryClient.invalidateQueries({ queryKey: ["amendment", amendmentId] });
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setRejectionReason("");
      setShowRejectForm(false);
    },
    onError: (error) => {
      toastError(
        error instanceof Error ? error.message : "Failed to reject amendment"
      );
    },
  });

  const changes = amendment?.changes as AmendmentChanges | undefined;
  const itemChanges = changes?.itemChanges || [];
  const financialImpact = changes?.financialImpact as FinancialImpact | undefined;
  const isPending = amendment?.status === "pending";

  const isPendingMutation = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Review Amendment
          </DialogTitle>
          <DialogDescription>
            Review the proposed changes and approve or reject
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !amendment ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Amendment not found</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Amendment Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Amendment Details</CardTitle>
                  <Badge
                    variant={
                      amendment.status === "approved"
                        ? "default"
                        : amendment.status === "rejected"
                          ? "destructive"
                          : amendment.status === "applied"
                            ? "default"
                            : "secondary"
                    }
                    className={cn(
                      amendment.status === "approved" && "bg-green-100 text-green-800",
                      amendment.status === "applied" && "bg-blue-100 text-blue-800"
                    )}
                  >
                    {amendment.status.charAt(0).toUpperCase() + amendment.status.slice(1)}
                  </Badge>
                </div>
                <CardDescription>
                  {amendment.amendmentType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Requested by:</span>
                    <span className="font-medium">
                      {amendment.requester?.name || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Requested:</span>
                    <span className="font-medium">
                      {format(new Date(amendment.requestedAt), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Reason:</span>
                    <p className="text-sm mt-1">{amendment.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Item Changes Diff */}
            {itemChanges.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base">Proposed Changes</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Change</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Before</TableHead>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="text-right">After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemChanges.map((change: ItemChange, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge
                              variant={
                                change.action === "add"
                                  ? "default"
                                  : change.action === "remove"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className={cn(
                                change.action === "add" && "bg-green-100 text-green-800"
                              )}
                            >
                              {change.action.charAt(0).toUpperCase() + change.action.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">
                              {change.before?.description ||
                                change.after?.description ||
                                `Line Item #${(change.orderLineItemId || "").slice(0, 8)}...`}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            {change.before && (
                              <div className="text-sm">
                                <p>
                                  {change.before.quantity} x {formatCurrency(change.before.unitPrice || 0)}
                                </p>
                                <p className="text-muted-foreground">
                                  = {formatCurrency((change.before.quantity || 0) * (change.before.unitPrice || 0))}
                                </p>
                              </div>
                            )}
                            {!change.before && <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                          </TableCell>
                          <TableCell className="text-right">
                            {change.after && (
                              <div className="text-sm">
                                <p>
                                  {change.after.quantity} x {formatCurrency(change.after.unitPrice || 0)}
                                </p>
                                <p className="text-muted-foreground">
                                  = {formatCurrency((change.after.quantity || 0) * (change.after.unitPrice || 0))}
                                </p>
                              </div>
                            )}
                            {!change.after && (
                              <span className="text-destructive">Removed</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Financial Impact Summary */}
            {financialImpact && (
              <div className="space-y-3">
                <Label className="text-base">Financial Impact</Label>
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Before</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(financialImpact.totalBefore)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Subtotal: {formatCurrency(financialImpact.subtotalBefore)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      GST: {formatCurrency(financialImpact.taxBefore)}
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">After</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(financialImpact.totalAfter)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Subtotal: {formatCurrency(financialImpact.subtotalAfter)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      GST: {formatCurrency(financialImpact.taxAfter)}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "text-center font-medium",
                    financialImpact.difference > 0 && "text-green-600",
                    financialImpact.difference < 0 && "text-red-600"
                  )}
                >
                  Net Difference: {financialImpact.difference >= 0 ? "+" : ""}
                  {formatCurrency(financialImpact.difference)}
                </div>
              </div>
            )}

            <Separator />

            {/* Approval / Rejection Forms */}
            {isPending && !showRejectForm && (
              <div className="space-y-2">
                <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                <Textarea
                  id="approval-notes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes for the approval..."
                  rows={2}
                />
              </div>
            )}

            {isPending && showRejectForm && (
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this amendment is being rejected..."
                  rows={3}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason("");
                  }}
                >
                  Cancel rejection
                </Button>
              </div>
            )}

            {/* Non-pending status message */}
            {!isPending && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This amendment has already been {amendment.status}
                  {amendment.reviewer && ` by ${amendment.reviewer.name}`}
                  {amendment.reviewedAt &&
                    ` on ${format(new Date(amendment.reviewedAt), "dd/MM/yyyy")}`}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPendingMutation}
          >
            Close
          </Button>
          {isPending && !showRejectForm && (
            <>
              <Button
                variant="destructive"
                onClick={() => setShowRejectForm(true)}
                disabled={isPendingMutation}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={isPendingMutation}
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
            </>
          )}
          {isPending && showRejectForm && (
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={isPendingMutation || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Confirm Rejection
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default AmendmentReviewDialog;
