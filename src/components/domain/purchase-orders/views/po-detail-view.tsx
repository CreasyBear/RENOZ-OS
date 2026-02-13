/**
 * Purchase Order Detail View (Presenter)
 *
 * Follows DETAIL-VIEW-STANDARDS.md 5-zone layout:
 * Zone 1: Header (identity, status, metrics, actions)
 * Zone 2: Progress (PO lifecycle stages)
 * Zone 3: Alerts (overdue, urgent required date)
 * Zone 4: Tabs (Overview, Items, Costs, Receiving, Receipts, Activity)
 * Zone 5: Main content + Sidebar
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see src/components/domain/orders/views/order-detail-view.tsx
 */

import { memo, useMemo, useCallback, Suspense, lazy, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { format, formatDistanceToNow, isPast, isBefore, addDays } from 'date-fns';
import {
  Package,
  Clock,
  PanelRight,
  Hash,
  Phone,
  Link2,
  Calendar,
  Tag,
  Building,
  ClipboardList,
  CheckCircle,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EntityHeader } from '@/components/shared';
import type {
  PurchaseOrderItem,
  PurchaseOrderWithDetails,
  PODetailViewProps,
} from '@/lib/schemas/purchase-orders';
import { PO_STATUS_CONFIG, PO_STATUS_CONFIG_FOR_ENTITY_HEADER } from '../po-status-config';
import { POAlerts } from '../alerts/po-alerts';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy-loaded tabs for code splitting (per DETAIL-VIEW-STANDARDS.md)
const POOverviewTab = lazy(() => import('../tabs/po-overview-tab').then(m => ({ default: m.POOverviewTab })));
const POItemsTab = lazy(() => import('../tabs/po-items-tab').then(m => ({ default: m.POItemsTab })));
const POCostsTab = lazy(() => import('../tabs/po-costs-tab').then(m => ({ default: m.POCostsTab })));
const POReceivingTab = lazy(() => import('../tabs/po-receiving-tab').then(m => ({ default: m.POReceivingTab })));
const POReceiptsTab = lazy(() => import('../tabs/po-receipts-tab').then(m => ({ default: m.POReceiptsTab })));
const POActivityTab = lazy(() => import('../tabs/po-activity-tab').then(m => ({ default: m.POActivityTab })));
import { MobileSidebarSheet } from '@/components/shared/mobile-sidebar-sheet';
import { FALLBACK_SUPPLIER_NAME } from '@/lib/constants/procurement';

// ============================================================================
// LOCAL CONFIGURATIONS
// ============================================================================

/** PO lifecycle stages for Zone 2 progress bar (per DETAIL-VIEW-STANDARDS) */
const PO_LIFECYCLE_STAGES = [
  'draft',
  'pending_approval',
  'approved',
  'ordered',
  'partial_received',
  'received',
  'closed',
] as const;

// ============================================================================
// HELPER FUNCTIONS (used by header and lifecycle progress)
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
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  headerConfig?: PODetailViewProps['headerConfig'];
}

