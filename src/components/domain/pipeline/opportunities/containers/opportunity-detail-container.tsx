/**
 * Opportunity Detail Container
 *
 * Handles data fetching, mutations, and state management for opportunity detail view.
 * Implements render props pattern for flexible header/action composition.
 *
 * @source opportunity from useOpportunity hook
 * @source activities from useUnifiedActivities hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Edit,
  MoreHorizontal,
  Trophy,
  XCircle,
  ArrowRight,
  Send,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { toastSuccess, toastError } from '@/hooks';
import {
  useOpportunity,
  useDeleteOpportunity,
  useUpdateOpportunityStage,
  useConvertToOrder,
  useSendQuote,
} from '@/hooks/pipeline';
import { useUnifiedActivities } from '@/hooks/activities';
import type { OpportunityStage } from '@/lib/schemas/pipeline';
import { OpportunityDetailView } from '../views/opportunity-detail-view';
import { OPPORTUNITY_STAGE_CONFIG } from '../opportunity-status-config';

// ============================================================================
// TYPES
// ============================================================================

export interface OpportunityDetailContainerRenderProps {
  /** Header title element */
  headerTitle: React.ReactNode;
  /** Header action buttons */
  headerActions: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface OpportunityDetailContainerProps {
  /** Opportunity ID to display */
  opportunityId: string;
  /** Callback when user navigates back */
  onBack?: () => void;
  /** Callback when user clicks edit */
  onEdit?: () => void;
  /** Callback after successful conversion to order */
  onConvertToOrder?: (orderId: string) => void;
  /** Callback to open won/lost dialog */
  onOpenWonLostDialog?: (stage: 'won' | 'lost') => void;
  /** Render props pattern for layout composition */
  children?: (props: OpportunityDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// STATUS WORKFLOW
// ============================================================================

const STATUS_NEXT_ACTIONS: Record<OpportunityStage, OpportunityStage[]> = {
  new: ['qualified'],
  qualified: ['proposal'],
  proposal: ['negotiation'],
  negotiation: ['won', 'lost'],
  won: [],
  lost: [],
};

// ============================================================================
// LOADING SKELETON
// ============================================================================

function OpportunityDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OpportunityDetailContainer({
  opportunityId,
  onBack,
  onEdit,
  onConvertToOrder,
  onOpenWonLostDialog,
  children,
  className,
}: OpportunityDetailContainerProps) {
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
    data,
    isLoading,
    error,
    refetch,
  } = useOpportunity({ id: opportunityId });

  const {
    activities: unifiedActivities,
    isLoading: unifiedActivitiesLoading,
    error: unifiedActivitiesError,
  } = useUnifiedActivities({
    entityType: 'opportunity',
    entityId: opportunityId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const stageChangeMutation = useUpdateOpportunityStage();
  const deleteMutation = useDeleteOpportunity();
  const convertToOrderMutation = useConvertToOrder();
  const sendQuoteMutation = useSendQuote();

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleStageChange = useCallback(
    async (stage: OpportunityStage) => {
      // Won/Lost require the dialog for reason selection
      if (stage === 'won' || stage === 'lost') {
        onOpenWonLostDialog?.(stage);
        return;
      }

      try {
        await stageChangeMutation.mutateAsync({ opportunityId, stage });
        toastSuccess(`Stage updated to ${OPPORTUNITY_STAGE_CONFIG[stage].label}`);
      } catch {
        toastError('Failed to update stage');
      }
    },
    [stageChangeMutation, opportunityId, onOpenWonLostDialog]
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync(opportunityId);
      toastSuccess('Opportunity deleted');
      setDeleteDialogOpen(false);
      onBack?.();
    } catch {
      toastError('Failed to delete opportunity');
    }
  }, [deleteMutation, opportunityId, onBack]);

  const handleConvertToOrder = useCallback(async () => {
    try {
      await convertToOrderMutation.mutateAsync({ opportunityId });
      toastSuccess('Opportunity conversion initiated');
      // TODO: Navigate to newly created order when Orders domain integration is complete
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to convert opportunity');
    }
  }, [convertToOrderMutation, opportunityId, onConvertToOrder]);

  const handleSendQuote = useCallback(async () => {
    if (!data?.versions?.length) {
      toastError('No quote version available to send.');
      return;
    }
    if (!data?.customer?.email) {
      toastError('Customer email is required to send quote.');
      return;
    }
    const latestVersion = data.versions[0];
    try {
      await sendQuoteMutation.mutateAsync({
        opportunityId,
        quoteVersionId: latestVersion.id,
        recipientEmail: data.customer.email,
        subject: `Quote for ${data.opportunity.title}`,
      });
      toastSuccess('Quote sent successfully.');
    } catch {
      toastError('Failed to send quote.');
    }
  }, [sendQuoteMutation, opportunityId, data]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────
  const stageConfig = useMemo(() => {
    if (!data?.opportunity) return null;
    return (
      OPPORTUNITY_STAGE_CONFIG[data.opportunity.stage as OpportunityStage] ??
      OPPORTUNITY_STAGE_CONFIG.new
    );
  }, [data?.opportunity]);

  const nextActions = useMemo(() => {
    if (!data?.opportunity) return [];
    return STATUS_NEXT_ACTIONS[data.opportunity.stage as OpportunityStage] ?? [];
  }, [data?.opportunity]);

  const isClosedStage = useMemo(() => {
    if (!data?.opportunity) return false;
    return data.opportunity.stage === 'won' || data.opportunity.stage === 'lost';
  }, [data?.opportunity]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    const loadingContent = <OpportunityDetailSkeleton />;
    if (children) {
      return (
        <>
          {children({
            headerTitle: <Skeleton className="h-8 w-48" />,
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
  if (error || !data) {
    const errorContent = (
      <ErrorState
        title="Opportunity not found"
        message="The opportunity you're looking for doesn't exist or has been deleted."
        onRetry={() => refetch()}
        retryLabel="Try Again"
      />
    );
    if (children) {
      return (
        <>
          {children({
            headerTitle: 'Opportunity Not Found',
            headerActions: null,
            content: errorContent,
          })}
        </>
      );
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Extract data
  // ─────────────────────────────────────────────────────────────────────────
  const { opportunity, customer, contact, activities, versions, winLossReason } = data;
  const StageIcon = stageConfig?.icon;

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Header Elements
  // ─────────────────────────────────────────────────────────────────────────
  const headerTitle = (
    <div className="flex items-center gap-3">
      <span className="text-xl font-semibold">{opportunity.title}</span>
      {stageConfig && (
        <Badge className={cn('gap-1')}>
          {StageIcon && <StageIcon className="h-3 w-3" />}
          {stageConfig.label}
        </Badge>
      )}
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Stage Actions */}
      {nextActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={stageChangeMutation.isPending}>
              {stageChangeMutation.isPending ? 'Updating...' : 'Advance Stage'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {nextActions.map((nextStage) => (
              <DropdownMenuItem key={nextStage} onClick={() => handleStageChange(nextStage)}>
                {nextStage === 'won' && <Trophy className="h-4 w-4 mr-2 text-green-600" />}
                {nextStage === 'lost' && <XCircle className="h-4 w-4 mr-2 text-destructive" />}
                Move to {OPPORTUNITY_STAGE_CONFIG[nextStage].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Won/Lost Quick Actions */}
      {!isClosedStage && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenWonLostDialog?.('won')}
          >
            <Trophy className="h-4 w-4 mr-2 text-green-600" />
            Won
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenWonLostDialog?.('lost')}
          >
            <XCircle className="h-4 w-4 mr-2 text-destructive" />
            Lost
          </Button>
        </>
      )}

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && !isClosedStage && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Opportunity
            </DropdownMenuItem>
          )}
          {!isClosedStage && versions.length > 0 && (
            <DropdownMenuItem
              onClick={handleSendQuote}
              disabled={sendQuoteMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Quote
            </DropdownMenuItem>
          )}
          {opportunity.stage === 'won' && (
            <DropdownMenuItem
              onClick={handleConvertToOrder}
              disabled={convertToOrderMutation.isPending}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Convert to Order
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Delete
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
      <OpportunityDetailView
        opportunity={opportunity}
        customer={customer}
        contact={contact}
        activities={activities}
        versions={versions}
        winLossReason={winLossReason}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showMetaPanel={showMetaPanel}
        onToggleMetaPanel={handleToggleMetaPanel}
        unifiedActivities={unifiedActivities}
        unifiedActivitiesLoading={unifiedActivitiesLoading}
        unifiedActivitiesError={unifiedActivitiesError}
        className={className}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{opportunity.title}"? This action cannot
              be undone.
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
    return <>{children({ headerTitle, headerActions, content })}</>;
  }

  // Default rendering (standalone usage)
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        {headerTitle}
        {headerActions}
      </div>
      {content}
    </div>
  );
}

export default OpportunityDetailContainer;
