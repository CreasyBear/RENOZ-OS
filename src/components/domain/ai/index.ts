/**
 * AI Domain Components
 *
 * UI components for AI features:
 * - Chat interface with streaming
 * - Approval modals for human-in-the-loop
 * - Cost/budget indicators
 * - Artifact rendering
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

// Chat components
export { AIChatPanel, ControlledAIChatPanel } from './chat-panel';
export type {
  AIChatPanelProps,
  ControlledAIChatPanelProps,
} from './chat-panel';

// Approval components
export { ApprovalModal } from './approval-modal';
export type { ApprovalModalProps } from './approval-modal';

export { ApprovalsBadge, StaticApprovalsBadge } from './approvals-badge';
export type {
  ApprovalsBadgeProps,
  StaticApprovalsBadgeProps,
} from './approvals-badge';

// Cost/budget components
export { CostIndicator } from './cost-indicator';
export type { CostIndicatorProps } from './cost-indicator';

// Artifact components
export { ArtifactRenderer } from './artifact-renderer';
export type {
  ArtifactRendererProps,
  ArtifactData,
  ArtifactType,
  ArtifactStage,
} from './artifact-renderer';
