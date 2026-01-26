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
  formatCostCents,
  getUsageLevel,
  type AIBudgetStatus,
  type AIUsageEntry,
  type AIUsageResponse,
  type UseAIBudgetOptions,
  type UseAIUsageOptions,
} from './use-ai-cost';

// Chat hook
export {
  useAIChat,
  type UseAIChatOptions,
  type AIChatResult,
} from './use-ai-chat';
