/**
 * AI Approvals Module
 *
 * Human-in-the-loop approval system for AI-drafted actions.
 * Implements AI-INFRA-015 acceptance criteria.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

export {
  executeAction,
  rejectAction,
  getPendingApprovals,
  type ExecuteActionResult,
  type RejectActionResult,
} from './executor';

export {
  actionHandlers,
  getActionHandler,
  hasActionHandler,
  type ActionHandler,
  type HandlerContext,
  type HandlerResult,
} from './handlers';
