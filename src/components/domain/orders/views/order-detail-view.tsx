/**
 * Order Detail View (Presenter)
 *
 * Clean, focused layout following DETAIL-VIEW-STANDARDS.md
 *
 * Zone 1: Header (title, status, metrics)
 * Zone 2: Progress (fulfillment stages)
 * Zone 3: Alerts (payment overdue, etc.)
 * Zone 4: Tabs (Overview, Items, Fulfillment, Activity)
 * Zone 5: Main + Sidebar
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo, useMemo, useCallback, Suspense, lazy } from 'react';
import { useAlertDismissals, generateAlertId } from '@/hooks/_shared/use-alert-dismissals';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/_shared/use-reduced-motion';
import {
  Package,
  FileText,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  PanelRight,
  Phone,
  Receipt,
  Calendar,
  Link2,
  ArrowRight,
  Shield,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import type { OrderStatus } from '@/lib/schemas/orders';
import type { OrderWithCustomer } from '@/hooks/orders/use-order-detail';
import type { OrderAlert } from '@/hooks/orders/use-order-detail-composite';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import { Link } from '@tanstack/react-router';
import type { FulfillmentActions } from '../tabs/order-fulfillment-tab';
import { ORDER_STATUS_DETAIL_CONFIG } from '../order-status-config';
import { OrderAlerts } from '../alerts/order-alerts';
import { MobileSidebarSheet } from '../components/mobile-sidebar-sheet';
import { InvoiceLink } from '../invoice-link';

// Lazy-loaded tabs for code splitting (per DETAIL-VIEW-STANDARDS.md)
const OrderOverviewTab = lazy(() => import('../tabs/order-overview-tab'));
const OrderItemsTab = lazy(() => import('../tabs/order-items-tab'));
const OrderFulfillmentTab = lazy(() => import('../tabs/order-fulfillment-tab'));
const OrderActivityTab = lazy(() => import('../tabs/order-activity-tab'));
const OrderDocumentsTab = lazy(() => import('../tabs/order-documents-tab'));
const OrderPaymentsTab = lazy(() => import('../tabs/order-payments-tab'));

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentActions {
  onGenerateQuote: () => Promise<void>;
  onGenerateInvoice: () => Promise<void>;
  onGeneratePackingSlip: () => Promise<void>;
  onGenerateDeliveryNote: () => Promise<void>;
  isGeneratingQuote: boolean;
  isGeneratingInvoice: boolean;
  isGeneratingPackingSlip: boolean;
  isGeneratingDeliveryNote: boolean;
  // Generated URLs (for immediate download after generation)
  packingSlipUrl?: string;
  deliveryNoteUrl?: string;
}

export interface OrderDetailViewProps {
  order: OrderWithCustomer;
  alerts?: OrderAlert[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  headerActions?: React.ReactNode;
  documentActions?: DocumentActions;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  /** Handler to open follow-up scheduling dialog */
  onScheduleFollowUp?: () => void;
  /** Fulfillment workflow actions (pick, ship, deliver) */
  fulfillmentActions?: FulfillmentActions;
  /** Payment handlers */
  paymentActions?: {
    payments: import('@/lib/schemas/orders').Payment[];
    summary: import('@/lib/schemas/orders').PaymentSummary;
    onRecordPayment: () => void;
    onRefundPayment?: (paymentId: string) => void;
  };
  /** Banner for Create RMA from issue flow (Zone 3) */
  fromIssueBanner?: React.ReactNode;
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

const FULFILLMENT_STAGES = ['confirmed', 'picking', 'picked', 'shipped', 'delivered'] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
// TAB LOADING FALLBACK
// ============================================================================

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
// MAIN COMPONENT
// ============================================================================

