/**
 * AI Approval Types
 *
 * Type definitions for human-in-the-loop approval system.
 */

/**
 * Result of executing an approved action.
 */
export interface ExecuteActionResult {
  /** Whether the action was executed successfully */
  success: boolean;
  /** Result data from the handler */
  result?: unknown;
  /** Error message if failed */
  error?: string;
  /** Error code for categorization */
  code?: string;
}

/**
 * Result of rejecting an action.
 */
export interface RejectActionResult {
  /** Whether the rejection was recorded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Action handler function type.
 */
export type ActionHandler<T = Record<string, unknown>, R = unknown> = (
  params: T,
  context: HandlerContext
) => Promise<HandlerResult<R>>;

import type { db } from '@/lib/db';

/**
 * Context passed to action handlers.
 */
export interface HandlerContext {
  /** User ID executing the action */
  userId: string;
  /** Organization ID */
  organizationId: string;
  /** Approval ID for audit trail */
  approvalId: string;
  /** Database transaction */
  tx: typeof db;
}

/**
 * Result from an action handler.
 */
export interface HandlerResult<T = unknown> {
  /** Whether the handler succeeded */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Entity ID affected by this action (for audit trail) */
  entityId?: string;
  /** Entity type affected by this action (for audit trail) */
  entityType?: string;
}
