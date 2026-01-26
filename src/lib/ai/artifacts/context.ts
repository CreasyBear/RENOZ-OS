/**
 * Artifact Context
 *
 * Context management for artifact streaming.
 * Stores the UI message stream writer for use in tools.
 *
 * @see https://github.com/midday-ai/ai-sdk-tools/tree/main/packages/artifacts
 */

import type { UIMessageStreamWriter } from 'ai';

// ============================================================================
// CONTEXT TYPE
// ============================================================================

/**
 * Renoz-specific context for artifact streaming.
 * Includes the stream writer and user/organization scope.
 */
export interface RenozArtifactContext {
  /** UI message stream writer for artifact streaming */
  writer: UIMessageStreamWriter;
  /** Current user ID */
  userId: string;
  /** Current organization ID (for multi-tenant isolation) */
  organizationId: string;
  /** User's display name */
  userName?: string;
  /** User's role for permission context */
  userRole?: string;
  /** Current page/view for context-aware responses */
  currentView?: string;
  /** User's timezone for date formatting */
  timezone?: string;
}

// ============================================================================
// CONTEXT STORAGE
// ============================================================================

/**
 * Simple context storage using a module-level variable.
 * Set before tool execution in the chat API, retrieved within tools.
 */
let currentContext: RenozArtifactContext | null = null;

/**
 * Set the artifact context before running agents.
 * Should be called in the chat API's execute function.
 */
export function setContext(context: RenozArtifactContext): void {
  currentContext = context;
}

/**
 * Get the current artifact context.
 * Returns null if context hasn't been set.
 */
export function getContext(): RenozArtifactContext | null {
  return currentContext;
}

/**
 * Get the current artifact context or throw if not available.
 * Use this in tools that require artifact streaming capability.
 */
export function requireContext(): RenozArtifactContext {
  if (!currentContext) {
    throw new Error('Artifact context not initialized. Call setContext() first.');
  }
  return currentContext;
}

/**
 * Clear the artifact context after request completion.
 * Optional - context will be overwritten on next request anyway.
 */
export function clearContext(): void {
  currentContext = null;
}

/**
 * Check if artifact context has been initialized.
 */
export function hasContext(): boolean {
  return currentContext !== null;
}

/**
 * Get the UI message stream writer from context.
 * Use this to stream artifacts from tools.
 */
export function getWriter(): UIMessageStreamWriter | null {
  return currentContext?.writer ?? null;
}

/**
 * Get the writer or throw if not available.
 */
export function requireWriter(): UIMessageStreamWriter {
  const writer = getWriter();
  if (!writer) {
    throw new Error('Stream writer not available. Context may not be initialized.');
  }
  return writer;
}
