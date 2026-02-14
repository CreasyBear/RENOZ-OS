/**
 * Customer Detail View (Presenter)
 *
 * 5-Zone Layout optimized for two user modes:
 * 1. Quick Scan (30 seconds, on a call) - Key metrics in header, contact in sidebar
 * 2. Deep Work (5-30 minutes) - Full details in tabs
 *
 * Zone Layout:
 * - Zone 1: Header - Name, status, key metrics (LTV, Health, Orders, Credit)
 * - Zone 2: Progress - N/A for customers (no lifecycle stages)
 * - Zone 3: Alerts - Credit hold, overdue invoices, health warnings
 * - Zone 4: Tabs - Overview, Orders, Activity
 * - Zone 5: Sidebar - Primary contact, billing address, account details
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { memo, useMemo, useCallback, Suspense, lazy } from 'react';
import { useAlertDismissals, generateAlertId } from '@/hooks/_shared/use-alert-dismissals';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/_shared/use-reduced-motion';
import {
  User,
  Building2,
  Star,
  AlertTriangle,
  Link2,
  PanelRight,
  Heart,
  DollarSign,
  ShoppingCart,
  CreditCard,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toastSuccess } from '@/hooks';
import { getInitials } from '@/lib/customer-utils';
import { CUSTOMER_STATUS_CONFIG, CUSTOMER_TYPE_CONFIG, getHealthScoreSemanticColor, getHealthScoreLabel } from '../customer-status-config';
import { getStatusColorClasses, getIconColorClasses } from '@/lib/status';
import { DETAIL_VIEW } from '@/lib/constants/detail-view';

// Shared components (per METRIC-CARD-STANDARDS.md)
import { MetricCard } from '@/components/shared/metric-card';
import { FormatAmount } from '@/components/shared/format';

// Domain components
import { CustomerAlerts, CustomerAlertsSkeleton } from '../alerts';
import { CustomerSidebar, MobileSidebarSheet } from '../components';

// Lazy-loaded tabs for code splitting
const CustomerOverviewTab = lazy(() => import('../tabs/customer-overview-tab'));
const CustomerOrdersTab = lazy(() => import('../tabs/customer-orders-tab'));
const CustomerActivityTab = lazy(() => import('../tabs/customer-activity-tab'));

// Types
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';
import type {
  CustomerAlert,
  CustomerActiveItems as CustomerActiveItemsType,
  CustomerDetailData,
} from '@/lib/schemas/customers';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerDetailViewProps {
  customer: CustomerDetailData;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showMetaPanel: boolean;
  onToggleMetaPanel: () => void;
  activities?: UnifiedActivity[];
  activitiesLoading?: boolean;
  activitiesError?: Error | null;
  alerts?: CustomerAlert[];
  alertsLoading?: boolean;
  activeItems?: CustomerActiveItemsType;
  activeItemsLoading?: boolean;
  headerActions?: React.ReactNode;
  /** Handler to open activity logging dialog */
  onLogActivity?: () => void;
  /** Handler to open follow-up scheduling dialog */
  onScheduleFollowUp?: () => void;
  className?: string;
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
// ZONE 1: CUSTOMER HEADER
// ============================================================================

interface CustomerHeaderProps {
  customer: CustomerDetailData;
}

