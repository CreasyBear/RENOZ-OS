/**
 * Opportunity Detail Container
 *
 * Thin orchestration layer that uses the composite useOpportunityDetail hook
 * for all data fetching, mutations, and state management.
 *
 * Implements render props pattern for flexible header/action composition.
 *
 * @source all data and state from useOpportunityDetail composite hook
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo } from 'react';
import {
  Edit,
  MoreHorizontal,
  Trophy,
  XCircle,
  ArrowRight,
  Send,
  Printer,
  Trash2,
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
import { useOpportunityDetail } from '@/hooks/pipeline';
import { useTrackView } from '@/hooks/search';
import { isValidOpportunityStage, isValidOpportunityMetadata } from '@/lib/schemas/pipeline';
import { OpportunityDetailView } from '../views/opportunity-detail-view';
import { OPPORTUNITY_STAGE_CONFIG } from '../opportunity-status-config';
import { WonLostDialog } from '../../won-lost-dialog';
import { ActivityLogger } from '../../activities/activity-logger';
import { ExtendValidityDialog } from '../../quotes/extend-validity-dialog';

// ============================================================================
// TYPES
// ============================================================================

export interface OpportunityDetailContainerRenderProps {
  /** Header action buttons */
  headerActions: React.ReactNode;
  /** Main content */
  content: React.ReactNode;
}

