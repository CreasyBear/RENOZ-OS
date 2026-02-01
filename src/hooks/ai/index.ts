/**
 * AI Domain Hooks
 *
 * TanStack Query hooks for AI features:
 * - Approvals (human-in-the-loop)
 * - Cost tracking and budgets
 * - Chat streaming
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

// Approval hooks
export {
  useAIApprovals,
  useAIPendingApprovalsCount,
  useApproveAction,
  useRejectAction,
  type AIApproval,
  type AIApprovalsResponse,
  type UseAIApprovalsOptions,
} from './use-ai-approvals';

// Cost/budget hooks
export {
  useAIBudget,
  useAIUsage,
  formatCostDollars,
  getUsageLevel,
  type AIBudgetStatus,
  type AIUsageEntry,
  type AIUsageResponse,
  type UseAIBudgetOptions,
  type UseAIUsageOptions,
} from './use-ai-cost';

// Chat hook (AI SDK v6)
export {
  useAIChat,
  useChat,
  getMessageText,
  type UseAIChatOptions,
  type AIChatResult,
  type Message,
} from './use-ai-chat';

// Chat status hook
export {
  useChatStatus,
  useChatStatusMessage,
  type SimplifiedChatStatus,
  type ChatStatusInfo,
} from './use-chat-status';

// Artifact hooks (AI SDK v6)
export {
  // Individual artifact hooks
  useRevenueChartArtifact,
  useOrdersPipelineArtifact,
  useCustomerSummaryArtifact,
  useMetricsCardArtifact,
  useTopCustomersArtifact,
  // All artifacts hook
  useAllArtifacts,
  // Utility hooks
  useHasArtifacts,
  useCurrentArtifact,
  // Types
  type ArtifactStatus,
  type ArtifactData,
  type ArtifactCallbacks,
  type UseArtifactReturn,
  type UseArtifactActions,
  type UseArtifactsReturn,
  type UseArtifactsActions,
  type AllArtifactsResult,
  type UseAllArtifactsOptions,
} from './use-artifacts';