function POHeader({ po, showMetaPanel, onToggleMetaPanel, headerConfig }: POHeaderProps) {
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

  if (headerConfig) {
    return (
      <section className="space-y-4">
        <EntityHeader
          name={po.poNumber}
          subtitle={po.supplierName ?? undefined}
          avatarFallback="PO"
          status={{
            value: po.status,
            config: PO_STATUS_CONFIG_FOR_ENTITY_HEADER,
          }}
          primaryAction={headerConfig.primaryAction}
          secondaryActions={headerConfig.secondaryActions}
          onEdit={headerConfig.onEdit}
          onDelete={headerConfig.onDelete}
        />
        {/* Overdue/urgent surfaced in Zone 3 (POAlerts) */}
        <MetaChipsRow items={metaItems} />
      </section>
    );
  }

  const statusConfig = PO_STATUS_CONFIG[po.status] ?? PO_STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon ?? Clock;
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
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" onClick={() => navigator.clipboard.writeText(window.location.href)} aria-label="Copy link">
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
                  className={cn('h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0', showMetaPanel && 'bg-muted')}
                  onClick={onToggleMetaPanel}
                  aria-label={showMetaPanel ? 'Hide details panel' : 'Show details panel'}
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {/* Overdue/urgent surfaced in Zone 3 (POAlerts) */}
      <MetaChipsRow items={metaItems} />
    </section>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-4 pt-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-[200px] w-full" />
      <Skeleton className="h-[200px] w-full" />
    </div>
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
      {(po.supplierName || po.supplierId) && (
        <>
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Supplier</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {(po.supplierName || FALLBACK_SUPPLIER_NAME).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                {po.supplierId ? (
                  <Link
                    to="/suppliers/$supplierId"
                    params={{ supplierId: po.supplierId }}
                    className="text-sm font-medium truncate block text-primary hover:underline"
                  >
                    {po.supplierName || FALLBACK_SUPPLIER_NAME}
                  </Link>
                ) : (
                  <div className="text-sm font-medium truncate">{po.supplierName || FALLBACK_SUPPLIER_NAME}</div>
                )}
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

const STAGE_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  ordered: 'Ordered',
  partial_received: 'Receiving',
  received: 'Received',
  closed: 'Closed',
};

export const PODetailView = memo(function PODetailView({
  po,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  headerConfig,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  onLogActivity,
  alerts = [],
  onDismissAlert,
}: PODetailViewProps) {
  const itemsCount = useMemo(() => po.items?.length ?? 0, [po.items]);
  const receivingPercent = useMemo(() => calculateReceivingPercent(po.items), [po.items]);

  const currentStageIndex = PO_LIFECYCLE_STAGES.indexOf(po.status as (typeof PO_LIFECYCLE_STAGES)[number]);
  const effectiveStageIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  const handlePrefetchCosts = useCallback(() => {
    import('../tabs/po-costs-tab').catch(() => {});
  }, []);
  const handlePrefetchReceipts = useCallback(() => {
    import('../tabs/po-receipts-tab').catch(() => {});
  }, []);

  return (
    <div className={cn(
      'grid grid-cols-1 gap-6',
      showMetaPanel && 'lg:grid-cols-[1fr_320px]'
    )}>
      {/* Primary Content */}
      <div className="space-y-6">
        {/* ================================================================ */}
        {/* ZONE 1: HEADER                                                   */}
        {/* ================================================================ */}
        <POHeader
          po={po}
          showMetaPanel={showMetaPanel}
          onToggleMetaPanel={onToggleMetaPanel}
          headerConfig={headerConfig}
        />

        {/* ================================================================ */}
        {/* ZONE 2: PROGRESS INDICATOR                                       */}
        {/* ================================================================ */}
        {po.status !== 'cancelled' && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">PO Progress</span>
                <span className="text-sm text-muted-foreground">{receivingPercent}% received</span>
              </div>
              <div className="flex items-center gap-2">
                {PO_LIFECYCLE_STAGES.map((stage, index) => {
                  const isComplete = index <= effectiveStageIndex;
                  const isCurrent = index === effectiveStageIndex;

                  return (
                    <div key={stage} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium mb-1',
                            isComplete
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {isComplete ? <CheckCircle className="h-4 w-4" /> : index + 1}
                        </div>
                        <span
                          className={cn(
                            'text-xs',
                            isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {STAGE_LABELS[stage] ?? stage}
                        </span>
                      </div>
                      {index < PO_LIFECYCLE_STAGES.length - 1 && (
                        <div
                          className={cn(
                            'h-0.5 flex-1 -mt-5',
                            index < effectiveStageIndex ? 'bg-primary' : 'bg-muted'
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================================================================ */}
        {/* ZONE 3: ALERTS                                                   */}
        {/* ================================================================ */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <POAlerts alerts={alerts} onDismiss={onDismissAlert} />
          </div>
        )}

        {/* Terminal state: next steps when PO is received or closed */}
        {(po.status === 'received' || po.status === 'closed') && (
          <section className="mb-6 rounded-lg border bg-muted/50 p-4" aria-label="Next steps">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-success/10 p-2">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    {po.status === 'closed' ? 'PO closed' : 'PO received'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {po.status === 'closed'
                      ? 'This purchase order has been closed. Here are some suggested next steps:'
                      : 'All items have been received. Here are some suggested next steps:'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="default" size="sm" onClick={() => onTabChange('receipts')} className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    View Receipts
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Link
                    to="/purchase-orders/create"
                    search={po.supplierId ? { supplierId: po.supplierId } : undefined}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                  >
                    <FileText className="h-4 w-4" />
                    Create next PO
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  {po.supplierId && (
                    <Link
                      to="/suppliers/$supplierId"
                      params={{ supplierId: po.supplierId }}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                    >
                      <Building className="h-4 w-4" />
                      View Supplier
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* ZONE 4 + 5: TABS + MAIN + SIDEBAR                                */}
        {/* ================================================================ */}
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
              Overview
            </TabsTrigger>
            <TabsTrigger value="items" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
              Items ({itemsCount})
            </TabsTrigger>
            <TabsTrigger
              value="costs"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              onMouseEnter={handlePrefetchCosts}
              onFocus={handlePrefetchCosts}
            >
              Costs
            </TabsTrigger>
            <TabsTrigger value="receiving" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
              Receiving
            </TabsTrigger>
            <TabsTrigger
              value="receipts"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
              onMouseEnter={handlePrefetchReceipts}
              onFocus={handlePrefetchReceipts}
            >
              Receipts
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3">
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Tab Content - Lazy loaded with Suspense */}
          <TabsContent value="overview" className="mt-0">
            {activeTab === 'overview' && (
              <Suspense fallback={<TabSkeleton />}>
                <POOverviewTab po={po} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="items" className="mt-0">
            {activeTab === 'items' && (
              <Suspense fallback={<TabSkeleton />}>
                <POItemsTab items={po.items ?? []} currency={po.currency} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="costs" className="mt-0">
            {activeTab === 'costs' && (
              <Suspense fallback={<TabSkeleton />}>
                <POCostsTab
                  poId={po.id}
                  poStatus={po.status}
                  totalPOValue={Number(po.totalAmount ?? 0)}
                  poCurrency={po.currency}
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="receiving" className="mt-0">
            {activeTab === 'receiving' && (
              <Suspense fallback={<TabSkeleton />}>
                <POReceivingTab items={po.items ?? []} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="receipts" className="mt-0">
            {activeTab === 'receipts' && (
              <Suspense fallback={<TabSkeleton />}>
                <POReceiptsTab poId={po.id} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            {activeTab === 'activity' && (
              <Suspense fallback={<TabSkeleton />}>
                <POActivityTab
                  activities={activities}
                  isLoading={activitiesLoading}
                  error={activitiesError}
                  onLogActivity={onLogActivity}
                />
              </Suspense>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Zone 5B: Sidebar (desktop) */}
      {showMetaPanel && (
        <aside className="hidden lg:block border-l pl-6">
          <RightMetaPanel po={po} />
        </aside>
      )}

      {/* Mobile Sidebar FAB (per DETAIL-VIEW-STANDARDS) */}
      <MobileSidebarSheet title="PO Details" ariaLabel="Show PO details">
        <RightMetaPanel po={po} />
      </MobileSidebarSheet>
    </div>
  );
});

export default PODetailView;
