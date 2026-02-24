/**
 * Invoice Detail View (Presenter)
 *
 * Clean, focused layout following DETAIL-VIEW-STANDARDS.md
 *
 * Zone 1: Header (title, status, metrics)
 * Zone 2: Progress (invoice lifecycle stages)
 * Zone 3: Alerts (overdue, payment reminders)
 * Zone 4: Tabs (Overview, Items, Payments, Activity)
 * Zone 5: Main + Sidebar
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { memo, useMemo, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/_shared/use-reduced-motion';
import { useAlertDismissals, generateAlertId } from '@/hooks/_shared/use-alert-dismissals';
import {
  Receipt,
  CheckCircle,
  Clock,
  Calendar,
  Link2,
  PanelRight,
  User,
  Package,
  AlertTriangle,
  X,
  ArrowRight,
  History,
  Plus,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { getActivitiesFeedSearch } from '@/lib/activities';
import { InvoiceStatusBadge } from '../invoice-status-badge';
import { MobileSidebarSheet } from '@/components/shared/mobile-sidebar-sheet';
import { UnifiedActivityTimeline } from '@/components/shared/activity';
import {
  INVOICE_STATUS_CONFIG,
  type InvoiceStatus,
} from '@/lib/constants/invoice-status';
import type { InvoiceDetail } from '@/hooks/invoices/use-invoices';
import type { InvoiceAlert } from '@/hooks/invoices/use-invoice-detail';

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceDetailViewProps {
  invoice: InvoiceDetail;
  alerts?: InvoiceAlert[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  headerActions?: React.ReactNode;
  activities?: import('@/lib/schemas/unified-activity').UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INVOICE_LIFECYCLE_STAGES = [
  { key: 'draft', label: 'Draft' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'unpaid', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function getStageIndex(status: InvoiceStatus): number {
  switch (status) {
    case 'draft':
      return 0;
    case 'scheduled':
      return 1;
    case 'unpaid':
    case 'overdue':
      return 2;
    case 'paid':
    case 'refunded':
      return 3;
    case 'canceled':
      return -1; // Special handling
    default:
      return 0;
  }
}

// ============================================================================
// ALERT COMPONENT
// ============================================================================

interface InvoiceAlertsProps {
  alerts: InvoiceAlert[];
  onDismiss: (id: string) => void;
}

const InvoiceAlerts = memo(function InvoiceAlerts({
  alerts,
  onDismiss,
}: InvoiceAlertsProps) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2 mb-6">
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={alert.severity === 'critical' ? 'destructive' : 'default'}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            {alert.title}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2"
              onClick={() => onDismiss(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{alert.message}</span>
            {alert.action && (
              <Button
                variant="outline"
                size="sm"
                className="ml-4"
                onClick={alert.action.onClick}
              >
                {alert.action.label}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const InvoiceDetailView = memo(function InvoiceDetailView({
  invoice,
  alerts = [],
  activeTab,
  onTabChange,
  showSidebar,
  onToggleSidebar,
  headerActions,
  activities = [],
  activitiesLoading = false,
  activitiesError = null,
  onLogActivity,
  className,
}: InvoiceDetailViewProps) {
  const prefersReducedMotion = useReducedMotion();
  // Handle null invoiceStatus - default to 'draft' for invoices without status set
  // This is valid per schema: invoiceStatus is nullable (InvoiceStatus | null)
  const status: InvoiceStatus = invoice.invoiceStatus ?? 'draft';
  const statusConfig = INVOICE_STATUS_CONFIG[status];

  // Alert dismissal persistence
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  // Filter dismissed alerts
  const visibleAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const alertId = generateAlertId('invoice', invoice.id, alert.type);
      return !isAlertDismissed(alertId);
    });
  }, [alerts, invoice.id, isAlertDismissed]);

  // Handle alert dismissal
  const handleDismissAlert = useCallback(
    (alertId: string) => {
      const alert = alerts.find((a) => a.id === alertId);
      if (alert) {
        const persistentId = generateAlertId('invoice', invoice.id, alert.type);
        dismiss(persistentId);
      }
    },
    [alerts, invoice.id, dismiss]
  );

  // Calculations
  const total = Number(invoice.total || 0);
  const balanceDue = Number(invoice.balanceDue || 0);
  const paidAmount = total - balanceDue;
  const paidPercent = total > 0 ? Math.round((paidAmount / total) * 100) : 0;
  const itemsCount = invoice.lineItems?.length ?? 0;
  const currentStageIndex = getStageIndex(status);

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
                  <Receipt className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold">
                      {invoice.invoiceNumber || invoice.orderNumber}
                    </h1>
                    <InvoiceStatusBadge status={status} />
                  </div>
                  {invoice.customer && (
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: invoice.customer.id }}
                      search={{}}
                      className="text-muted-foreground hover:text-foreground hover:underline mt-1 inline-block"
                    >
                      {invoice.customer.name}
                    </Link>
                  )}
                </div>
              </div>
              {/* Meta row */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Issued {invoice.orderDate ? format(new Date(invoice.orderDate), 'PP') : '—'}
                </span>
                {invoice.invoiceDueDate && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Due {format(new Date(invoice.invoiceDueDate), 'PP')}
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
                    <FormatAmount amount={total} />
                  </p>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Balance</p>
                  <p
                    className={cn(
                      'text-lg font-semibold tabular-nums',
                      balanceDue === 0
                        ? 'text-green-600'
                        : status === 'overdue'
                          ? 'text-destructive'
                          : ''
                    )}
                  >
                    <FormatAmount amount={balanceDue} />
                  </p>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Paid</p>
                  <p
                    className={cn(
                      'text-lg font-semibold tabular-nums',
                      paidPercent === 100 && 'text-green-600'
                    )}
                  >
                    {paidPercent}%
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
                        className={cn('h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0', showSidebar && 'bg-accent')}
                        onClick={onToggleSidebar}
                        aria-label="Toggle sidebar panel"
                      >
                        <PanelRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {showSidebar ? 'Hide' : 'Show'} sidebar
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </header>

        {/* ================================================================ */}
        {/* ZONE 2: PROGRESS INDICATOR                                       */}
        {/* ================================================================ */}
        {status !== 'canceled' && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Invoice Progress</span>
                <span className="text-sm text-muted-foreground">
                  {statusConfig.description}
                </span>
              </div>
              <div
                className="flex items-center gap-2"
                role="progressbar"
                aria-valuenow={currentStageIndex + 1}
                aria-valuemin={1}
                aria-valuemax={INVOICE_LIFECYCLE_STAGES.length}
                aria-label={`Invoice progress: Stage ${currentStageIndex + 1} of ${INVOICE_LIFECYCLE_STAGES.length} - ${statusConfig.label}`}
              >
                {INVOICE_LIFECYCLE_STAGES.map((stage, index) => {
                  const isComplete = index <= currentStageIndex;
                  const isCurrent = index === currentStageIndex;

                  return (
                    <div key={stage.key} className="flex-1 flex items-center">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium mb-1',
                            isComplete
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {isComplete ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-xs',
                            isCurrent
                              ? 'font-medium text-foreground'
                              : 'text-muted-foreground'
                          )}
                        >
                          {stage.label}
                        </span>
                      </div>
                      {index < INVOICE_LIFECYCLE_STAGES.length - 1 && (
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
        {/* TERMINAL STATE: Next steps when invoice is paid                  */}
        {/* ================================================================ */}
        {(status === 'paid' || status === 'refunded') && (
          <section className="mb-6 rounded-lg border bg-muted/50 p-4" aria-label="Next steps">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-success/10 p-2">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    {status === 'paid' ? 'Invoice paid' : 'Invoice refunded'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {status === 'paid'
                      ? 'Payment received. Here are some suggested next steps:'
                      : 'Refund processed. Here are some suggested next steps:'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTabChange('payments')}
                    className="gap-2"
                  >
                    <History className="h-4 w-4" />
                    View payment history
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  {invoice.customer?.id && (
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: invoice.customer.id }}
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
        <InvoiceAlerts alerts={visibleAlerts} onDismiss={handleDismissAlert} />

        {/* ================================================================ */}
        {/* ZONE 4 + 5: TABS + MAIN + SIDEBAR                                */}
        {/* ================================================================ */}
        <div
          className={cn(
            'grid gap-6',
            showSidebar ? 'lg:grid-cols-[1fr_320px]' : 'grid-cols-1'
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
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="items"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                    >
                      Items ({itemsCount})
                    </TabsTrigger>
                    <TabsTrigger
                      value="payments"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                    >
                      Payments
                    </TabsTrigger>
                    <TabsTrigger
                      value="activity"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                    >
                      Activity
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="pt-6">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="mt-0">
                    <div className="space-y-6">
                      {/* Summary Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Invoice Number
                          </p>
                          <p className="font-medium">
                            {invoice.invoiceNumber || invoice.orderNumber}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Issue Date
                          </p>
                          <p className="font-medium">
                            {invoice.orderDate
                              ? format(new Date(invoice.orderDate), 'PP')
                              : '—'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Due Date
                          </p>
                          <p className="font-medium">
                            {invoice.invoiceDueDate
                              ? format(new Date(invoice.invoiceDueDate), 'PP')
                              : '—'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Payment Status
                          </p>
                          <p className="font-medium capitalize">
                            {invoice.paymentStatus || 'Pending'}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* Financial Summary */}
                      <div>
                        <h3 className="text-sm font-medium mb-4">
                          Financial Summary
                        </h3>
                        <div className="flex justify-end">
                          <div className="w-72 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Subtotal
                              </span>
                              <span className="tabular-nums">
                                <FormatAmount
                                  amount={Number(invoice.subtotal || 0)}
                                />
                              </span>
                            </div>
                            {Number(invoice.discountAmount || 0) > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Discount
                                </span>
                                <span className="tabular-nums text-green-600">
                                  -
                                  <FormatAmount
                                    amount={Number(invoice.discountAmount)}
                                  />
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tax</span>
                              <span className="tabular-nums">
                                <FormatAmount
                                  amount={Number(invoice.taxAmount || 0)}
                                />
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-medium">
                              <span>Total</span>
                              <span className="tabular-nums">
                                <FormatAmount amount={total} />
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Amount Paid
                              </span>
                              <span className="tabular-nums text-green-600">
                                <FormatAmount amount={paidAmount} />
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-semibold text-lg">
                              <span>Balance Due</span>
                              <span
                                className={cn(
                                  'tabular-nums',
                                  balanceDue === 0
                                    ? 'text-green-600'
                                    : status === 'overdue'
                                      ? 'text-destructive'
                                      : ''
                                )}
                              >
                                <FormatAmount amount={balanceDue} />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {(invoice.customerNotes || invoice.internalNotes) && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="text-sm font-medium mb-2">Notes</h3>
                            {invoice.customerNotes && (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">
                                {invoice.customerNotes}
                              </p>
                            )}
                            {invoice.internalNotes && (
                              <p className="text-sm text-muted-foreground/70 whitespace-pre-wrap italic">
                                Internal: {invoice.internalNotes}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  {/* Items Tab */}
                  <TabsContent value="items" className="mt-0">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Line Items</h3>
                      <div className="rounded-md border overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                                Item
                              </th>
                              <th className="p-3 text-left text-xs font-medium text-muted-foreground">
                                Description
                              </th>
                              <th className="p-3 text-right text-xs font-medium text-muted-foreground">
                                Qty
                              </th>
                              <th className="p-3 text-right text-xs font-medium text-muted-foreground">
                                Unit Price
                              </th>
                              <th className="p-3 text-right text-xs font-medium text-muted-foreground">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoice.lineItems?.map((item, index) => (
                              <tr key={index} className="border-t">
                                <td className="p-3 text-sm font-medium">
                                  {item.sku || `Item ${index + 1}`}
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">
                                  {item.description}
                                </td>
                                <td className="p-3 text-sm text-right tabular-nums">
                                  {item.quantity}
                                </td>
                                <td className="p-3 text-sm text-right tabular-nums">
                                  <FormatAmount amount={Number(item.unitPrice || 0)} />
                                </td>
                                <td className="p-3 text-sm text-right tabular-nums font-medium">
                                  <FormatAmount amount={Number(item.lineTotal || 0)} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Payments Tab */}
                  <TabsContent value="payments" className="mt-0">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Payment History</h3>
                      {paidAmount > 0 ? (
                        <div className="rounded-md border p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium">Payment Received</p>
                                <p className="text-sm text-muted-foreground">
                                  {invoice.paidAt
                                    ? format(new Date(invoice.paidAt), 'PPp')
                                    : status === 'paid'
                                      ? 'Paid in full'
                                      : 'Partial payment'}
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold tabular-nums text-green-600">
                              <FormatAmount amount={paidAmount} />
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No payments recorded yet</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="mt-0">
                    <div className="space-y-4">
                      {onLogActivity && (
                        <div className="flex items-center justify-end">
                          <Button size="sm" onClick={onLogActivity}>
                            <Plus className="h-4 w-4 mr-2" />
                            Log Activity
                          </Button>
                        </div>
                      )}
                      <UnifiedActivityTimeline
                        activities={activities}
                        isLoading={activitiesLoading}
                        hasError={!!activitiesError}
                        error={activitiesError || undefined}
                        title="Activity Timeline"
                        description="Complete history of invoice changes, payment plans, credit notes, and system events"
                        showFilters={true}
                        viewAllSearch={getActivitiesFeedSearch('order')}
                        emptyMessage="No activity recorded yet"
                        emptyDescription="Invoice activities will appear here when changes occur."
                      />
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <AnimatePresence initial={false}>
            {showSidebar && (
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
                    {invoice.customer && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                          Customer
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {invoice.customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {invoice.customer.name}
                            </p>
                            {invoice.customer.email && (
                              <p className="text-xs text-muted-foreground truncate">
                                {invoice.customer.email}
                              </p>
                            )}
                          </div>
                        </div>
                        {invoice.customer.phone && (
                          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            {invoice.customer.phone}
                          </p>
                        )}
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: invoice.customer.id }}
                          search={{}}
                          className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'mt-3 w-full'
                          )}
                        >
                          View Customer
                        </Link>
                      </div>
                    )}

                    <Separator />

                    {/* Related Order */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Related Order
                      </h4>
                      <Link
                        to="/orders/$orderId"
                        params={{ orderId: invoice.id }}
                        className="text-sm text-primary hover:underline flex items-center gap-1.5"
                      >
                        <Package className="h-4 w-4" />
                        {invoice.orderNumber}
                      </Link>
                    </div>

                    <Separator />

                    {/* Key Dates */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Key Dates
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Issued</span>
                          <span>
                            {invoice.orderDate
                              ? format(new Date(invoice.orderDate), 'PP')
                              : '—'}
                          </span>
                        </div>
                        {invoice.invoiceDueDate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Due Date
                            </span>
                            <span>
                              {format(new Date(invoice.invoiceDueDate), 'PP')}
                            </span>
                          </div>
                        )}
                        {invoice.paidAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Paid
                            </span>
                            <span className="text-green-600">
                              {format(new Date(invoice.paidAt), 'PP')}
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
                          <span className="text-muted-foreground">
                            Created
                          </span>
                          <span>
                            {format(new Date(invoice.createdAt), 'PP')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Updated
                          </span>
                          <span>
                            {format(new Date(invoice.updatedAt), 'PP')}
                          </span>
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
        <MobileSidebarSheet title="Invoice Details">
          <div className="space-y-6">
            {/* Customer */}
            {invoice.customer && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Customer
                </h4>
                <p className="font-medium">{invoice.customer.name}</p>
                {invoice.customer.email && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.customer.email}
                  </p>
                )}
                {invoice.customer.phone && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.customer.phone}
                  </p>
                )}
              </div>
            )}

            <Separator />

            {/* Related Order */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Related Order
              </h4>
              <Link
                to="/orders/$orderId"
                params={{ orderId: invoice.id }}
                className="text-sm text-primary hover:underline flex items-center gap-1.5"
              >
                <Package className="h-4 w-4" />
                {invoice.orderNumber}
              </Link>
            </div>

            <Separator />

            {/* Key Dates */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Key Dates
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issued</span>
                  <span>
                    {invoice.orderDate
                      ? format(new Date(invoice.orderDate), 'PP')
                      : '—'}
                  </span>
                </div>
                {invoice.invoiceDueDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due</span>
                    <span>
                      {format(new Date(invoice.invoiceDueDate), 'PP')}
                    </span>
                  </div>
                )}
                {invoice.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="text-green-600">
                      {format(new Date(invoice.paidAt), 'PP')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Financial Summary */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">
                    <FormatAmount amount={total} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance</span>
                  <span
                    className={cn(
                      'font-medium',
                      balanceDue === 0 ? 'text-green-600' : ''
                    )}
                  >
                    <FormatAmount amount={balanceDue} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </MobileSidebarSheet>
      </div>
    </div>
  );
});

export default InvoiceDetailView;