export const OrderDetailView = memo(function OrderDetailView({
  order,
  alerts = [],
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  headerActions,
  documentActions,
  onLogActivity,
  onScheduleFollowUp,
  fulfillmentActions,
  paymentActions,
  fromIssueBanner,
  className,
}: OrderDetailViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const statusConfig = ORDER_STATUS_DETAIL_CONFIG[order.status as OrderStatus] ?? ORDER_STATUS_DETAIL_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus as string] ?? PAYMENT_STATUS_CONFIG.pending;
  const itemsCount = useMemo(() => order.lineItems?.length ?? 0, [order.lineItems]);
  const fulfillmentPercent = calculateFulfillmentPercent(order.lineItems);
  const paymentPercent = Number(order.total) > 0 ? Math.round((Number(order.paidAmount || 0) / Number(order.total)) * 100) : 0;

  // Alert dismissal persistence (24h TTL in localStorage)
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  // Filter out dismissed alerts
  const visibleAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const alertId = generateAlertId('order', order.id, alert.type);
      return !isAlertDismissed(alertId);
    });
  }, [alerts, order.id, isAlertDismissed]);

  // Handle alert dismissal
  const handleDismissAlert = useCallback(
    (alertId: string) => {
      // Find the alert to get its type
      const alert = alerts.find((a) => a.id === alertId);
      if (alert) {
        const persistentId = generateAlertId('order', order.id, alert.type);
        dismiss(persistentId);
      }
    },
    [alerts, order.id, dismiss]
  );

  // Tab prefetch handlers (trigger dynamic import on hover/focus)
  const handlePrefetchOverview = useCallback(() => {
    import('../tabs/order-overview-tab');
  }, []);
  const handlePrefetchItems = useCallback(() => {
    import('../tabs/order-items-tab');
  }, []);
  const handlePrefetchFulfillment = useCallback(() => {
    import('../tabs/order-fulfillment-tab');
  }, []);
  const handlePrefetchActivity = useCallback(() => {
    import('../tabs/order-activity-tab');
  }, []);
  const handlePrefetchDocuments = useCallback(() => {
    import('../tabs/order-documents-tab');
  }, []);
  const handlePrefetchPayments = useCallback(() => {
    import('../tabs/order-payments-tab');
  }, []);

  const balanceDue = Number(order.balanceDue || 0);
  const currentStageIndex = FULFILLMENT_STAGES.indexOf(order.status as typeof FULFILLMENT_STAGES[number]);

  return (
    <div className={cn('min-h-screen bg-muted/30', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ================================================================ */}
        {/* ZONE 1: HEADER                                                   */}
        {/* ================================================================ */}
        <header className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left: Title + Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
                    <Badge className={cn('gap-1', statusConfig.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                    <Badge className={paymentConfig.color}>
                      {paymentConfig.label}
                    </Badge>
                  </div>
                  {order.customer && (
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: order.customerId }}
                      search={{}}
                      className="text-muted-foreground mt-1 hover:underline hover:text-foreground block"
                    >
                      {order.customer.name}
                    </Link>
                  )}
                </div>
              </div>
              {/* Meta row */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(order.orderDate), 'PP')}
                </span>
                {order.dueDate && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Due {format(new Date(order.dueDate), 'PP')}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Package className="h-4 w-4" />
                  {itemsCount} items
                </span>
              </div>
            </div>

            {/* Right: Metrics + Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Key Metrics */}
              <div className="flex items-center gap-6 px-4 py-3 bg-background rounded-lg border">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="text-lg font-semibold tabular-nums">
                    <FormatAmount amount={Number(order.total)} />
                  </p>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Balance</p>
                  <p className={cn(
                    'text-lg font-semibold tabular-nums',
                    balanceDue === 0 ? 'text-green-600' : order.paymentStatus === 'overdue' ? 'text-destructive' : ''
                  )}>
                    <FormatAmount amount={balanceDue} />
                  </p>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Paid</p>
                  <p className={cn(
                    'text-lg font-semibold tabular-nums',
                    paymentPercent === 100 && 'text-green-600'
                  )}>
                    {paymentPercent}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {headerActions}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                        onClick={() => copyToClipboard(window.location.href)}
                        aria-label="Copy link to clipboard"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy link</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn('h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0', showMetaPanel && 'bg-accent')}
                        onClick={onToggleMetaPanel}
                        aria-label="Toggle sidebar panel"
                      >
                        <PanelRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} sidebar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </header>

        {/* ================================================================ */}
        {/* ZONE 2: PROGRESS INDICATOR                                       */}
        {/* ================================================================ */}
        {order.status !== 'draft' && order.status !== 'cancelled' && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Fulfillment Progress</span>
                <span className="text-sm text-muted-foreground">{fulfillmentPercent}% delivered</span>
              </div>
              <div className="flex items-center gap-2">
                {FULFILLMENT_STAGES.map((stage, index) => {
                  const stageConfig = ORDER_STATUS_DETAIL_CONFIG[stage];
                  const isComplete = index <= currentStageIndex;
                  const isCurrent = index === currentStageIndex;

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
                          {stageConfig.label}
                        </span>
                      </div>
                      {index < FULFILLMENT_STAGES.length - 1 && (
                        <div
                          className={cn(
                            'h-0.5 flex-1 -mt-5',
                            index < currentStageIndex ? 'bg-primary' : 'bg-muted'
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
        {/* TERMINAL STATE: Next steps when order is delivered               */}
        {/* ================================================================ */}
        {order.status === 'delivered' && (
          <section className="mb-6 rounded-lg border bg-muted/50 p-4" aria-label="Next steps">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-success/10 p-2">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Order delivered</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This order has been delivered. Here are some suggested next steps:
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {documentActions ? (
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        void documentActions.onGenerateInvoice();
                      }}
                      disabled={documentActions.isGeneratingInvoice}
                    >
                      {documentActions.isGeneratingInvoice ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Receipt className="h-4 w-4" />
                      )}
                      Generate Invoice
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Link
                      to="/financial/invoices"
                      className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-2')}
                    >
                      <Receipt className="h-4 w-4" />
                      Invoices
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                  <Link
                    to="/support/warranties"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                  >
                    <Shield className="h-4 w-4" />
                    Create Warranty
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  {order.customerId && (
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: order.customerId }}
                      search={{}}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                    >
                      <User className="h-4 w-4" />
                      View Customer
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* ZONE 3: ALERTS                                                   */}
        {/* ================================================================ */}
        {(visibleAlerts.length > 0 || fromIssueBanner) && (
          <div className="mb-6 space-y-3">
            {fromIssueBanner}
            {visibleAlerts.length > 0 && (
              <OrderAlerts alerts={visibleAlerts} onDismiss={handleDismissAlert} />
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* ZONE 4 + 5: TABS + MAIN + SIDEBAR                                */}
        {/* ================================================================ */}
        <div
          className={cn(
            'grid gap-6',
            showMetaPanel ? 'lg:grid-cols-[1fr_320px]' : 'grid-cols-1'
          )}
        >
          {/* Main Content */}
          <div className="min-w-0">
            <Card>
              <Tabs value={activeTab} onValueChange={onTabChange}>
                <CardHeader className="pb-0">
                  <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b rounded-none">
                    <TabsTrigger
                      value="overview"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                      onMouseEnter={handlePrefetchOverview}
                      onFocus={handlePrefetchOverview}
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="items"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                      onMouseEnter={handlePrefetchItems}
                      onFocus={handlePrefetchItems}
                    >
                      Items ({itemsCount})
                    </TabsTrigger>
                    <TabsTrigger
                      value="fulfillment"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                      onMouseEnter={handlePrefetchFulfillment}
                      onFocus={handlePrefetchFulfillment}
                    >
                      Fulfillment
                    </TabsTrigger>
                    <TabsTrigger
                      value="activity"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                      onMouseEnter={handlePrefetchActivity}
                      onFocus={handlePrefetchActivity}
                    >
                      Activity
                    </TabsTrigger>
                    <TabsTrigger
                      value="documents"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                      onMouseEnter={handlePrefetchDocuments}
                      onFocus={handlePrefetchDocuments}
                    >
                      Documents
                    </TabsTrigger>
                    <TabsTrigger
                      value="payments"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                      onMouseEnter={handlePrefetchPayments}
                      onFocus={handlePrefetchPayments}
                    >
                      Payments ({paymentActions?.payments?.length ?? 0})
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="pt-6">
                  {/* Tab Content - Lazy loaded with Suspense */}
                  <TabsContent value="overview" className="mt-0">
                    {activeTab === 'overview' && (
                      <Suspense fallback={<TabSkeleton />}>
                        <OrderOverviewTab order={order} paymentPercent={paymentPercent} />
                      </Suspense>
                    )}
                  </TabsContent>

                  <TabsContent value="items" className="mt-0">
                    {activeTab === 'items' && (
                      <Suspense fallback={<TabSkeleton />}>
                        <OrderItemsTab lineItems={order.lineItems} />
                      </Suspense>
                    )}
                  </TabsContent>

                  <TabsContent value="fulfillment" className="mt-0">
                    {activeTab === 'fulfillment' && (
                      <Suspense fallback={<TabSkeleton />}>
                        <OrderFulfillmentTab
                          lineItems={order.lineItems}
                          orderId={order.id}
                          orderStatus={order.status}
                          fulfillmentActions={fulfillmentActions}
                        />
                      </Suspense>
                    )}
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0">
                    {activeTab === 'activity' && (
                      <Suspense fallback={<TabSkeleton />}>
                        <OrderActivityTab
                          activities={activities}
                          isLoading={activitiesLoading}
                          error={activitiesError}
                          onLogActivity={onLogActivity}
                          onScheduleFollowUp={onScheduleFollowUp}
                        />
                      </Suspense>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="mt-0">
                    {activeTab === 'documents' && (
                      <Suspense fallback={<TabSkeleton />}>
                        <OrderDocumentsTab orderId={order.id} />
                      </Suspense>
                    )}
                  </TabsContent>

                  <TabsContent value="payments" className="mt-0">
                    {activeTab === 'payments' && paymentActions && (
                      <Suspense fallback={<TabSkeleton />}>
                        <OrderPaymentsTab
                          payments={paymentActions.payments}
                          summary={paymentActions.summary}
                          orderTotal={Number(order.total)}
                          balanceDue={Number(order.balanceDue || 0)}
                          onRecordPayment={paymentActions.onRecordPayment}
                          onRefundPayment={paymentActions.onRefundPayment}
                        />
                      </Suspense>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <AnimatePresence initial={false}>
            {showMetaPanel && (
              <motion.aside
                initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: prefersReducedMotion ? 0 : 20 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                className="hidden lg:block"
              >
                <Card className="sticky top-6">
                  <CardContent className="p-5 space-y-6">
                    {/* Customer */}
                    {order.customer && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                          Customer
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {order.customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to="/customers/$customerId"
                              params={{ customerId: order.customerId }}
                              search={{}}
                              className="font-medium truncate hover:underline block"
                            >
                              {order.customer.name}
                            </Link>
                            {order.customer.email && (
                              <p className="text-xs text-muted-foreground truncate">
                                {order.customer.email}
                              </p>
                            )}
                          </div>
                        </div>
                        {order.customer.phone && (
                          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3" />
                            {order.customer.phone}
                          </p>
                        )}
                      </div>
                    )}

                    <Separator />

                    {/* Documents */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Documents
                      </h4>
                      <div className="space-y-2">
                        {/* Quote */}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            Quote
                          </span>
                          {order.quotePdfUrl ? (
                            <a
                              href={order.quotePdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </a>
                          ) : documentActions ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={documentActions.onGenerateQuote}
                              disabled={documentActions.isGeneratingQuote}
                            >
                              {documentActions.isGeneratingQuote ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Generating...
                                </>
                              ) : 'Generate'}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>

                        {/* Invoice */}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            Invoice
                          </span>
                          <InvoiceLink
                            orderId={order.id}
                            invoiceNumber={order.invoiceNumber}
                            invoicePdfUrl={order.invoicePdfUrl}
                            onGenerateInvoice={documentActions?.onGenerateInvoice}
                            isGenerating={documentActions?.isGeneratingInvoice}
                          />
                        </div>

                        {/* Packing Slip */}
                        {documentActions && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              Packing Slip
                            </span>
                            {documentActions.packingSlipUrl ? (
                              <a
                                href={documentActions.packingSlipUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </a>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={documentActions.onGeneratePackingSlip}
                                disabled={documentActions.isGeneratingPackingSlip}
                              >
                                {documentActions.isGeneratingPackingSlip ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Generating...
                                  </>
                                ) : 'Generate'}
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Delivery Note */}
                        {documentActions && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              Delivery Note
                            </span>
                            {documentActions.deliveryNoteUrl ? (
                              <a
                                href={documentActions.deliveryNoteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </a>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={documentActions.onGenerateDeliveryNote}
                                disabled={documentActions.isGeneratingDeliveryNote}
                              >
                                {documentActions.isGeneratingDeliveryNote ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Generating...
                                  </>
                                ) : 'Generate'}
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Xero Link */}
                        {order.xeroInvoiceUrl && (
                          <a
                            href={order.xeroInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:underline mt-3"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View in Xero
                          </a>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Key Dates */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Key Dates
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created</span>
                          <span>{format(new Date(order.createdAt), 'PP')}</span>
                        </div>
                        {order.dueDate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Due Date</span>
                            <span>{format(new Date(order.dueDate), 'PP')}</span>
                          </div>
                        )}
                        {order.shippedDate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Shipped</span>
                            <span>{format(new Date(order.shippedDate), 'PP')}</span>
                          </div>
                        )}
                        {order.deliveredDate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Delivered</span>
                            <span className="text-green-600">
                              {format(new Date(order.deliveredDate), 'PP')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Audit */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Audit
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Updated</span>
                          <span>{format(new Date(order.updatedAt), 'PP')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Version</span>
                          <span>v{order.version}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Sidebar Sheet */}
        <MobileSidebarSheet title="Order Details">
          <div className="space-y-6">
            {order.customer && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Customer
                </h4>
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: order.customerId }}
                  search={{}}
                  className="font-medium hover:underline block"
                >
                  {order.customer.name}
                </Link>
                {order.customer.email && (
                  <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                )}
              </div>
            )}
            <Separator />
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Key Dates
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(order.createdAt), 'PP')}</span>
                </div>
                {order.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due</span>
                    <span>{format(new Date(order.dueDate), 'PP')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </MobileSidebarSheet>
      </div>
    </div>
  );
});

export default OrderDetailView;
