/**
 * Order Detail View (Presenter)
 *
 * Full-width layout following Project Management reference patterns.
 * Maximizes schema field presentation with specialized section components.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see _reference/project-management-reference/components/projects/ProjectDetailsPage.tsx
 */

import { memo, useMemo, type ReactNode } from 'react';
import { format, formatDistanceToNow, isPast, isBefore, addDays } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package,
  Truck,
  FileText,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  PanelRight,
  AlertTriangle,
  Hash,
  Phone,
  Mail,
  Link2,
  ChevronRight,
  Receipt,
  Calendar,
  Globe,
  Tag,
  Banknote,
  Percent,
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
import type { OrderStatus } from '@/lib/schemas/orders';
import type { OrderWithCustomer } from '@/hooks/orders/use-order-detail';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { ORDER_STATUS_DETAIL_CONFIG } from '../order-status-config';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderDetailViewProps {
  order: OrderWithCustomer;
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

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-secondary text-secondary-foreground' },
  partial: { label: 'Partial', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
  overdue: { label: 'Overdue', color: 'bg-destructive/10 text-destructive' },
  refunded: { label: 'Refunded', color: 'bg-secondary text-secondary-foreground' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-destructive/10 text-destructive' },
  high: { label: 'High', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' },
  normal: { label: 'Normal', color: 'bg-secondary text-secondary-foreground' },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Package }> = {
  web: { label: 'Web', icon: Globe },
  phone: { label: 'Phone', icon: Phone },
  email: { label: 'Email', icon: Mail },
  api: { label: 'API', icon: Hash },
  pos: { label: 'POS', icon: CreditCard },
};

const FULFILLMENT_STAGES = ['confirmed', 'picking', 'picked', 'shipped', 'delivered'] as const;

const PICK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  not_picked: { label: 'Not Picked', color: 'bg-secondary text-muted-foreground' },
  partial: { label: 'Partial', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' },
  picked: { label: 'Picked', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDueDateStatus(dueDate: string | null): { isOverdue: boolean; isUrgent: boolean; text: string } {
  if (!dueDate) return { isOverdue: false, isUrgent: false, text: '' };
  const due = new Date(dueDate);
  const now = new Date();
  const isOverdue = isPast(due);
  const isUrgent = !isOverdue && isBefore(due, addDays(now, 7));
  const text = isOverdue
    ? `Overdue by ${formatDistanceToNow(due)}`
    : `Due ${formatDistanceToNow(due, { addSuffix: true })}`;
  return { isOverdue, isUrgent, text };
}

function calculateFulfillmentPercent(lineItems: OrderWithCustomer['lineItems']): number {
  if (!lineItems?.length) return 0;
  const totalQty = lineItems.reduce((sum, item) => sum + Number(item.quantity), 0);
  const deliveredQty = lineItems.reduce((sum, item) => sum + Number(item.qtyDelivered || 0), 0);
  return totalQty > 0 ? Math.round((deliveredQty / totalQty) * 100) : 0;
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
// ORDER HEADER (Project Management pattern)
// ============================================================================

interface OrderHeaderProps {
  order: OrderWithCustomer;
}

function OrderHeader({ order }: OrderHeaderProps) {
  const statusConfig = ORDER_STATUS_DETAIL_CONFIG[order.status as OrderStatus] ?? ORDER_STATUS_DETAIL_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus as string] ?? PAYMENT_STATUS_CONFIG.pending;
  const metadata = order.metadata as { source?: string; priority?: string; assignedTo?: string; externalRef?: string } | null;
  const priorityConfig = metadata?.priority ? PRIORITY_CONFIG[metadata.priority] : null;
  const sourceConfig = metadata?.source ? SOURCE_CONFIG[metadata.source] : null;
  const dueDateStatus = getDueDateStatus(order.dueDate);

  const metaItems: MetaChip[] = [
    { label: 'ID', value: order.orderNumber, icon: <Hash className="h-3.5 w-3.5" /> },
    { label: 'Order Date', value: format(new Date(order.orderDate), 'PP'), icon: <Calendar className="h-3.5 w-3.5" /> },
    ...(order.dueDate ? [{
      label: 'Due',
      value: (
        <span className={cn(dueDateStatus.isOverdue && 'text-destructive', dueDateStatus.isUrgent && 'text-amber-600')}>
          {format(new Date(order.dueDate), 'PP')}
        </span>
      ),
      icon: <Clock className="h-3.5 w-3.5" />,
    }] : []),
    ...(sourceConfig ? [{
      label: 'Source',
      value: sourceConfig.label,
      icon: <sourceConfig.icon className="h-3.5 w-3.5" />,
    }] : []),
    { label: 'Items', value: String(order.lineItems?.length ?? 0), icon: <Package className="h-3.5 w-3.5" /> },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground leading-tight">{order.orderNumber}</h1>
          <div className="flex items-center gap-2">
            <Badge className={cn('gap-1 text-[11px]', statusConfig.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            <Badge className={cn('text-[11px]', paymentConfig.color)}>
              {paymentConfig.label}
            </Badge>
            {priorityConfig && metadata?.priority !== 'normal' && (
              <Badge className={cn('text-[11px]', priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Due Date Alert */}
      {(dueDateStatus.isOverdue || dueDateStatus.isUrgent) && (
        <div className={cn(
          'flex items-center gap-2 text-sm',
          dueDateStatus.isOverdue ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
        )}>
          <AlertTriangle className="h-4 w-4" />
          {dueDateStatus.text}
        </div>
      )}

      <MetaChipsRow items={metaItems} />
    </section>
  );
}

// ============================================================================
// FINANCIAL BREAKDOWN (2-column layout)
// ============================================================================

interface FinancialBreakdownProps {
  order: OrderWithCustomer;
}

function FinancialBreakdown({ order }: FinancialBreakdownProps) {
  const balanceDue = Number(order.balanceDue || 0);
  const isBalanceAlert = balanceDue > 0 && order.paymentStatus === 'overdue';
  const discountAmount = Number(order.discountAmount || 0);
  const shippingAmount = Number(order.shippingAmount || 0);
  const paymentPercent = Number(order.total) > 0 ? (Number(order.paidAmount || 0) / Number(order.total)) * 100 : 0;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Financial Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pricing Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Banknote className="h-4 w-4" /> Subtotal
            </span>
            <span className="font-medium tabular-nums"><FormatAmount amount={Number(order.subtotal)} /></span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Percent className="h-4 w-4" /> Discount {order.discountPercent && `(${order.discountPercent}%)`}
              </span>
              <span className="font-medium tabular-nums text-destructive">-<FormatAmount amount={discountAmount} /></span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Tag className="h-4 w-4" /> Tax (GST)
            </span>
            <span className="font-medium tabular-nums"><FormatAmount amount={Number(order.taxAmount)} /></span>
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
            <span className="tabular-nums"><FormatAmount amount={Number(order.total)} /></span>
          </div>
        </div>

        {/* Payment Status */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-medium tabular-nums text-green-600 dark:text-green-400">
              <FormatAmount amount={Number(order.paidAmount || 0)} />
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Balance Due</span>
            <span className={cn('font-medium tabular-nums', isBalanceAlert && 'text-destructive font-semibold')}>
              <FormatAmount amount={balanceDue} />
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Payment Progress</span>
            <span className="text-xs text-muted-foreground">{Math.round(paymentPercent)}%</span>
          </div>
          <Progress value={paymentPercent} className="h-2" />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// ADDRESS COLUMNS (2-column layout)
// ============================================================================

interface AddressColumnsProps {
  billingAddress: OrderWithCustomer['billingAddress'];
  shippingAddress: OrderWithCustomer['shippingAddress'];
}

function AddressColumns({ billingAddress, shippingAddress }: AddressColumnsProps) {
  const renderAddress = (address: OrderWithCustomer['billingAddress'] | OrderWithCustomer['shippingAddress']) => {
    if (!address) return <span className="text-muted-foreground text-sm">Not specified</span>;
    return (
      <div className="text-sm space-y-0.5">
        {address.contactName && <div className="font-medium">{address.contactName}</div>}
        <div>{address.street1}</div>
        {address.street2 && <div>{address.street2}</div>}
        <div>{address.city}, {address.state} {address.postalCode}</div>
        <div className="text-muted-foreground">{address.country}</div>
        {address.contactPhone && (
          <div className="text-muted-foreground flex items-center gap-1 mt-2">
            <Phone className="h-3 w-3" /> {address.contactPhone}
          </div>
        )}
      </div>
    );
  };

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Addresses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Billing Address
          </h3>
          {renderAddress(billingAddress)}
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4" /> Shipping Address
          </h3>
          {renderAddress(shippingAddress)}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// KEY DATES
// ============================================================================

interface KeyDatesProps {
  order: OrderWithCustomer;
}

function KeyDates({ order }: KeyDatesProps) {
  const dueDateStatus = getDueDateStatus(order.dueDate);

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Key Dates</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Order Date</div>
          <div className="text-sm font-medium">{format(new Date(order.orderDate), 'PP')}</div>
        </div>
        {order.dueDate && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Due Date</div>
            <div className={cn('text-sm font-medium', dueDateStatus.isOverdue && 'text-destructive')}>
              {format(new Date(order.dueDate), 'PP')}
            </div>
          </div>
        )}
        {order.shippedDate && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Shipped</div>
            <div className="text-sm font-medium">{format(new Date(order.shippedDate), 'PP')}</div>
          </div>
        )}
        {order.deliveredDate && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Delivered</div>
            <div className="text-sm font-medium text-green-600 dark:text-green-400">
              {format(new Date(order.deliveredDate), 'PP')}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// FULFILLMENT PROGRESS
// ============================================================================

interface FulfillmentProgressProps {
  currentStatus: string;
  lineItems: OrderWithCustomer['lineItems'];
}

function FulfillmentProgress({ currentStatus, lineItems }: FulfillmentProgressProps) {
  const currentIndex = FULFILLMENT_STAGES.indexOf(currentStatus as typeof FULFILLMENT_STAGES[number]);
  const fulfillmentPercent = calculateFulfillmentPercent(lineItems);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Fulfillment Progress</h2>
        <span className="text-sm text-muted-foreground">{fulfillmentPercent}% Complete</span>
      </div>

      <div className="flex items-center gap-1 mb-4" role="list" aria-label="Fulfillment progress">
        {FULFILLMENT_STAGES.map((stage, index) => {
          const stageConfig = ORDER_STATUS_DETAIL_CONFIG[stage];
          const isComplete = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={stage} className="flex-1 flex flex-col items-center" role="listitem">
              <div className="flex items-center w-full">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium',
                  isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {isComplete ? <CheckCircle className="h-4 w-4" /> : index + 1}
                </div>
                {index < FULFILLMENT_STAGES.length - 1 && (
                  <div className={cn('flex-1 h-1 mx-2', isComplete ? 'bg-primary' : 'bg-muted')} />
                )}
              </div>
              <p className={cn(
                'text-xs mt-2 text-center',
                isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}>
                {stageConfig.label}
              </p>
            </div>
          );
        })}
      </div>

      <Progress value={fulfillmentPercent} className="h-2" />
    </section>
  );
}

// ============================================================================
// NOTES SECTION
// ============================================================================

interface NotesSectionProps {
  customerNotes?: string | null;
  internalNotes?: string | null;
}

function NotesSection({ customerNotes, internalNotes }: NotesSectionProps) {
  if (!customerNotes && !internalNotes) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-4">Notes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {customerNotes && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Customer Notes</h3>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{customerNotes}</p>
          </div>
        )}
        {internalNotes && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Internal Notes</h3>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{internalNotes}</p>
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
  lineItems: OrderWithCustomer['lineItems'];
}

function LineItemsPreview({ lineItems }: LineItemsPreviewProps) {
  if (!lineItems?.length) return null;

  const displayItems = lineItems.slice(0, 5);
  const hasMore = lineItems.length > 5;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Line Items</h2>
        <span className="text-sm text-muted-foreground">{lineItems.length} items</span>
      </div>
      <div className="space-y-2">
        {displayItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs font-medium">
                {item.quantity}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{item.product?.name ?? item.description}</div>
                {item.sku && <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>}
              </div>
            </div>
            <div className="text-sm font-medium tabular-nums">
              <FormatAmount amount={Number(item.lineTotal)} />
            </div>
          </div>
        ))}
        {hasMore && (
          <div className="text-sm text-muted-foreground text-center py-2">
            +{lineItems.length - 5} more items
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
  order: OrderWithCustomer;
}

function RightMetaPanel({ order }: RightMetaPanelProps) {
  const metadata = order.metadata as { source?: string; priority?: string; assignedTo?: string; externalRef?: string } | null;

  return (
    <aside className="flex flex-col gap-8 p-4 pt-8 lg:sticky lg:self-start lg:top-4">
      {/* Customer Card */}
      {order.customer && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Customer</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {order.customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{order.customer.name}</div>
                {order.customer.email && (
                  <div className="text-xs text-muted-foreground truncate">{order.customer.email}</div>
                )}
              </div>
            </div>
            {order.customer.phone && (
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                <Phone className="h-3 w-3" /> {order.customer.phone}
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Documents */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Documents</h3>
        <div className="space-y-2">
          <DocumentLink url={order.quotePdfUrl} icon={FileText} label="Quote PDF" />
          <DocumentLink url={order.invoicePdfUrl} icon={Receipt} label="Invoice PDF" />
          {order.xeroInvoiceUrl && (
            <a
              href={order.xeroInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View in Xero
            </a>
          )}
        </div>
      </div>
      <Separator />

      {/* Xero Integration */}
      {order.xeroSyncStatus && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Xero Integration</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={cn(
                  'text-[10px] h-5',
                  order.xeroSyncStatus === 'synced' && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
                  (order.xeroSyncStatus === 'pending' || order.xeroSyncStatus === 'syncing') && 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
                  order.xeroSyncStatus === 'error' && 'bg-destructive/10 text-destructive'
                )}>
                  {order.xeroSyncStatus}
                </Badge>
              </div>
              {order.xeroInvoiceId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice ID</span>
                  <span className="font-mono text-xs">{order.xeroInvoiceId.slice(0, 12)}...</span>
                </div>
              )}
              {order.lastXeroSyncAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span>{format(new Date(order.lastXeroSyncAt), 'PP p')}</span>
                </div>
              )}
              {order.xeroSyncError && (
                <div className="text-xs text-destructive mt-2 p-2 bg-destructive/5 rounded">
                  {order.xeroSyncError}
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* External Reference */}
      {metadata?.externalRef && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Reference</h3>
            <div className="text-sm font-mono">{metadata.externalRef}</div>
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
            <span>{format(new Date(order.createdAt), 'PP')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated</span>
            <span>{format(new Date(order.updatedAt), 'PP')}</span>
          </div>
          {order.createdBy && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created by</span>
              <span className="truncate max-w-[120px]">{order.createdBy}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span>v{order.version}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DocumentLink({ url, icon: Icon, label }: { url?: string | null; icon: typeof FileText; label: string }) {
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Icon className="h-4 w-4" />
        {label}
        <Download className="h-3 w-3 ml-auto" />
      </a>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" />
      {label}
      <span className="ml-auto text-xs">Not generated</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OrderDetailView = memo(function OrderDetailView({
  order,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  className,
}: OrderDetailViewProps) {
  const itemsCount = useMemo(() => order.lineItems?.length ?? 0, [order.lineItems]);

  return (
    <div className={cn('flex flex-1 flex-col min-w-0 m-2 border border-border rounded-lg', className)}>
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Orders</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{order.orderNumber}</span>
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
              <OrderHeader order={order} />

              <Tabs value={activeTab} onValueChange={onTabChange}>
                <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="items" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Items ({itemsCount})
                  </TabsTrigger>
                  <TabsTrigger value="fulfillment" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Fulfillment
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab - space-y-10 for generous spacing between sections */}
                <TabsContent value="overview" className="mt-0 pt-6">
                  <div className="space-y-10">
                    <FinancialBreakdown order={order} />
                    <KeyDates order={order} />
                    <FulfillmentProgress currentStatus={order.status as string} lineItems={order.lineItems} />
                    <AddressColumns billingAddress={order.billingAddress} shippingAddress={order.shippingAddress} />
                    <LineItemsPreview lineItems={order.lineItems} />
                    <NotesSection customerNotes={order.customerNotes} internalNotes={order.internalNotes} />
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
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.lineItems?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">{item.lineNumber}</TableCell>
                          <TableCell>
                            <div className="font-medium">{item.product?.name ?? item.description}</div>
                            {item.sku && <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>}
                            {item.notes && <div className="text-xs text-muted-foreground mt-1">{item.notes}</div>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums"><FormatAmount amount={Number(item.unitPrice)} /></TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number(item.discountAmount) > 0 ? (
                              <span className="text-destructive">-<FormatAmount amount={Number(item.discountAmount)} /></span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <FormatAmount amount={Number(item.taxAmount)} />
                            <span className="text-xs text-muted-foreground ml-1">({item.taxType?.toUpperCase()})</span>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums"><FormatAmount amount={Number(item.lineTotal)} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* Fulfillment Tab */}
                <TabsContent value="fulfillment" className="mt-0 pt-6">
                  <div className="space-y-6">
                    <FulfillmentProgress currentStatus={order.status as string} lineItems={order.lineItems} />
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Product</TableHead>
                          <TableHead>Pick Status</TableHead>
                          <TableHead className="text-center">Ordered</TableHead>
                          <TableHead className="text-center">Picked</TableHead>
                          <TableHead className="text-center">Shipped</TableHead>
                          <TableHead className="text-center">Delivered</TableHead>
                          <TableHead>Picked At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.lineItems?.map((item) => {
                          const pickStatus = item.pickStatus || 'not_picked';
                          const pickConfig = PICK_STATUS_CONFIG[pickStatus] || PICK_STATUS_CONFIG.not_picked;

                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.product?.name ?? item.description}</TableCell>
                              <TableCell>
                                <Badge className={cn('text-[10px]', pickConfig.color)}>{pickConfig.label}</Badge>
                              </TableCell>
                              <TableCell className="text-center tabular-nums">{item.quantity}</TableCell>
                              <TableCell className={cn('text-center tabular-nums', Number(item.qtyPicked) >= Number(item.quantity) ? 'text-green-600' : Number(item.qtyPicked) > 0 ? 'text-amber-600' : '')}>
                                {item.qtyPicked || 0}
                              </TableCell>
                              <TableCell className={cn('text-center tabular-nums', Number(item.qtyShipped) >= Number(item.quantity) ? 'text-green-600' : Number(item.qtyShipped) > 0 ? 'text-amber-600' : '')}>
                                {item.qtyShipped || 0}
                              </TableCell>
                              <TableCell className={cn('text-center tabular-nums', Number(item.qtyDelivered) >= Number(item.quantity) ? 'text-green-600' : Number(item.qtyDelivered) > 0 ? 'text-amber-600' : '')}>
                                {item.qtyDelivered || 0}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {item.pickedAt && format(new Date(item.pickedAt), 'PP')}
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
                    description="Complete history of order changes, status updates, and system events"
                    showFilters={true}
                    emptyMessage="No activity recorded yet"
                    emptyDescription="Order activities will appear here when changes are made."
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
                  <RightMetaPanel order={order} />
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

export default OrderDetailView;