export interface OpportunityDetailContainerProps {
  /** Opportunity ID to display */
  opportunityId: string;
  /** Render props pattern for layout composition */
  children?: (props: OpportunityDetailContainerRenderProps) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

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

export const OpportunityDetailContainer = memo(function OpportunityDetailContainer({
  opportunityId,
  children,
  className,
}: OpportunityDetailContainerProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // Composite Hook - All data, state, and actions
  // ─────────────────────────────────────────────────────────────────────────
  const {
    // Core data
    opportunity,
    customer,
    contact,
    versions,
    winLossReason,

    // Extended data
    alerts,
    activeItems,
    unifiedActivities,

    // Loading states
    isLoading,
    error,
    activeItemsLoading,
    activitiesLoading,
    activitiesError,

    // UI State
    activeTab,
    onTabChange,
    showSidebar,
    toggleSidebar,

    // Dialog states
    deleteDialogOpen,
    setDeleteDialogOpen,
    openWonLostDialog,
    wonLostDialogOpen,
    wonLostDialogStage,
    closeWonLostDialog,
    activityDialogOpen,
    setActivityDialogOpen,
    extendQuoteDialogOpen,
    setExtendQuoteDialogOpen,

    // Mutation states
    isDeleting,
    isUpdatingStage,
    isConverting,

    // Actions
    actions,

    // Derived state
    isClosedStage,
    nextStageActions,

    // Refetch
    refetch,
  } = useOpportunityDetail(opportunityId);
  useTrackView('opportunity', opportunity?.id, opportunity?.title, customer?.name ?? undefined, `/pipeline/${opportunityId}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    const loadingContent = <OpportunityDetailSkeleton />;
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
  if (error || !opportunity) {
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
            headerActions: null,
            content: errorContent,
          })}
        </>
      );
    }
    return errorContent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Extract activities from opportunity data (immutable log)
  // ─────────────────────────────────────────────────────────────────────────
  // Note: The useOpportunity hook returns opportunity.activities in its data shape
  // We need to extract it for the view. For now, use an empty array as the
  // activities are accessible via unifiedActivities.
  const opportunityActivities: Array<{
    id: string;
    type: string;
    description: string;
    outcome: string | null;
    scheduledAt: Date | string | null;
    completedAt: Date | string | null;
    createdAt: Date | string;
  }> = [];

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Header Actions
  // ─────────────────────────────────────────────────────────────────────────
  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Stage Actions */}
      {nextStageActions.length > 0 && !isClosedStage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isUpdatingStage}>
              {isUpdatingStage ? 'Updating...' : 'Advance Stage'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {nextStageActions.map((nextStage) => (
              <DropdownMenuItem
                key={nextStage}
                onClick={() => actions.onStageChange(nextStage)}
              >
                {nextStage === 'won' && <Trophy className="h-4 w-4 mr-2 text-green-600" />}
                {nextStage === 'lost' && <XCircle className="h-4 w-4 mr-2 text-destructive" />}
                {nextStage !== 'won' && nextStage !== 'lost' && (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Move to {isValidOpportunityStage(nextStage) ? OPPORTUNITY_STAGE_CONFIG[nextStage]?.label ?? nextStage : nextStage}
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
            onClick={() => openWonLostDialog('won')}
          >
            <Trophy className="h-4 w-4 mr-2 text-green-600" />
            Won
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openWonLostDialog('lost')}
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
          {!isClosedStage && (
            <DropdownMenuItem onClick={actions.onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Opportunity
            </DropdownMenuItem>
          )}
          {!isClosedStage && versions.length > 0 && (
            <DropdownMenuItem onClick={actions.onSendQuote}>
              <Send className="h-4 w-4 mr-2" />
              Send Quote
            </DropdownMenuItem>
          )}
          {opportunity.stage === 'won' && (
            <DropdownMenuItem
              onClick={actions.onConvertToOrder}
              disabled={isConverting}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              {isConverting ? 'Converting...' : 'Convert to Order'}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={actions.onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
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
        opportunity={{
          ...opportunity,
          metadata: isValidOpportunityMetadata(opportunity.metadata) ? opportunity.metadata : null,
        }}
        customer={customer}
        contact={contact ? {
          ...contact,
          jobTitle: (contact as { jobTitle?: string | null }).jobTitle ?? null,
        } : null}
        activities={opportunityActivities}
        versions={versions}
        winLossReason={winLossReason}
        alerts={alerts}
        activeItems={activeItems}
        activeItemsLoading={activeItemsLoading}
        unifiedActivities={unifiedActivities}
        unifiedActivitiesLoading={activitiesLoading}
        unifiedActivitiesError={activitiesError}
        activeTab={activeTab}
        onTabChange={onTabChange}
        showSidebar={showSidebar}
        onToggleSidebar={toggleSidebar}
        isClosedStage={isClosedStage}
        onAlertAction={(actionType) => {
          // Handle alert actions
          if (actionType === 'extend_quote') {
            actions.onExtendQuote();
          } else if (actionType === 'log_activity') {
            actions.onLogActivity();
          } else if (actionType === 'schedule_followup') {
            actions.onScheduleFollowUp();
          }
        }}
        onLogActivity={actions.onLogActivity}
        onScheduleFollowUp={actions.onScheduleFollowUp}
        onExtendQuote={actions.onExtendQuote}
        onSendQuote={actions.onSendQuote}
        onCopyLink={actions.onCopyLink}
        className={className}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{opportunity.title}&rdquo;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={actions.onDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Won/Lost Classification Dialog */}
      <WonLostDialog
        open={wonLostDialogOpen}
        type={wonLostDialogStage ?? 'won'}
        opportunity={opportunity ? { title: opportunity.title, value: opportunity.value } : null}
        onConfirm={(reason) => actions.onWonLostConfirm(reason)}
        onCancel={closeWonLostDialog}
      />

      {/* Activity Logger Dialog */}
      {activityDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setActivityDialogOpen(false)}>
          <div className="bg-background border rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Log Activity</h2>
              <Button variant="ghost" size="icon" onClick={() => setActivityDialogOpen(false)}>
                ×
              </Button>
            </div>
            <ActivityLogger
              opportunityId={opportunityId}
              variant="card"
              onSuccess={() => {
                setActivityDialogOpen(false);
                refetch();
              }}
            />
          </div>
        </div>
      )}

      {/* Extend Quote Validity Dialog */}
      {versions.length > 0 && (
        <ExtendValidityDialog
          opportunityId={opportunityId}
          quoteNumber={`Quote v${versions[0].versionNumber}`}
          currentValidUntil={opportunity.quoteExpiresAt}
          open={extendQuoteDialogOpen}
          onOpenChange={setExtendQuoteDialogOpen}
          onSuccess={() => {
            setExtendQuoteDialogOpen(false);
            refetch();
          }}
        />
      )}
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
      <div className="flex items-center justify-end mb-6">
        {headerActions}
      </div>
      {content}
    </div>
  );
});

export default OpportunityDetailContainer;
