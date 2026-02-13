/**
 * Keyboard Shortcut Context
 *
 * Shared types and matchers for the keyboard shortcut system.
 * Provider and hook live in separate files for clean fast-refresh boundaries.
 */
import { createContext } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface KeyboardShortcutContextValue {
  register: (id: string, handler: () => void) => () => void
}

export interface KeyMatcher {
  key: string
  meta?: boolean
  shift?: boolean
  alt?: boolean
}

export interface SequentialMatcher {
  sequence: string[]
}

export type ShortcutMatcher = KeyMatcher | SequentialMatcher

export function isSequential(matcher: ShortcutMatcher): matcher is SequentialMatcher {
  return 'sequence' in matcher
}

// ============================================================================
// MATCHERS
// ============================================================================

/**
 * Maps shortcut IDs to key combination matchers.
 * Duplicated with SHORTCUTS in keyboard-shortcuts.ts for display; this is the runtime source.
 */
export const SHORTCUT_MATCHERS: Record<string, ShortcutMatcher> = {
  'command-palette': { key: 'k', meta: true },
  'toggle-sidebar': { key: 'b', meta: true },
  'keyboard-shortcuts': { key: '/', meta: true },
  'toggle-ai': { key: 'a', meta: true, shift: true },
  'quick-log': { key: 'l', meta: true },
  'new-customer': { key: 'c', meta: true, shift: true },
  'new-order': { key: 'o', meta: true, shift: true },
  'new-quote': { key: 'q', meta: true, shift: true },
  save: { key: 's', meta: true },
  'go-dashboard': { sequence: ['g', 'd'] },
  'go-customers': { sequence: ['g', 'c'] },
  'go-orders': { sequence: ['g', 'o'] },
  'go-inbox': { sequence: ['g', 'i'] },
  'go-pipeline': { sequence: ['g', 'p'] },
  'go-projects': { sequence: ['g', 'j'] },
  'go-schedule': { sequence: ['g', 's'] },
}

export const SEQUENCE_TIMEOUT_MS = 500

// ============================================================================
// CONTEXT
// ============================================================================

export const KeyboardShortcutContext = createContext<KeyboardShortcutContextValue | null>(null)
