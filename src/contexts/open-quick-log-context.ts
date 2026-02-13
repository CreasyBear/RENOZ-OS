/**
 * Open Quick Log Context
 *
 * Provides a typed callback to open the global Quick Log dialog.
 * Used by Command Palette (Cmd+K) and other UI triggers.
 *
 * Avoids string-based window events; keeps the contract explicit.
 */
import { createContext, useContext } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface QuickLogContext {
  customerId?: string
  opportunityId?: string
}

export interface OpenQuickLogContextValue {
  openQuickLog: () => void
  /** Current route context for pre-filling (customer/opportunity). Updated by provider. */
  context?: QuickLogContext
}

// ============================================================================
// CONTEXT
// ============================================================================

export const OpenQuickLogContext = createContext<OpenQuickLogContextValue | null>(null)

// ============================================================================
// HOOK
// ============================================================================

export function useOpenQuickLog(): OpenQuickLogContextValue | null {
  return useContext(OpenQuickLogContext)
}
