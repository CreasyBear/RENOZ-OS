/**
 * Customer Detail Container
 *
 * Orchestrates data fetching, state management, and actions for customer detail view.
 * Uses the useCustomerDetail hook for all logic, keeping this container thin.
 *
 * @source customer from useCustomerDetail hook
 * @source activities from useCustomerDetail hook
 * @source alerts from useCustomerDetail hook
 * @source activeItems from useCustomerDetail hook
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see STANDARDS.md - Container/Presenter pattern
 */

import { useMemo } from 'react';
import {
  Edit,
  Copy,
  Printer,
  MoreHorizontal,
  Trash2,
  FileText,
  Mail,
  Phone,
  Calendar,
  MessageSquarePlus,
  ShoppingCart,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { EntityActivityLogger } from '@/components/shared/activity';
import { useCustomerDetail } from '@/hooks/customers';
import { useEntityActivityLogging } from '@/hooks/activities/use-entity-activity-logging';
import { useTrackView } from '@/hooks/search';
import { useDetailBreadcrumb } from '@/components/layout/use-detail-breadcrumb';
import { cn } from '@/lib/utils';
import type { CustomerDetailData } from '@/lib/schemas/customers';
import { CustomerDetailView } from '../views/customer-detail-view';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerDetailContainerRenderProps {
  /** Header actions (CTAs) for PageLayout.Header when using layout pattern */
  headerActions?: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface CustomerDetailContainerProps {
  /** Customer ID to display */
  customerId: string;
  /** Preloaded customer data from route loader */
  initialCustomer?: CustomerDetailData;
  /** Initial active tab (from URL search, e.g. ?tab=activity) */
  initialTab?: string;
  /** Render props pattern for layout composition */
  children?: (props: CustomerDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

// ============================================================================
// HEADER ACTIONS
// ============================================================================

interface HeaderActionsProps {
  customer: NonNullable<ReturnType<typeof useCustomerDetail>['customer']>;
  actions: ReturnType<typeof useCustomerDetail>['actions'];
  onDeleteClick: () => void;
}

function HeaderActions({ customer, actions, onDeleteClick }: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Primary Actions - Most common next steps (per DETAIL-VIEW-STANDARDS) */}
      <Button onClick={actions.onCreateQuote}>
        <FileText className="h-4 w-4 mr-2" />
        New Quote
      </Button>
      {customer.phone && (
        <a
          href={`tel:${customer.phone}`}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          <Phone className="h-4 w-4 mr-2" />
          Call
        </a>
      )}

      {/* Edit */}
      <Button variant="outline" onClick={actions.onEdit}>
        <Edit className="h-4 w-4 mr-2" />
        Edit
      </Button>

      {/* Quick Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Quick Actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={actions.onAddNote}>
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Add Note
          </DropdownMenuItem>
          <DropdownMenuItem onClick={actions.onScheduleMeeting}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Meeting
          </DropdownMenuItem>
          <DropdownMenuItem onClick={actions.onCreateOrder}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Create Order
          </DropdownMenuItem>
          {customer.email && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="p-0">
                <a
                  href={`mailto:${customer.email}`}
                  className="flex w-full items-center px-2 py-1.5"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </a>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={actions.onCopyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={actions.onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDeleteClick}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Customer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerDetailContainer({
  customerId,
  initialCustomer,
  initialTab,
  children,
  className,
}: CustomerDetailContainerProps) {
  const detail = useCustomerDetail(customerId, { initialTab });
  const customer = detail.customer ?? initialCustomer;

  const { onLogActivity, onScheduleFollowUp, loggerProps } = useEntityActivityLogging({
    entityType: 'customer',
    entityId: customerId,
    entityLabel: `Customer: ${customer?.name ?? customerId}`,
  });

  const actionsWithActivity = useMemo(
    () => ({
      ...detail.actions,
      onLogActivity,
      onScheduleFollowUp,
      onAddNote: onLogActivity,
      onScheduleMeeting: onScheduleFollowUp,
    }),
    [detail.actions, onLogActivity, onScheduleFollowUp]
  );

  useTrackView(
    'customer',
    customer?.id,
    customer?.name,
    customer?.email ?? undefined,
    `/customers/${customerId}`
  );
  useDetailBreadcrumb(`/customers/${customerId}`, customer ? (customer.name ?? customerId) : undefined, !!customer);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (detail.isLoading && !customer) {
    const loadingContent = <CustomerDetailSkeleton />;
    if (children) {
      return <>{children({ headerActions: <Skeleton className="h-10 w-32" />, content: loadingContent })}</>;
    }
    return loadingContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Error
  // ─────────────────────────────────────────────────────────────────────────
  if (detail.error && !customer) {
    const errorContent = (
      <ErrorState
        title="Customer not found"
        message="The customer you're looking for doesn't exist or has been deleted."
        onRetry={() => detail.refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return <>{children({ headerActions: null, content: errorContent })}</>;
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Success (guard: customer required)
  // ─────────────────────────────────────────────────────────────────────────
  if (!customer) return null;

  const headerActionsEl = (
    <HeaderActions
      customer={customer}
      actions={actionsWithActivity}
      onDeleteClick={() => detail.setDeleteDialogOpen(true)}
    />
  );

  const content = (
    <>
      <CustomerDetailView
        customer={customer}
        activeTab={detail.activeTab}
        onTabChange={detail.onTabChange}
        showMetaPanel={detail.showSidebar}
        onToggleMetaPanel={detail.toggleSidebar}
        activities={detail.activities}
        activitiesLoading={detail.activitiesLoading}
        activitiesError={detail.activitiesError}
        alerts={detail.alerts}
        alertsLoading={detail.alertsLoading}
        activeItems={detail.activeItems}
        activeItemsLoading={detail.activeItemsLoading}
        headerActions={children ? null : headerActionsEl}
        onLogActivity={onLogActivity}
        onScheduleFollowUp={onScheduleFollowUp}
        className={className}
      />

      {/* Activity Logger Dialog */}
      <EntityActivityLogger {...loggerProps} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={detail.deleteDialogOpen}
        onOpenChange={detail.setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {customer.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={detail.isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void detail.actions.onDelete();
              }}
              disabled={detail.isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {detail.isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (children) {
    return <>{children({ headerActions: headerActionsEl, content })}</>;
  }

  return content;
}

export default CustomerDetailContainer;
