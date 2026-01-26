-- RLS Performance Indexes
-- Adds covering indexes to optimize Row-Level Security subquery lookups
--
-- These indexes improve performance for RLS policies that use subqueries
-- to verify organization membership.

-- Covering index for user_sessions RLS lookup
-- The INCLUDE clause enables index-only scans for the (organization_id, id) pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_id_covering
  ON users(organization_id) INCLUDE (id);

-- Composite index for ai_conversations RLS lookup
-- Optimizes the EXISTS subquery in ai_conversation_messages RLS policy
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversations_id_org
  ON ai_conversations(id, organization_id);

-- Index for user_sessions to support RLS policy lookups
-- The policy joins user_sessions to users via user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_id
  ON user_sessions(user_id);
