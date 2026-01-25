/**
 * AI Domain Enum Definitions
 *
 * Enums for AI conversations, approvals, agent tasks, and cost tracking.
 *
 * @see _Initiation/_prd/3-integrations/ai-infrastructure/ai-infrastructure.prd.json
 */

import { pgEnum } from "drizzle-orm/pg-core";

// ============================================================================
// MESSAGE ROLE ENUM
// ============================================================================

export const aiMessageRoleEnum = pgEnum("ai_message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);

// ============================================================================
// APPROVAL STATUS ENUM
// ============================================================================

export const aiApprovalStatusEnum = pgEnum("ai_approval_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
]);

// ============================================================================
// AGENT TASK STATUS ENUM
// ============================================================================

export const aiAgentTaskStatusEnum = pgEnum("ai_agent_task_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);

// ============================================================================
// AGENT NAMES ENUM
// ============================================================================

export const aiAgentNameEnum = pgEnum("ai_agent_name", [
  "triage",
  "customer",
  "order",
  "analytics",
  "quote",
  // Future phases (v1.1+)
  "jobs",
  "communications",
  "inventory",
  "warranty",
  "purchasing",
]);
