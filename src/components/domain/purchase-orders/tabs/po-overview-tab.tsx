/**
 * PO Overview Tab
 *
 * Displays supplier info, cost summary, key dates, receiving progress,
 * addresses, line items preview, and notes for a purchase order.
 * Extracted for lazy loading per DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import { format, isPast, isBefore, addDays } from 'date-fns';
import { DetailSection, DetailGrid, type DetailGridField } from '@/components/shared';
import { FormatAmount } from '@/components/shared/format';
import { POReceivingProgress } from './po-receiving-progress';
import type { PurchaseOrderItem, PurchaseOrderWithDetails } from '@/lib/schemas/purchase-orders';
import { FALLBACK_SUPPLIER_NAME } from '@/lib/constants/procurement';

// ============================================================================
// HELPERS
// ============================================================================

function getRequiredDateStatus(requiredDate: string | null): { isOverdue: boolean; isUrgent: boolean; text: string } {
  if (!requiredDate) return { isOverdue: false, isUrgent: false, text: '' };
  const due = new Date(requiredDate);
  const now = new Date();
  const isOverdue = isPast(due);
  const isUrgent = !isOverdue && isBefore(due, addDays(now, 7));
  const text = isOverdue
    ? `Overdue by ${format(due, 'PP')}`
    : `Required ${format(due, 'PP')}`;
  return { isOverdue, isUrgent, text };
}

// ============================================================================
// SUBSECTIONS
// ============================================================================

function SupplierInfo({ po }: { po: PurchaseOrderWithDetails }) {
  const fields: DetailGridField[] = [
    {
      label: 'Supplier Name',
      value: po.supplierId ? (
        <Link
          to="/suppliers/$supplierId"
          params={{ supplierId: po.supplierId }}
          className="text-primary hover:underline"
        >
          {po.supplierName || FALLBACK_SUPPLIER_NAME}
        </Link>
      ) : (
        po.supplierName || FALLBACK_SUPPLIER_NAME
      ),
    },
    ...(po.supplierEmail
      ? [{ label: 'Email', value: <a href={`mailto:${po.supplierEmail}`} className="text-primary hover:underline">{po.supplierEmail}</a> }]
      : []),
    ...(po.supplierPhone ? [{ label: 'Phone', value: <a href={`tel:${po.supplierPhone}`} className="text-primary hover:underline">{po.supplierPhone}</a> }] : []),
    ...(po.supplierReference ? [{ label: 'Supplier Reference', value: <span className="font-mono">{po.supplierReference}</span> }] : []),
  ];
  return (
    <DetailSection id="supplier" title="Supplier Information" defaultOpen>
      <DetailGrid fields={fields} />
    </DetailSection>
  );
}

function CostSummary({ po }: { po: PurchaseOrderWithDetails }) {
  const discountAmount = Number(po.discountAmount || 0);
  const shippingAmount = Number(po.shippingAmount || 0);
  const fields: DetailGridField[] = [
    { label: 'Subtotal', value: <span className="tabular-nums"><FormatAmount amount={Number(po.subtotal)} currency={po.currency} /></span> },
    ...(discountAmount > 0
      ? [{ label: 'Discount', value: <span className="tabular-nums text-destructive">-<FormatAmount amount={discountAmount} currency={po.currency} /></span> }]
      : []),
    { label: 'Tax (GST)', value: <span className="tabular-nums"><FormatAmount amount={Number(po.taxAmount)} currency={po.currency} /></span> },
    ...(shippingAmount > 0 ? [{ label: 'Shipping', value: <span className="tabular-nums"><FormatAmount amount={shippingAmount} currency={po.currency} /></span> }] : []),
    { label: 'Total', value: <span className="font-semibold tabular-nums"><FormatAmount amount={Number(po.totalAmount)} currency={po.currency} /></span>, colSpan: 2 },
    ...(po.paymentTerms ? [{ label: 'Payment Terms', value: po.paymentTerms }] : []),
    ...(po.internalReference ? [{ label: 'Internal Reference', value: <span className="font-mono text-xs">{po.internalReference}</span> }] : []),
  ];
  return (
    <DetailSection id="costs" title="Cost Summary" defaultOpen>
      <DetailGrid fields={fields} />
    </DetailSection>
  );
}

function KeyDates({ po }: { po: PurchaseOrderWithDetails }) {
  const requiredDateStatus = getRequiredDateStatus(po.requiredDate);

  const fields: DetailGridField[] = [
    { label: 'Order Date', value: po.orderDate ? format(new Date(po.orderDate), 'PP') : 'N/A' },
    ...(po.requiredDate ? [{ label: 'Required Date', value: <span className={requiredDateStatus.isOverdue ? 'text-destructive' : ''}>{format(new Date(po.requiredDate), 'PP')}</span> }] : []),
    ...(po.expectedDeliveryDate ? [{ label: 'Expected Delivery', value: format(new Date(po.expectedDeliveryDate), 'PP') }] : []),
    ...(po.actualDeliveryDate ? [{ label: 'Actual Delivery', value: <span className="text-green-600 dark:text-green-400">{format(new Date(po.actualDeliveryDate), 'PP')}</span> }] : []),
    ...(po.approvedAt ? [{ label: 'Approved', value: format(new Date(po.approvedAt), 'PP') }] : []),
    ...(po.orderedAt ? [{ label: 'Ordered', value: format(new Date(po.orderedAt), 'PP') }] : []),
  ];
  return (
    <DetailSection id="dates" title="Key Dates" defaultOpen>
      <DetailGrid fields={fields} columns={3} />
    </DetailSection>
  );
}

function AddressColumns({ shipToAddress, billToAddress }: { shipToAddress: PurchaseOrderWithDetails['shipToAddress']; billToAddress: PurchaseOrderWithDetails['billToAddress'] }) {
  const renderAddress = (address: PurchaseOrderWithDetails['shipToAddress']) => {
    if (!address) return <span className="text-muted-foreground text-sm">Not specified</span>;
    return (
      <div className="text-sm space-y-0.5">
        <div>{address.street1}</div>
        {address.street2 && <div>{address.street2}</div>}
        <div>{address.city}, {address.state} {address.postcode}</div>
        <div className="text-muted-foreground">{address.country}</div>
      </div>
    );
  };

  const fields: DetailGridField[] = [
    { label: 'Ship To', value: renderAddress(shipToAddress), colSpan: 1 },
    { label: 'Bill To', value: renderAddress(billToAddress), colSpan: 1 },
  ];
  return (
    <DetailSection id="addresses" title="Addresses" defaultOpen>
      <DetailGrid fields={fields} />
    </DetailSection>
  );
}

function LineItemsPreview({ items, currency }: { items: PurchaseOrderItem[]; currency?: string }) {
  if (!items?.length) return null;

  const displayItems = items.slice(0, 5);
  const hasMore = items.length > 5;

  return (
    <DetailSection id="line-items" title={`Line Items (${items.length})`} defaultOpen>
      <div className="space-y-2">
        {displayItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-medium">
                {item.quantity}
              </div>
              <div className="min-w-0">
                {item.productId ? (
                  <Link
                    to="/products/$productId"
                    params={{ productId: item.productId }}
                    className="text-sm font-medium truncate text-primary hover:underline block"
                  >
                    {item.productName}
                  </Link>
                ) : (
                  <div className="text-sm font-medium truncate">{item.productName}</div>
                )}
                {item.productSku && <div className="text-xs text-muted-foreground">SKU: {item.productSku}</div>}
              </div>
            </div>
            <div className="text-sm font-medium tabular-nums">
              <FormatAmount amount={Number(item.lineTotal)} currency={currency} />
            </div>
          </div>
        ))}
        {hasMore && (
          <div className="text-sm text-muted-foreground text-center py-2">
            +{items.length - 5} more items
          </div>
        )}
      </div>
    </DetailSection>
  );
}

function NotesSection({ notes, internalNotes, approvalNotes }: { notes?: string | null; internalNotes?: string | null; approvalNotes?: string | null }) {
  if (!notes && !internalNotes && !approvalNotes) return null;

  const fields: DetailGridField[] = [
    ...(notes ? [{ label: 'Order Notes', value: <p className="text-sm whitespace-pre-wrap">{notes}</p>, colSpan: 2 as const }] : []),
    ...(internalNotes ? [{ label: 'Internal Notes', value: <p className="text-sm whitespace-pre-wrap">{internalNotes}</p>, colSpan: 2 as const }] : []),
    ...(approvalNotes ? [{ label: 'Approval Notes', value: <p className="text-sm whitespace-pre-wrap">{approvalNotes}</p>, colSpan: 2 as const }] : []),
  ];
  return (
    <DetailSection id="notes" title="Notes" defaultOpen>
      <DetailGrid fields={fields} />
    </DetailSection>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface POOverviewTabProps {
  po: PurchaseOrderWithDetails;
}

export const POOverviewTab = memo(function POOverviewTab({ po }: POOverviewTabProps) {
  return (
    <div className="space-y-10 pt-6">
      <SupplierInfo po={po} />
      <CostSummary po={po} />
      <KeyDates po={po} />
      <POReceivingProgress items={po.items ?? []} />
      <AddressColumns shipToAddress={po.shipToAddress} billToAddress={po.billToAddress} />
      <LineItemsPreview items={po.items ?? []} currency={po.currency} />
      <NotesSection notes={po.notes} internalNotes={po.internalNotes} approvalNotes={po.approvalNotes} />
    </div>
  );
});
