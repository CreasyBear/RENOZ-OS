/**
 * Purchase Order Detail Route
 *
 * Individual purchase order view with approval workflow and goods receipt.
 * Implements SUPP-PO-MANAGEMENT, SUPP-APPROVAL-WORKFLOW, and SUPP-GOODS-RECEIPT stories.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Package } from 'lucide-react';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminDetailSkeleton } from '@/components/skeletons/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/lib/toast';
import { ApprovalActionBar, ApprovalHistory } from '@/components/domain/approvals';
import { ReceiptCreationDialog, ReceiptHistory } from '@/components/domain/receipts';
import {
  usePurchaseOrder,
  useSubmitForApproval,
  useApprovePurchaseOrder,
  useRejectPurchaseOrder,
  useMarkAsOrdered,
} from '@/hooks/suppliers';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency } from '@/lib/formatters';
import type { ApprovalEvent } from '@/lib/schemas/approvals';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/purchase-orders/$poId')({
  component: PurchaseOrderDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/purchase-orders" />
  ),
  pendingComponent: () => <AdminDetailSkeleton />,
});

// ============================================================================
// STATUS BADGE
// ============================================================================

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  pending_approval: { label: 'Pending Approval', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  ordered: { label: 'Ordered', variant: 'default' },
  partial_received: { label: 'Partial', variant: 'outline' },
  received: { label: 'Received', variant: 'default' },
  closed: { label: 'Closed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PurchaseOrderDetailPage() {
  const navigate = Route.useNavigate();
  const { poId } = Route.useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  // Fetch purchase order using centralized hook
  const { data: po, isLoading, error } = usePurchaseOrder(poId);

  // Mutations using centralized hooks
  const submitMutation = useSubmitForApproval();
  const approveMutation = useApprovePurchaseOrder();
  const rejectMutation = useRejectPurchaseOrder();
  const orderMutation = useMarkAsOrdered();

  // Loading state
  if (isLoading) {
    return (
      <PageLayout variant="full-width">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (error || !po) {
    return (
      <PageLayout variant="full-width">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">Purchase Order Not Found</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            The purchase order you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button onClick={() => navigate({ to: '/purchase-orders' })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </div>
      </PageLayout>
    );
  }

  const statusBadge = statusConfig[po.status] || {
    label: po.status,
    variant: 'secondary' as const,
  };

  // Build approval events from PO data (simplified - in production would come from approvals table)
  const approvalEvents: ApprovalEvent[] = [];

  // Add created event
  approvalEvents.push({
    id: `${po.id}-created`,
    type: 'created',
    user: { id: po.createdBy || 'unknown', name: 'System' },
    date: String(po.createdAt),
  });

  // Add approval event if approved
  if (po.approvedAt && po.approvedBy) {
    approvalEvents.unshift({
      id: `${po.id}-approved`,
      type: 'approved',
      user: { id: po.approvedBy, name: 'Approver' },
      date: String(po.approvedAt),
      note: po.approvalNotes || undefined,
    });
  }

  // Check if current status is pending - means it was submitted
  if (po.status === 'pending_approval' || po.approvedAt) {
    approvalEvents.splice(approvalEvents.length - 1, 0, {
      id: `${po.id}-submitted`,
      type: 'submitted',
      user: { id: po.updatedBy || 'unknown', name: 'Submitter' },
      date: String(po.updatedAt),
    });
  }

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={po.poNumber}
        description={`Order for ${po.supplierName || 'Unknown Supplier'}`}
        actions={
          <Button variant="outline" onClick={() => navigate({ to: '/purchase-orders' })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />
      <PageLayout.Content>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Items ({po.items?.length || 0})</TabsTrigger>
                <TabsTrigger value="receipts">Receipts</TabsTrigger>
                <TabsTrigger value="approval">Approval</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-medium">
                          {formatCurrency(Number(po.totalAmount) || 0, { cents: false })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Currency</span>
                        <span>{po.currency}</span>
                      </div>
                      {po.paymentTerms && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment Terms</span>
                          <span>{po.paymentTerms}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Dates</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {po.orderDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Order Date</span>
                          <span>{new Date(po.orderDate).toLocaleDateString('en-AU')}</span>
                        </div>
                      )}
                      {po.requiredDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Required Date</span>
                          <span>{new Date(po.requiredDate).toLocaleDateString('en-AU')}</span>
                        </div>
                      )}
                      {po.expectedDeliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expected Delivery</span>
                          <span>
                            {new Date(po.expectedDeliveryDate).toLocaleDateString('en-AU')}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {(po.notes || po.internalNotes) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {po.notes && (
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">Notes</p>
                          <p className="mt-1">{po.notes}</p>
                        </div>
                      )}
                      {po.internalNotes && (
                        <div>
                          <p className="text-muted-foreground text-sm font-medium">
                            Internal Notes
                          </p>
                          <p className="mt-1">{po.internalNotes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="items" className="mt-4">
                {po.items && po.items.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Line Items ({po.items.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {po.items.map((item, index) => (
                          <div
                            key={item.id || index}
                            className="flex justify-between border-b pb-2 last:border-0"
                          >
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              {item.productSku && (
                                <p className="text-muted-foreground text-sm">
                                  SKU: {item.productSku}
                                </p>
                              )}
                              {item.description && (
                                <p className="text-muted-foreground text-sm">{item.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p>
                                {item.quantity} x{' '}
                                {formatCurrency(Number(item.unitPrice) || 0, { cents: false })}
                              </p>
                              <p className="font-medium">
                                {formatCurrency(Number(item.lineTotal) || 0, { cents: false })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No line items</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="receipts" className="mt-4">
                <div className="space-y-4">
                  {/* Show receive button for ordered/partial_received status */}
                  {(po.status === 'ordered' || po.status === 'partial_received') && (
                    <div className="flex justify-end">
                      <Button onClick={() => setShowReceiptDialog(true)}>
                        <Package className="mr-2 h-4 w-4" />
                        Receive Goods
                      </Button>
                    </div>
                  )}

                  {/* Receipt History - placeholder data for now */}
                  <ReceiptHistory receipts={[]} isLoading={false} />
                </div>
              </TabsContent>

              <TabsContent value="approval" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <ApprovalHistory events={approvalEvents} currentStatus={po.status} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Approval Actions */}
          <div className="space-y-6">
            <ApprovalActionBar
              order={{
                id: po.id,
                poNumber: po.poNumber,
                status: po.status,
                totalAmount: Number(po.totalAmount) || 0,
                currency: po.currency || 'AUD',
                supplierName: po.supplierName || null,
              }}
              onSubmitForApproval={async (_note) => {
                await submitMutation.mutateAsync(
                  { id: poId },
                  {
                    onSuccess: () => toast.success('Order submitted for approval'),
                    onError: (err) =>
                      toast.error(
                        err instanceof Error ? err.message : 'Failed to submit for approval'
                      ),
                  }
                );
              }}
              onApprove={async (comment) => {
                await approveMutation.mutateAsync(
                  { id: poId, notes: comment },
                  {
                    onSuccess: () => toast.success('Order approved'),
                    onError: (err) =>
                      toast.error(err instanceof Error ? err.message : 'Failed to approve order'),
                  }
                );
              }}
              onReject={async (reason, comment) => {
                await rejectMutation.mutateAsync(
                  { id: poId, reason: `${reason}: ${comment}` },
                  {
                    onSuccess: () => toast.success('Order rejected and returned to draft'),
                    onError: (err) =>
                      toast.error(err instanceof Error ? err.message : 'Failed to reject order'),
                  }
                );
              }}
              onMarkAsOrdered={async () => {
                await orderMutation.mutateAsync(
                  { id: poId },
                  {
                    onSuccess: () => toast.success('Order marked as sent to supplier'),
                    onError: (err) =>
                      toast.error(err instanceof Error ? err.message : 'Failed to mark as ordered'),
                  }
                );
              }}
              isSubmitting={submitMutation.isPending}
              isProcessing={
                approveMutation.isPending || rejectMutation.isPending || orderMutation.isPending
              }
            />

            {/* Supplier Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Supplier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{po.supplierName || 'Unknown Supplier'}</p>
                {po.supplierEmail && (
                  <p className="text-muted-foreground text-sm">{po.supplierEmail}</p>
                )}
                {po.supplierPhone && (
                  <p className="text-muted-foreground text-sm">{po.supplierPhone}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout.Content>

      {/* Receipt Creation Dialog */}
      <ReceiptCreationDialog
        open={showReceiptDialog}
        onOpenChange={setShowReceiptDialog}
        purchaseOrderId={po.id}
        poNumber={po.poNumber}
        supplierName={po.supplierName || null}
        items={(po.items || []).map((item) => ({
          id: item.id,
          productName: item.productName || 'Unknown Product',
          productSku: item.productSku || undefined,
          unit: item.unitOfMeasure || undefined,
          quantityOrdered: Number(item.quantity) || 0,
          quantityAlreadyReceived: Number(item.quantityReceived) || 0,
          quantityPending: Math.max(
            0,
            (Number(item.quantity) || 0) - (Number(item.quantityReceived) || 0)
          ),
        }))}
        onSuccess={() => {
          toast.success('Goods receipt recorded');
          queryClient.invalidateQueries({
            queryKey: queryKeys.suppliers.purchaseOrderDetail(poId),
          });
        }}
      />
    </PageLayout>
  );
}
