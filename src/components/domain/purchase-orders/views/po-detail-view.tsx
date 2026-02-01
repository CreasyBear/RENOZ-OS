/**
 * Purchase Order Detail View (Presenter)
 *
 * Full-width layout following Order Detail reference patterns.
 * Maximizes schema field presentation with specialized section components.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see src/components/domain/orders/views/order-detail-view.tsx
 */

import { memo, useMemo, type ReactNode } from 'react';
import { format, formatDistanceToNow, isPast, isBefore, addDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package,
  Truck,
  Clock,
  CreditCard,
  PanelRight,
  AlertTriangle,
  Hash,
  Phone,
  Mail,
  Link2,
  ChevronRight,
  Calendar,
  Tag,
  Banknote,
  Percent,
  Building,
  ClipboardList,
  PackageCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import type { PurchaseOrderStatus } from '@/lib/schemas/purchase-orders';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { PO_STATUS_CONFIG } from '../po-status-config';

// ============================================================================
// TYPES
// ============================================================================

export interface PurchaseOrderItem {
  id: string;
  lineNumber: number;
  productId: string | null;
  productName: string;
  productSku: string | null;
  description: string | null;
  quantity: number;
  unitOfMeasure: string | null;
  unitPrice: number | null;
  discountPercent: number | null;
  taxRate: number | null;
  lineTotal: number | null;
  quantityReceived: number;
  quantityRejected: number;
  quantityPending: number;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  notes: string | null;
}

export interface PurchaseOrderWithDetails {
  id: string;
  poNumber: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  orderDate: string | null;
  requiredDate: string | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  shipToAddress: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  } | null;
  billToAddress: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  } | null;
  subtotal: number | null;
  taxAmount: number | null;
  shippingAmount: number | null;
  discountAmount: number | null;
  totalAmount: number | null;
  currency: string;
  paymentTerms: string | null;
  supplierReference: string | null;
  internalReference: string | null;
  notes: string | null;
  internalNotes: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  approvalNotes: string | null;
  orderedAt: string | null;
  orderedBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  closedReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  supplierName: string | null;
  supplierEmail: string | null;
  supplierPhone: string | null;
  items: PurchaseOrderItem[];
}

export interface PODetailViewProps {
  po: PurchaseOrderWithDetails;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  className?: string;
}

// ============================================================================
// LOCAL CONFIGURATIONS
// ============================================================================

