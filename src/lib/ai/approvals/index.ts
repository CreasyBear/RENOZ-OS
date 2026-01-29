/**
 * AI Approvals Types
 *
 * Type definitions for human-in-the-loop approval system.
 * 
 * ⚠️ NOTE: Implementations are in src/server/functions/ai/approvals/
 *    Import from there in server code.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

export type {
  ExecuteActionResult,
  RejectActionResult,
  ActionHandler,
  HandlerContext,
  HandlerResult,
} from './types';

// ============================================================================
// NOTE: Implementations are in src/server/functions/ai/approvals/
//
// - executor.ts
// - handlers.ts
//
// Import from there in server code:
// import { executeAction, rejectAction } from '@/server/functions/ai/approvals';
// ============================================================================
