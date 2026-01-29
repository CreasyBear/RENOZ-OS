/**
 * AI Memory System Types
 *
 * Type definitions for three-tier memory system.
 *
 * ⚠️ NOTE: Server implementations are in src/server/functions/ai/memory/
 */

export type {
  MemoryProvider,
  ConversationMemoryProvider,
  WorkingMemory,
  ConversationData,
  ConversationMessage,
  MemoryContext,
} from './types';

// Redis provider (safe for client - no db)
export {
  RedisMemoryProvider,
  getRedisMemoryProvider,
  getWorkingMemory,
  getWorkingMemoryKey,
  setWorkingMemory,
  updateWorkingMemoryField,
  addRecentAction,
  clearWorkingMemory,
} from './redis-provider';

// Server-only functions (re-export for convenience)
export {
  DrizzleMemoryProvider,
  buildMemoryContext,
  formatMemoryContext,
  injectMemoryContext,
} from '@/server/functions/ai/memory';
