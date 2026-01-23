/**
 * Keyboard Shortcuts Configuration
 *
 * Centralized definition of all keyboard shortcuts in the application.
 * Used by the keyboard shortcuts modal and event handlers.
 *
 * @example
 * ```tsx
 * import { SHORTCUTS, getShortcutsByCategory } from '@/lib/keyboard-shortcuts'
 *
 * // Get all navigation shortcuts
 * const navShortcuts = getShortcutsByCategory('Navigation')
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export type ShortcutCategory = 'Navigation' | 'Actions' | 'AI' | 'General'

export interface KeyboardShortcut {
  /** Unique identifier */
  id: string
  /** Display label */
  label: string
  /** Key combination for display (e.g., ['⌘', 'K']) */
  keys: string[]
  /** Category for grouping */
  category: ShortcutCategory
  /** Optional description */
  description?: string
  /** Whether shortcut is platform-specific */
  platformSpecific?: boolean
}

// ============================================================================
// SHORTCUT DEFINITIONS
// ============================================================================

/**
 * All keyboard shortcuts organized by category.
 */
export const SHORTCUTS: KeyboardShortcut[] = [
  // Navigation shortcuts
  {
    id: 'command-palette',
    label: 'Open Command Palette',
    keys: ['⌘', 'K'],
    category: 'Navigation',
    description: 'Quick search and navigation',
  },
  {
    id: 'toggle-sidebar',
    label: 'Toggle Sidebar',
    keys: ['⌘', 'B'],
    category: 'Navigation',
    description: 'Expand or collapse the sidebar',
  },
  {
    id: 'go-dashboard',
    label: 'Go to Dashboard',
    keys: ['G', 'D'],
    category: 'Navigation',
    description: 'Navigate to dashboard',
  },
  {
    id: 'go-customers',
    label: 'Go to Customers',
    keys: ['G', 'C'],
    category: 'Navigation',
    description: 'Navigate to customers',
  },
  {
    id: 'go-orders',
    label: 'Go to Orders',
    keys: ['G', 'O'],
    category: 'Navigation',
    description: 'Navigate to orders',
  },

  // Action shortcuts
  {
    id: 'quick-log',
    label: 'Quick Log',
    keys: ['⌘', 'L'],
    category: 'Actions',
    description: 'Log a call, note, or meeting',
  },
  {
    id: 'new-customer',
    label: 'Create Customer',
    keys: ['⌘', 'Shift', 'C'],
    category: 'Actions',
    description: 'Create a new customer',
  },
  {
    id: 'new-order',
    label: 'Create Order',
    keys: ['⌘', 'Shift', 'O'],
    category: 'Actions',
    description: 'Create a new order',
  },
  {
    id: 'new-quote',
    label: 'Create Quote',
    keys: ['⌘', 'Shift', 'Q'],
    category: 'Actions',
    description: 'Start a new quote',
  },
  {
    id: 'save',
    label: 'Save',
    keys: ['⌘', 'S'],
    category: 'Actions',
    description: 'Save current form',
  },

  // AI shortcuts
  {
    id: 'toggle-ai',
    label: 'Toggle AI Assistant',
    keys: ['⌘', 'Shift', 'A'],
    category: 'AI',
    description: 'Open or close AI chat sidebar',
  },

  // General shortcuts
  {
    id: 'keyboard-shortcuts',
    label: 'Show Keyboard Shortcuts',
    keys: ['⌘', '/'],
    category: 'General',
    description: 'Open this help dialog',
  },
  {
    id: 'escape',
    label: 'Close Dialog / Cancel',
    keys: ['Esc'],
    category: 'General',
    description: 'Close current dialog or cancel action',
  },
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get shortcuts grouped by category.
 */
export function getShortcutsByCategory(): Record<ShortcutCategory, KeyboardShortcut[]> {
  const categories: Record<ShortcutCategory, KeyboardShortcut[]> = {
    Navigation: [],
    Actions: [],
    AI: [],
    General: [],
  }

  for (const shortcut of SHORTCUTS) {
    categories[shortcut.category].push(shortcut)
  }

  return categories
}

/**
 * Get shortcuts for a specific category.
 */
export function getShortcutsForCategory(category: ShortcutCategory): KeyboardShortcut[] {
  return SHORTCUTS.filter((s) => s.category === category)
}

/**
 * Search shortcuts by label or description.
 */
export function searchShortcuts(query: string): KeyboardShortcut[] {
  const lowerQuery = query.toLowerCase()
  return SHORTCUTS.filter(
    (s) =>
      s.label.toLowerCase().includes(lowerQuery) ||
      s.description?.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Format key for display based on platform.
 * Replaces ⌘ with Ctrl on non-Mac platforms.
 */
export function formatKeyForPlatform(key: string): string {
  if (typeof navigator === 'undefined') return key

  const isMac = navigator.platform.toUpperCase().includes('MAC')

  if (!isMac) {
    if (key === '⌘') return 'Ctrl'
    if (key === '⌥') return 'Alt'
  }

  return key
}

/**
 * Get all unique categories in order.
 */
export function getCategories(): ShortcutCategory[] {
  return ['Navigation', 'Actions', 'AI', 'General']
}