const RECEIVING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-secondary text-secondary-foreground' },
  partial: { label: 'Partial', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' },
  complete: { label: 'Complete', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRequiredDateStatus(requiredDate: string | null): { isOverdue: boolean; isUrgent: boolean; text: string } {
  if (!requiredDate) return { isOverdue: false, isUrgent: false, text: '' };
  const due = new Date(requiredDate);
  const now = new Date();
  const isOverdue = isPast(due);
  const isUrgent = !isOverdue && isBefore(due, addDays(now, 7));
  const text = isOverdue
    ? `Overdue by ${formatDistanceToNow(due)}`
    : `Required ${formatDistanceToNow(due, { addSuffix: true })}`;
  return { isOverdue, isUrgent, text };
}

function calculateReceivingPercent(items: PurchaseOrderItem[]): number {
  if (!items?.length) return 0;
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const receivedQty = items.reduce((sum, item) => sum + Number(item.quantityReceived || 0), 0);
  return totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;
}

function getItemReceivingStatus(item: PurchaseOrderItem): string {
  if (item.quantityReceived >= item.quantity) return 'complete';
  if (item.quantityReceived > 0) return 'partial';
  return 'pending';
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// ============================================================================
// META CHIPS ROW (Project Management pattern)
// ============================================================================

interface MetaChip {
  label: string;
  value: string | ReactNode;
  icon?: ReactNode;
}

function MetaChipsRow({ items }: { items: MetaChip[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {items.map((item, idx) => (
        <div key={`${item.label}-${idx}`} className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
            {item.label && <span className="text-muted-foreground">{item.label}:</span>}
            <span className="text-foreground font-medium">{item.value}</span>
          </div>
          {idx < items.length - 1 && <Separator orientation="vertical" className="h-4" />}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PO HEADER (Project Management pattern)
// ============================================================================

interface POHeaderProps {
  po: PurchaseOrderWithDetails;
}

function POHeader({ po }: POHeaderProps) {
  const statusConfig = PO_STATUS_CONFIG[po.status] ?? PO_STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon ?? Clock;
  const requiredDateStatus = getRequiredDateStatus(po.requiredDate);

  const metaItems: MetaChip[] = [
    { label: 'PO#', value: po.poNumber, icon: <Hash className="h-3.5 w-3.5" /> },
    { label: 'Order Date', value: po.orderDate ? format(new Date(po.orderDate), 'PP') : 'N/A', icon: <Calendar className="h-3.5 w-3.5" /> },
    ...(po.requiredDate ? [{
      label: 'Required',
      value: (
        <span className={cn(requiredDateStatus.isOverdue && 'text-destructive', requiredDateStatus.isUrgent && 'text-amber-600')}>
          {format(new Date(po.requiredDate), 'PP')}
        </span>
      ),
      icon: <Clock className="h-3.5 w-3.5" />,
    }] : []),
    { label: 'Items', value: String(po.items?.length ?? 0), icon: <Package className="h-3.5 w-3.5" /> },
    { label: 'Currency', value: po.currency, icon: <Tag className="h-3.5 w-3.5" /> },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground leading-tight">{po.poNumber}</h1>
          <div className="flex items-center gap-2">
            <Badge className={cn('gap-1 text-[11px]', `bg-${statusConfig.color}-100 text-${statusConfig.color}-800 dark:bg-${statusConfig.color}-900/50 dark:text-${statusConfig.color}-200`)}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Required Date Alert */}
      {(requiredDateStatus.isOverdue || requiredDateStatus.isUrgent) && (
        <div className={cn(
          'flex items-center gap-2 text-sm',
          requiredDateStatus.isOverdue ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
        )}>
          <AlertTriangle className="h-4 w-4" />
          {requiredDateStatus.text}
        </div>
      )}

      <MetaChipsRow items={metaItems} />
    </section>
  );
}

// ============================================================================
// SUPPLIER INFO SECTION
// ============================================================================

interface SupplierInfoProps {
  po: PurchaseOrderWithDetails;
}

function SupplierInfo({ po }: SupplierInfoProps) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <Building className="h-4 w-4" /> Supplier Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Supplier Name</div>
            <div className="text-sm font-medium">{po.supplierName || 'Unknown Supplier'}</div>
          </div>
          {po.supplierEmail && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${po.supplierEmail}`} className="text-primary hover:underline">
                {po.supplierEmail}
              </a>
            </div>
          )}
          {po.supplierPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${po.supplierPhone}`} className="text-primary hover:underline">
                {po.supplierPhone}
              </a>
            </div>
          )}
        </div>
        {po.supplierReference && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Supplier Reference</div>
            <div className="text-sm font-mono">{po.supplierReference}</div>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// COST SUMMARY SECTION
// ============================================================================

interface CostSummaryProps {
  po: PurchaseOrderWithDetails;
}

function CostSummary({ po }: CostSummaryProps) {
  const discountAmount = Number(po.discountAmount || 0);
  const shippingAmount = Number(po.shippingAmount || 0);

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Cost Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pricing Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Banknote className="h-4 w-4" /> Subtotal
            </span>
            <span className="font-medium tabular-nums"><FormatAmount amount={Number(po.subtotal)} /></span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Percent className="h-4 w-4" /> Discount
              </span>
              <span className="font-medium tabular-nums text-destructive">-<FormatAmount amount={discountAmount} /></span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Tag className="h-4 w-4" /> Tax (GST)
            </span>
            <span className="font-medium tabular-nums"><FormatAmount amount={Number(po.taxAmount)} /></span>
          </div>
          {shippingAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" /> Shipping
              </span>
              <span className="font-medium tabular-nums"><FormatAmount amount={shippingAmount} /></span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums"><FormatAmount amount={Number(po.totalAmount)} /></span>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="space-y-3">
          {po.paymentTerms && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Terms</span>
              <span className="font-medium">{po.paymentTerms}</span>
            </div>
          )}
          {po.internalReference && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Internal Reference</span>
              <span className="font-mono text-xs">{po.internalReference}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// KEY DATES
// ============================================================================

interface KeyDatesProps {
  po: PurchaseOrderWithDetails;
}

function KeyDates({ po }: KeyDatesProps) {
  const requiredDateStatus = getRequiredDateStatus(po.requiredDate);

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Key Dates</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Order Date</div>
          <div className="text-sm font-medium">{po.orderDate ? format(new Date(po.orderDate), 'PP') : 'N/A'}</div>
        </div>
        {po.requiredDate && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Required Date</div>
            <div className={cn('text-sm font-medium', requiredDateStatus.isOverdue && 'text-destructive')}>
              {format(new Date(po.requiredDate), 'PP')}
            </div>
          </div>
        )}
        {po.expectedDeliveryDate && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Expected Delivery</div>
            <div className="text-sm font-medium">{format(new Date(po.expectedDeliveryDate), 'PP')}</div>
          </div>
        )}
        {po.actualDeliveryDate && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Actual Delivery</div>
            <div className="text-sm font-medium text-green-600 dark:text-green-400">
              {format(new Date(po.actualDeliveryDate), 'PP')}
            </div>
          </div>
        )}
        {po.approvedAt && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Approved</div>
            <div className="text-sm font-medium">{format(new Date(po.approvedAt), 'PP')}</div>
          </div>
        )}
        {po.orderedAt && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Ordered</div>
            <div className="text-sm font-medium">{format(new Date(po.orderedAt), 'PP')}</div>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// RECEIVING PROGRESS
// ============================================================================

interface ReceivingProgressProps {
  items: PurchaseOrderItem[];
}

function ReceivingProgress({ items }: ReceivingProgressProps) {
  const receivingPercent = calculateReceivingPercent(items);

  const totalOrdered = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalReceived = items.reduce((sum, item) => sum + Number(item.quantityReceived || 0), 0);
  const totalPending = items.reduce((sum, item) => sum + Number(item.quantityPending || 0), 0);
  const totalRejected = items.reduce((sum, item) => sum + Number(item.quantityRejected || 0), 0);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <PackageCheck className="h-4 w-4" /> Receiving Progress
        </h2>
        <span className="text-sm text-muted-foreground">{receivingPercent}% Received</span>
      </div>

      <Progress value={receivingPercent} className="h-2 mb-4" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-md">
          <div className="text-2xl font-semibold tabular-nums">{totalOrdered}</div>
          <div className="text-xs text-muted-foreground">Ordered</div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
          <div className="text-2xl font-semibold tabular-nums text-green-600 dark:text-green-400">{totalReceived}</div>
          <div className="text-xs text-muted-foreground">Received</div>
        </div>
        <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
          <div className="text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">{totalPending}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </div>
        {totalRejected > 0 && (
          <div className="text-center p-3 bg-destructive/10 rounded-md">
            <div className="text-2xl font-semibold tabular-nums text-destructive">{totalRejected}</div>
            <div className="text-xs text-muted-foreground">Rejected</div>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// ADDRESS COLUMNS
// ============================================================================

interface AddressColumnsProps {
  shipToAddress: PurchaseOrderWithDetails['shipToAddress'];
  billToAddress: PurchaseOrderWithDetails['billToAddress'];
}

function AddressColumns({ shipToAddress, billToAddress }: AddressColumnsProps) {
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

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Addresses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4" /> Ship To
          </h3>
          {renderAddress(shipToAddress)}
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Bill To
          </h3>
          {renderAddress(billToAddress)}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// NOTES SECTION
// ============================================================================

interface NotesSectionProps {
  notes?: string | null;
  internalNotes?: string | null;
  approvalNotes?: string | null;
}

function NotesSection({ notes, internalNotes, approvalNotes }: NotesSectionProps) {
  if (!notes && !internalNotes && !approvalNotes) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Notes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {notes && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Order Notes</h3>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{notes}</p>
          </div>
        )}
        {internalNotes && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Internal Notes</h3>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{internalNotes}</p>
          </div>
        )}
        {approvalNotes && (
          <div className="col-span-full">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Approval Notes</h3>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{approvalNotes}</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// LINE ITEMS PREVIEW (for Overview tab)
// ============================================================================

interface LineItemsPreviewProps {
  items: PurchaseOrderItem[];
}

function LineItemsPreview({ items }: LineItemsPreviewProps) {
  if (!items?.length) return null;

  const displayItems = items.slice(0, 5);
  const hasMore = items.length > 5;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="h-4 w-4" /> Line Items
        </h2>
        <span className="text-sm text-muted-foreground">{items.length} items</span>
      </div>
      <div className="space-y-2">
        {displayItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-medium">
                {item.quantity}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{item.productName}</div>
                {item.productSku && <div className="text-xs text-muted-foreground">SKU: {item.productSku}</div>}
              </div>
            </div>
            <div className="text-sm font-medium tabular-nums">
              <FormatAmount amount={Number(item.lineTotal)} />
            </div>
          </div>
        ))}
        {hasMore && (
          <div className="text-sm text-muted-foreground text-center py-2">
            +{items.length - 5} more items
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// RIGHT META PANEL (Project Management pattern)
// ============================================================================

interface RightMetaPanelProps {
  po: PurchaseOrderWithDetails;
}

function RightMetaPanel({ po }: RightMetaPanelProps) {
  return (
    <aside className="flex flex-col gap-8 p-4 pt-8 lg:sticky lg:self-start lg:top-4">
      {/* Supplier Card */}
      {po.supplierName && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Supplier</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {po.supplierName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{po.supplierName}</div>
                {po.supplierEmail && (
                  <div className="text-xs text-muted-foreground truncate">{po.supplierEmail}</div>
                )}
              </div>
            </div>
            {po.supplierPhone && (
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                <Phone className="h-3 w-3" /> {po.supplierPhone}
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Order Info */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Order Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">PO Number</span>
            <span className="font-mono text-xs">{po.poNumber}</span>
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
        </div>
      </div>
      <Separator />

      {/* References */}
      {(po.supplierReference || po.internalReference) && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">References</h3>
            <div className="space-y-2 text-sm">
              {po.supplierReference && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supplier Ref</span>
                  <span className="font-mono text-xs">{po.supplierReference}</span>
                </div>
              )}
              {po.internalReference && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Internal Ref</span>
                  <span className="font-mono text-xs">{po.internalReference}</span>
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Audit Trail */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Audit Trail</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{format(new Date(po.createdAt), 'PP')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{format(new Date(po.updatedAt), 'PP')}</span>
          </div>
          {po.createdBy && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created by</span>
              <span className="truncate max-w-[120px]">{po.createdBy}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span>v{po.version}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PODetailView = memo(function PODetailView({
  po,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  className,
}: PODetailViewProps) {
  const itemsCount = useMemo(() => po.items?.length ?? 0, [po.items]);

  return (
    <div className={cn('flex flex-1 flex-col min-w-0 m-2 border border-border rounded-lg', className)}>
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Purchase Orders</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{po.poNumber}</span>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(window.location.href)}>
                  <Link2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy link</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8', showMetaPanel && 'bg-muted')}
                  onClick={onToggleMetaPanel}
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content - FULL WIDTH (no max-w-7xl) */}
      <div className="flex flex-1 flex-col bg-background px-2 rounded-b-lg min-w-0 border-t">
        <div className="px-4">
          <div className={cn(
            'grid grid-cols-1 gap-12',
            showMetaPanel ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,320px)]' : 'lg:grid-cols-1'
          )}>
            {/* Primary Content */}
            <div className="space-y-6 pt-4 pb-6">
              <POHeader po={po} />

              <Tabs value={activeTab} onValueChange={onTabChange}>
                <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="items" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Items ({itemsCount})
                  </TabsTrigger>
                  <TabsTrigger value="receiving" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Receiving
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab - space-y-10 for generous spacing between sections */}
                <TabsContent value="overview" className="mt-0 pt-6">
                  <div className="space-y-10">
                    <SupplierInfo po={po} />
                    <CostSummary po={po} />
                    <KeyDates po={po} />
                    <ReceivingProgress items={po.items} />
                    <AddressColumns shipToAddress={po.shipToAddress} billToAddress={po.billToAddress} />
                    <LineItemsPreview items={po.items} />
                    <NotesSection notes={po.notes} internalNotes={po.internalNotes} approvalNotes={po.approvalNotes} />
                  </div>
                </TabsContent>

                {/* Items Tab */}
                <TabsContent value="items" className="mt-0 pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Tax Rate</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">{item.lineNumber}</TableCell>
                          <TableCell>
                            <div className="font-medium">{item.productName}</div>
                            {item.productSku && <div className="text-xs text-muted-foreground">SKU: {item.productSku}</div>}
                            {item.description && <div className="text-xs text-muted-foreground mt-1">{item.description}</div>}
                            {item.notes && <div className="text-xs text-muted-foreground mt-1">{item.notes}</div>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{item.quantity} {item.unitOfMeasure}</TableCell>
                          <TableCell className="text-right tabular-nums"><FormatAmount amount={Number(item.unitPrice)} /></TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number(item.discountPercent) > 0 ? `${item.discountPercent}%` : '---'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{item.taxRate}%</TableCell>
                          <TableCell className="text-right font-medium tabular-nums"><FormatAmount amount={Number(item.lineTotal)} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* Receiving Tab */}
                <TabsContent value="receiving" className="mt-0 pt-6">
                  <div className="space-y-6">
                    <ReceivingProgress items={po.items} />
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Product</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Ordered</TableHead>
                          <TableHead className="text-center">Received</TableHead>
                          <TableHead className="text-center">Pending</TableHead>
                          <TableHead className="text-center">Rejected</TableHead>
                          <TableHead>Expected</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.items?.map((item) => {
                          const receivingStatus = getItemReceivingStatus(item);
                          const statusConfig = RECEIVING_STATUS_CONFIG[receivingStatus] || RECEIVING_STATUS_CONFIG.pending;

                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.productName}</TableCell>
                              <TableCell>
                                <Badge className={cn('text-[10px]', statusConfig.color)}>{statusConfig.label}</Badge>
                              </TableCell>
                              <TableCell className="text-center tabular-nums">{item.quantity}</TableCell>
                              <TableCell className={cn('text-center tabular-nums', Number(item.quantityReceived) >= Number(item.quantity) ? 'text-green-600' : Number(item.quantityReceived) > 0 ? 'text-amber-600' : '')}>
                                {item.quantityReceived || 0}
                              </TableCell>
                              <TableCell className={cn('text-center tabular-nums', Number(item.quantityPending) > 0 && 'text-amber-600')}>
                                {item.quantityPending || 0}
                              </TableCell>
                              <TableCell className={cn('text-center tabular-nums', Number(item.quantityRejected) > 0 && 'text-destructive')}>
                                {item.quantityRejected || 0}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {item.expectedDeliveryDate && format(new Date(item.expectedDeliveryDate), 'PP')}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0 pt-6">
                  <UnifiedActivityTimeline
                    activities={activities}
                    isLoading={activitiesLoading}
                    hasError={!!activitiesError}
                    error={activitiesError || undefined}
                    title="Activity Timeline"
                    description="Complete history of purchase order changes, approvals, and receipts"
                    showFilters={true}
                    emptyMessage="No activity recorded yet"
                    emptyDescription="Purchase order activities will appear here when changes are made."
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Animated Side Meta Panel */}
            <AnimatePresence initial={false}>
              {showMetaPanel && (
                <motion.div
                  key="meta-panel"
                  initial={{ x: 80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 80, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className="lg:border-l lg:border-border"
                >
                  <RightMetaPanel po={po} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Separator className="mt-auto" />
      </div>
    </div>
  );
});

export default PODetailView;
