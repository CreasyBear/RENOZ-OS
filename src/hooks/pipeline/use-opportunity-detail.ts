/**
 * Opportunity Detail Composite Hook
 *
 * Encapsulates all data fetching, state management, and actions
 * for the opportunity detail view. Follows the hook pattern from DETAIL-VIEW-STANDARDS.md.
 *
 * @source opportunity, customer, contact, activities, versions, winLossReason from useOpportunity hook
 * @source alerts from useOpportunityAlerts hook
 * @source activeItems from useOpportunityActiveItems hook
 * @source unifiedActivities from useUnifiedActivities hook
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 * @see docs/design-system/DETAIL-VIEW-MIGRATION.md
 * @see STANDARDS.md - Hook patterns
 */

import { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';

// Data hooks - import from specific files to avoid circular imports
import { useOpportunity } from './use-opportunities';
import {
  useDeleteOpportunity,
  useUpdateOpportunity,
  useUpdateOpportunityStage,
  useConvertToOrder,
} from './use-opportunity-mutations';
import { useSendQuote } from './use-quote-mutations';
import { useOpportunityAlerts, useOpportunityActiveItems } from './use-opportunity-detail-extended';
import { useUnifiedActivities } from '@/hooks/activities';
import { toast } from '@/lib/toast';
import { toastError } from '@/hooks';

// Types
import type { OpportunityStage, UpdateOpportunity } from '@/lib/schemas/pipeline';
import type {
  OpportunityAlert,
  OpportunityActiveItems,
  OpportunityAlertsResponse,
} from '@/lib/schemas/pipeline/opportunity-detail-extended';
import type { UnifiedActivity } from '@/lib/schemas/unified-activity';

// ============================================================================
// TYPES
// ============================================================================

export interface OpportunityDetailActions {
  /** Navigate to edit mode or open edit dialog */
  onEdit: () => void;
  /** Delete opportunity (requires confirmation) */
  onDelete: () => Promise<void>;
  /** Change opportunity stage */
  onStageChange: (stage: OpportunityStage) => Promise<void>;
  /** Confirm won/lost with reason */
  onWonLostConfirm: (reason?: WonLostInput) => Promise<void>;
  /** Update opportunity fields */
  onUpdate: (updates: Partial<UpdateOpportunity>) => Promise<void>;
  /** Send quote to customer */
  onSendQuote: () => void;
  /** Convert to order (for won opportunities) */
  onConvertToOrder: () => Promise<void>;
  /** Copy page link to clipboard */
  onCopyLink: () => void;
  /** Print page */
  onPrint: () => void;
  /** Navigate back to pipeline */
  onBack: () => void;
  /** Log a new activity */
  onLogActivity: () => void;
  /** Schedule a follow-up */
  onScheduleFollowUp: () => void;
  /** Extend quote validity */
  onExtendQuote: () => void;
}

export interface WonLostInput {
  winLossReasonId?: string;
  lostNotes?: string;
  competitorName?: string;
}

// Infer types from server function returns
type OpportunityDetailResult = Awaited<ReturnType<typeof import('@/server/functions/pipeline').getOpportunity>>;

export interface UseOpportunityDetailReturn {
  // Core data
  opportunity: OpportunityDetailResult['opportunity'] | undefined;
  customer: OpportunityDetailResult['customer'] | null;
  contact: OpportunityDetailResult['contact'] | null;
  versions: OpportunityDetailResult['versions'];
  winLossReason: OpportunityDetailResult['winLossReason'] | null;

  // Extended data
  alerts: OpportunityAlert[];
  activeItems: OpportunityActiveItems | undefined;
  unifiedActivities: UnifiedActivity[];

  // Loading states
  isLoading: boolean;
  error: Error | null;
  alertsLoading: boolean;
  activeItemsLoading: boolean;
  activitiesLoading: boolean;
  activitiesError: Error | null;

  // UI State
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;

  // Dialog states
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  wonLostDialogOpen: boolean;
  wonLostDialogStage: 'won' | 'lost' | null;
  openWonLostDialog: (stage: 'won' | 'lost') => void;
  closeWonLostDialog: () => void;
  activityDialogOpen: boolean;
  setActivityDialogOpen: (open: boolean) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  extendQuoteDialogOpen: boolean;
  setExtendQuoteDialogOpen: (open: boolean) => void;

  // Mutation states
  isDeleting: boolean;
  isUpdatingStage: boolean;
  isUpdating: boolean;
  isConverting: boolean;

  // Actions
  actions: OpportunityDetailActions;

  // Derived state
  isClosedStage: boolean;
  nextStageActions: OpportunityStage[];

  // Refetch
  refetch: () => void;
}

// ============================================================================
// STAGE WORKFLOW
// ============================================================================

const STAGE_ORDER: OpportunityStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

function getNextStages(currentStage: OpportunityStage): OpportunityStage[] {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentStage === 'won' || currentStage === 'lost') {
    return [];
  }

  // Can advance to next stage, skip to won, or mark as lost
  const nextStages: OpportunityStage[] = [];

  // Next sequential stage (if not at negotiation)
  if (currentIndex < STAGE_ORDER.indexOf('negotiation')) {
    nextStages.push(STAGE_ORDER[currentIndex + 1]);
  }

  // Can always mark as won or lost from any active stage
  // Note: The early return above ensures we only get here for active stages
  nextStages.push('won');
  nextStages.push('lost');

  return nextStages;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useOpportunityDetail(opportunityId: string): UseOpportunityDetailReturn {
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────────────────
  // UI State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [showSidebar, setShowSidebar] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wonLostDialogOpen, setWonLostDialogOpen] = useState(false);
  const [wonLostDialogStage, setWonLostDialogStage] = useState<'won' | 'lost' | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [extendQuoteDialogOpen, setExtendQuoteDialogOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────
  const {
    data: opportunityData,
    isLoading,
    error,
    refetch,
  } = useOpportunity({ id: opportunityId });

  const {
    data: alertsData,
    isLoading: alertsLoading,
  } = useOpportunityAlerts({
    opportunityId,
    enabled: !!opportunityId && !isLoading,
  });

  const {
    data: activeItemsData,
    isLoading: activeItemsLoading,
  } = useOpportunityActiveItems({
    opportunityId,
    enabled: !!opportunityId && !isLoading,
  });

  const {
    activities: unifiedActivities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUnifiedActivities({
    entityType: 'opportunity',
    entityId: opportunityId,
    enabled: !!opportunityId && !isLoading,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteOpportunity();
  const updateMutation = useUpdateOpportunity();
  const stageMutation = useUpdateOpportunityStage();
  const convertMutation = useConvertToOrder();
  const sendQuoteMutation = useSendQuote();

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────
  const currentStage: OpportunityStage | undefined = opportunityData?.opportunity?.stage ?? undefined;
  const isClosedStage = currentStage === 'won' || currentStage === 'lost';
  const nextStageActions = currentStage ? getNextStages(currentStage) : [];

  // ─────────────────────────────────────────────────────────────────────────
  // Actions (memoized to prevent unnecessary re-renders)
  // All handlers consolidated into single useMemo per STANDARDS.md
  // ─────────────────────────────────────────────────────────────────────────
  const actions = useMemo<OpportunityDetailActions>(() => ({
    onEdit: () => {
      setEditDialogOpen(true);
    },

    onDelete: async () => {
      try {
        await deleteMutation.mutateAsync(opportunityId);
        toast.success('Opportunity deleted');
        setDeleteDialogOpen(false);
        navigate({ to: '/pipeline' });
      } catch {
        toastError('Failed to delete opportunity');
        throw new Error('Delete failed');
      }
    },

    onStageChange: async (stage: OpportunityStage) => {
      // For won/lost, open the dialog for reason selection
      if (stage === 'won' || stage === 'lost') {
        setWonLostDialogStage(stage);
        setWonLostDialogOpen(true);
        return;
      }

      // Get current version for optimistic locking
      const currentVersion = opportunityData?.opportunity?.version;
      if (currentVersion === undefined) {
        toastError('Unable to update stage. Please refresh and try again.');
        return;
      }

      try {
        await stageMutation.mutateAsync({
          opportunityId,
          stage,
          version: currentVersion,
        });
        toast.success(`Stage updated to ${stage}`, {
          action: {
            label: 'View Opportunity',
            onClick: () => navigate({ to: '/pipeline/$opportunityId', params: { opportunityId } }),
          },
        });
      } catch {
        toastError('Failed to update stage');
      }
    },

    onWonLostConfirm: async (reason?: WonLostInput) => {
      if (!wonLostDialogStage) return;

      // Get current version for optimistic locking
      const currentVersion = opportunityData?.opportunity?.version;
      if (currentVersion === undefined) {
        toastError('Unable to update stage. Please refresh and try again.');
        setWonLostDialogOpen(false);
        setWonLostDialogStage(null);
        return;
      }

      try {
        await stageMutation.mutateAsync({
          opportunityId,
          stage: wonLostDialogStage,
          version: currentVersion,
          reason,
        });
        toast.success(wonLostDialogStage === 'won' ? 'Opportunity marked as won!' : 'Opportunity marked as lost');
        setWonLostDialogOpen(false);
        setWonLostDialogStage(null);
      } catch {
        toastError('Failed to update stage');
      }
    },

    onUpdate: async (updates: Partial<UpdateOpportunity>) => {
      try {
        await updateMutation.mutateAsync({
          id: opportunityId,
          ...updates,
        });
        toast.success('Opportunity updated');
      } catch {
        toastError('Failed to update opportunity');
      }
    },

    onSendQuote: async () => {
      // Get current quote version (latest version)
      const quoteVersions = opportunityData?.versions ?? [];
      const currentVersion = quoteVersions.length > 0 ? quoteVersions[0] : null;
      if (!currentVersion) {
        toastError('No quote available to send');
        return;
      }

      // Get customer email
      const oppCustomer = opportunityData?.customer ?? null;
      const customerEmail = oppCustomer?.email;
      if (!customerEmail) {
        toastError('Customer email is required to send quote');
        return;
      }

      try {
        await sendQuoteMutation.mutateAsync({
          opportunityId,
          quoteVersionId: currentVersion.id,
          recipientEmail: customerEmail,
          recipientName: oppCustomer?.name,
          subject: `Quote for ${opportunityData?.opportunity?.title ?? 'Opportunity'}`,
        });
        toast.success('Quote sent successfully', {
          action: {
            label: 'Schedule follow-up',
            onClick: () => setActivityDialogOpen(true),
          },
        });
      } catch (error) {
        toastError(error instanceof Error ? error.message : 'Failed to send quote');
      }
    },

    onConvertToOrder: async () => {
      try {
        await convertMutation.mutateAsync({ opportunityId });
        toast.success('Order conversion initiated');
        // Note: Navigate to orders list since the integration is pending
        navigate({ to: '/orders' });
      } catch {
        toastError('Failed to convert to order');
      }
    },

    onCopyLink: () => {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    },

    onPrint: () => {
      window.print();
    },

    onBack: () => {
      navigate({ to: '/pipeline' });
    },

    onLogActivity: () => {
      setActivityDialogOpen(true);
    },

    onScheduleFollowUp: () => {
      // Could open a specific follow-up dialog or reuse activity dialog
      setActivityDialogOpen(true);
    },

    onExtendQuote: () => {
      setExtendQuoteDialogOpen(true);
    },
  }), [
    opportunityId,
    navigate,
    deleteMutation,
    updateMutation,
    stageMutation,
    convertMutation,
    sendQuoteMutation,
    wonLostDialogStage,
    opportunityData,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Core data
    opportunity: opportunityData?.opportunity,
    customer: opportunityData?.customer ?? null,
    contact: opportunityData?.contact ?? null,
    versions: opportunityData?.versions ?? [],
    winLossReason: opportunityData?.winLossReason ?? null,

    // Extended data
    alerts: (alertsData as OpportunityAlertsResponse | undefined)?.alerts ?? [],
    activeItems: activeItemsData as OpportunityActiveItems | undefined,
    unifiedActivities: unifiedActivities ?? [],

    // Loading states
    isLoading,
    error: error instanceof Error ? error : null,
    alertsLoading,
    activeItemsLoading,
    activitiesLoading,
    activitiesError: activitiesError instanceof Error ? activitiesError : null,

    // UI State
    activeTab,
    onTabChange: setActiveTab,
    showSidebar,
    toggleSidebar: () => setShowSidebar((prev) => !prev),

    // Dialog states
    deleteDialogOpen,
    setDeleteDialogOpen,
    wonLostDialogOpen,
    wonLostDialogStage,
    openWonLostDialog: (stage: 'won' | 'lost') => {
      setWonLostDialogStage(stage);
      setWonLostDialogOpen(true);
    },
    closeWonLostDialog: () => {
      setWonLostDialogOpen(false);
      setWonLostDialogStage(null);
    },
    activityDialogOpen,
    setActivityDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    extendQuoteDialogOpen,
    setExtendQuoteDialogOpen,

    // Mutation states
    isDeleting: deleteMutation.isPending,
    isUpdatingStage: stageMutation.isPending,
    isUpdating: updateMutation.isPending,
    isConverting: convertMutation.isPending,

    // Actions
    actions,

    // Derived state
    isClosedStage,
    nextStageActions,

    // Refetch
    refetch,
  };
}

export default useOpportunityDetail;
