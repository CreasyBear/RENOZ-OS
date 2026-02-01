/**
 * Customer Detail Container
 *
 * Handles data fetching, mutations, and state management for customer detail view.
 * Implements render props pattern for flexible header/action composition.
 *
 * @source customer from useCustomer hook
 * @source activities from useUnifiedActivities hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useState, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
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
import { toastSuccess, toastError } from '@/hooks';
import { useCustomer, useDeleteCustomer } from '@/hooks/customers';
import { useUnifiedActivities } from '@/hooks/activities';
import { CustomerDetailView } from '../views/customer-detail-view';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerDetailContainerRenderProps {
  /** Header action buttons (Edit, Quick Actions, More menu) */
  headerActions: React.ReactNode;
  /** Main content (CustomerDetailView) */
  content: React.ReactNode;
}

export interface CustomerDetailContainerProps {
  /** Customer ID to display */
  customerId: string;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when user clicks edit */
  onEdit?: () => void;
  /** Callback to navigate to communications */
  onAddNote?: () => void;
  /** Callback to schedule meeting */
  onScheduleMeeting?: () => void;
  /** Callback to create quote */
  onCreateQuote?: () => void;
  /** Callback to create order */
  onCreateOrder?: () => void;
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
// MAIN COMPONENT
// ============================================================================

export function CustomerDetailContainer({
  customerId,
  onBack,
  onEdit,
  onAddNote,
  onScheduleMeeting,
  onCreateQuote,
  onCreateOrder,
  children,
  className,
}: CustomerDetailContainerProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showMetaPanel, setShowMetaPanel] = useState(true);

  // ─────────────────────────────────────────────────────────────────────────
  // Panel Toggle Handler
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggleMetaPanel = useCallback(() => {
    setShowMetaPanel((prev) => !prev);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────
  const {
    data: customer,
    isLoading,
    error,
    refetch,
  } = useCustomer({ id: customerId });

  const {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'customer',
    entityId: customerId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteCustomer();

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync(customerId);
      toastSuccess('Customer deleted');
      setDeleteDialogOpen(false);
      onBack?.();
    } catch {
      toastError('Failed to delete customer');
    }
  }, [deleteMutation, customerId, onBack]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toastSuccess('Link copied to clipboard');
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    const loadingContent = <CustomerDetailSkeleton />;
    if (children) {
      return (
        <>
          {children({
            headerActions: <Skeleton className="h-10 w-32" />,
            content: loadingContent,
          })}
        </>
      );
    }
    return loadingContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Error
  // ─────────────────────────────────────────────────────────────────────────
  if (error || !customer) {
    const errorContent = (
      <ErrorState
        title="Customer not found"
        message="The customer you're looking for doesn't exist or has been deleted."
        onRetry={() => refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return (
        <>
          {children({
            headerActions: null,
            content: errorContent,
          })}
        </>
      );
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Header Elements
  // ─────────────────────────────────────────────────────────────────────────
  // Entity identity (name, status) is displayed by CustomerHeader in the view
  // No headerTitle needed - follows single-responsibility principle
  // @see docs/design-system/DETAIL-VIEW-STANDARDS.md

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Primary Action - Edit */}
      {onEdit && (
        <Button variant="outline" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      )}

      {/* Quick Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            Quick Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onAddNote && (
            <DropdownMenuItem onClick={onAddNote}>
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Add Note
            </DropdownMenuItem>
          )}
          {onScheduleMeeting && (
            <DropdownMenuItem onClick={onScheduleMeeting}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Meeting
            </DropdownMenuItem>
          )}
          {onCreateQuote && (
            <DropdownMenuItem onClick={onCreateQuote}>
              <FileText className="h-4 w-4 mr-2" />
              Create Quote
            </DropdownMenuItem>
          )}
          {onCreateOrder && (
            <DropdownMenuItem onClick={onCreateOrder}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create Order
            </DropdownMenuItem>
          )}
          {customer.email && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={`mailto:${customer.email}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </a>
              </DropdownMenuItem>
            </>
          )}
          {customer.phone && (
            <DropdownMenuItem asChild>
              <a href={`tel:${customer.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Call Customer
              </a>
            </DropdownMenuItem>
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
          <DropdownMenuItem onClick={handleCopyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Customer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Main Content
  // ─────────────────────────────────────────────────────────────────────────
  const content = (
    <>
      <CustomerDetailView
        customer={customer}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showMetaPanel={showMetaPanel}
        onToggleMetaPanel={handleToggleMetaPanel}
        activities={activities}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        className={className}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {customer.name}? This action cannot
              be undone. All related contacts, addresses, and activities will also
              be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: With Render Props or Default
  // ─────────────────────────────────────────────────────────────────────────
  if (children) {
    return <>{children({ headerActions, content })}</>;
  }

  // Default rendering (standalone usage)
  return (
    <div className={className}>
      {headerActions && (
        <div className="flex items-center justify-end mb-4">
          {headerActions}
        </div>
      )}
      {content}
    </div>
  );
}

export default CustomerDetailContainer;