function CustomerHeader({ customer }: CustomerHeaderProps) {
  const statusConfig = CUSTOMER_STATUS_CONFIG[customer.status as keyof typeof CUSTOMER_STATUS_CONFIG] ?? CUSTOMER_STATUS_CONFIG.prospect;
  const StatusIcon = statusConfig.icon ?? User;
  const statusColorClasses = getStatusColorClasses(statusConfig.color);
  const typeConfig = CUSTOMER_TYPE_CONFIG[customer.type as keyof typeof CUSTOMER_TYPE_CONFIG];
  const tags = (customer.tagAssignments ?? []).map((ta) => ta.tag);

  // Parse numeric values for metrics
  const ltv = typeof customer.lifetimeValue === 'string' ? parseFloat(customer.lifetimeValue) : customer.lifetimeValue;
  const credit = typeof customer.creditLimit === 'string' ? parseFloat(customer.creditLimit) : customer.creditLimit;

  // Health score icon color using semantic colors per STATUS-BADGE-STANDARDS.md
  const getHealthIconColor = (score: number | null | undefined): string => {
    const semanticColor = getHealthScoreSemanticColor(score ?? null);
    return getIconColorClasses(semanticColor);
  };

  return (
    <section className="space-y-4">
      {/* Row 1: Avatar, Name, Status badges */}
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
            {getInitials(customer.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground leading-tight truncate">
              {customer.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('gap-1 text-[11px]', statusColorClasses)}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
              {typeConfig && (
                <Badge variant="outline" className="text-[11px]">
                  <Building2 className="h-3 w-3 mr-1" />
                  {typeConfig.label}
                </Badge>
              )}
              {customer.creditHold && (
                <Badge className="text-[11px] bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Credit Hold
                </Badge>
              )}
              {customer.priority && customer.priority.priorityLevel !== 'medium' && (
                <Badge className="text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                  <Star className="h-3 w-3 mr-1" />
                  {customer.priority.priorityLevel.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
          {customer.legalName && customer.legalName !== customer.name && (
            <p className="text-sm text-muted-foreground mt-0.5">{customer.legalName}</p>
          )}
        </div>
      </div>

      {/* Row 2: Key Metrics - Using shared MetricCard (per METRIC-CARD-STANDARDS.md) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          variant="compact"
          title="Health Score"
          value={customer.healthScore ?? '--'}
          icon={Heart}
          iconClassName={getHealthIconColor(customer.healthScore)}
          subtitle={getHealthScoreLabel(customer.healthScore)}
        />
        <MetricCard
          variant="compact"
          title="Lifetime Value"
          value={<FormatAmount amount={ltv ?? 0} cents={false} showCents={false} />}
          icon={DollarSign}
          iconClassName={ltv && ltv > 10000 ? getIconColorClasses('success') : 'text-muted-foreground'}
        />
        <MetricCard
          variant="compact"
          title="Total Orders"
          value={customer.totalOrders}
          icon={ShoppingCart}
        />
        {customer.creditHold ? (
          <MetricCard
            variant="compact"
            title="Credit Status"
            value="ON HOLD"
            icon={AlertTriangle}
            alert
            subtitle="Orders blocked"
          />
        ) : credit && credit > 0 ? (
          <MetricCard
            variant="compact"
            title="Credit Limit"
            value={<FormatAmount amount={credit} cents={false} showCents={false} />}
            icon={CreditCard}
          />
        ) : null}
      </div>

      {/* Row 3: Tags (if any) */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CustomerDetailView = memo(function CustomerDetailView({
  customer,
  activeTab,
  onTabChange,
  showMetaPanel,
  onToggleMetaPanel,
  activities = [],
  activitiesLoading = false,
  activitiesError,
  alerts = [],
  alertsLoading = false,
  activeItems,
  activeItemsLoading = false,
  headerActions,
  onLogActivity,
  onScheduleFollowUp,
  className,
}: CustomerDetailViewProps) {
  const prefersReducedMotion = useReducedMotion();

  // Alert dismissal persistence (24h TTL in localStorage)
  const { dismiss, isAlertDismissed } = useAlertDismissals();

  // Filter out dismissed alerts
  const visibleAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const alertId = generateAlertId('customer', customer.id, alert.type);
      return !isAlertDismissed(alertId);
    });
  }, [alerts, customer.id, isAlertDismissed]);

  // Handle alert dismissal
  const handleDismissAlert = useCallback(
    (alertId: string) => {
      const alert = alerts.find((a) => a.id === alertId);
      if (alert) {
        const persistentId = generateAlertId('customer', customer.id, alert.type);
        dismiss(persistentId);
      }
    },
    [alerts, customer.id, dismiss]
  );

  // Copy link handler
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toastSuccess('Link copied to clipboard');
  }, []);

  // Derive sidebar data
  const primaryContact = useMemo(() => {
    return customer.contacts?.find((c) => c.isPrimary) ?? null;
  }, [customer.contacts]);

  const billingAddress = useMemo(() => {
    return customer.addresses?.find((a) => a.type === 'billing' && a.isPrimary)
      ?? customer.addresses?.find((a) => a.type === 'billing')
      ?? customer.addresses?.find((a) => a.isPrimary)
      ?? customer.addresses?.[0]
      ?? null;
  }, [customer.addresses]);

  // Tab prefetch handlers (trigger dynamic import on hover/focus)
  const handlePrefetchOverview = useCallback(() => {
    import('../tabs/customer-overview-tab');
  }, []);
  const handlePrefetchOrders = useCallback(() => {
    import('../tabs/customer-orders-tab');
  }, []);
  const handlePrefetchActivity = useCallback(() => {
    import('../tabs/customer-activity-tab');
  }, []);

  return (
    <div className={cn('space-y-6', className)}>
      {/* ─────────────────────────────────────────────────────────────────────
          ZONE 1: Entity Header with actions and panel toggle
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <CustomerHeader customer={customer} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Header Actions from container */}
          {headerActions}

          {/* Utility buttons (desktop only) */}
          <div className="hidden lg:flex items-center gap-2 border-l pl-2 ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                    onClick={handleCopyLink}
                    aria-label="Copy link to clipboard"
                  >
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
                    aria-label="Toggle details panel"
                  >
                    <PanelRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          ZONE 3: Alerts - What needs attention NOW
      ───────────────────────────────────────────────────────────────────── */}
      {alertsLoading ? (
        <CustomerAlertsSkeleton />
      ) : visibleAlerts.length > 0 ? (
        <CustomerAlerts alerts={visibleAlerts} onDismiss={handleDismissAlert} />
      ) : null}

      {/* ─────────────────────────────────────────────────────────────────────
          ZONE 4+5: Main Content Grid (Tabs + Sidebar)
      ───────────────────────────────────────────────────────────────────── */}
      <div className={cn(
        'grid grid-cols-1 gap-8',
        showMetaPanel && 'lg:grid-cols-[minmax(0,1fr)_320px]'
      )}>
        {/* Primary Content - Tabs */}
        <div className="min-w-0">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="w-full gap-6 bg-transparent border-b border-border rounded-none h-auto p-0">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                onMouseEnter={handlePrefetchOverview}
                onFocus={handlePrefetchOverview}
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                onMouseEnter={handlePrefetchOrders}
                onFocus={handlePrefetchOrders}
              >
                Orders ({customer.totalOrders})
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3"
                onMouseEnter={handlePrefetchActivity}
                onFocus={handlePrefetchActivity}
              >
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Tab Content - Lazy loaded with Suspense */}
            <TabsContent value="overview" className="mt-0">
              {activeTab === 'overview' && (
                <Suspense fallback={<TabSkeleton />}>
                  <CustomerOverviewTab
                    customer={customer}
                    activeItems={activeItems}
                    activeItemsLoading={activeItemsLoading}
                  />
                </Suspense>
              )}
            </TabsContent>

            <TabsContent value="orders" className="mt-0">
              {activeTab === 'orders' && (
                <Suspense fallback={<TabSkeleton />}>
                  <CustomerOrdersTab
                    orderSummary={customer.orderSummary}
                    totalOrders={customer.totalOrders}
                    customerId={customer.id}
                  />
                </Suspense>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              {activeTab === 'activity' && (
                <Suspense fallback={<TabSkeleton />}>
                  <CustomerActivityTab
                    activities={activities}
                    isLoading={activitiesLoading}
                    error={activitiesError}
                    onLogActivity={onLogActivity}
                    onScheduleFollowUp={onScheduleFollowUp}
                  />
                </Suspense>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Quick Reference Panel (desktop) */}
        <AnimatePresence initial={false}>
          {showMetaPanel && (
            <motion.div
              key="meta-panel"
              initial={{ x: prefersReducedMotion ? 0 : 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: prefersReducedMotion ? 0 : 80, opacity: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : {
                type: 'spring',
                stiffness: 260,
                damping: 26,
                duration: DETAIL_VIEW.TRANSITION.SIDEBAR_COLLAPSE / 1000,
              }}
              className="hidden lg:block border-l border-border"
            >
              <CustomerSidebar
                primaryContact={primaryContact}
                billingAddress={billingAddress}
                companyEmail={customer.email}
                companyPhone={customer.phone}
                website={customer.website}
                customerCode={customer.customerCode}
                customerType={customer.type}
                industry={customer.industry}
                size={customer.size}
                firstOrderDate={customer.firstOrderDate}
                lastOrderDate={customer.lastOrderDate}
                createdAt={customer.createdAt}
                updatedAt={customer.updatedAt}
                className="lg:sticky lg:top-20"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Sidebar Sheet - FAB visible below lg breakpoint */}
      <MobileSidebarSheet customer={customer} title="Customer Details">
        <CustomerSidebar
          primaryContact={primaryContact}
          billingAddress={billingAddress}
          companyEmail={customer.email}
          companyPhone={customer.phone}
          website={customer.website}
          customerCode={customer.customerCode}
          customerType={customer.type}
          industry={customer.industry}
          size={customer.size}
          firstOrderDate={customer.firstOrderDate}
          lastOrderDate={customer.lastOrderDate}
          createdAt={customer.createdAt}
          updatedAt={customer.updatedAt}
        />
      </MobileSidebarSheet>
    </div>
  );
});

export default CustomerDetailView;
