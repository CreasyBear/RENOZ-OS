/**
 * Keyboard Shortcuts Modal
 *
 * Dialog displaying all available keyboard shortcuts, opened with Cmd+/.
 *
 * Features:
 * - Opens on Cmd+/ (Ctrl+/ on Windows)
 * - Shortcuts grouped by category
 * - Keyboard shortcut badges styled like kbd elements
 * - Searchable shortcut list
 * - Platform-aware key display (⌘ vs Ctrl)
 *
 * @example
 * ```tsx
 * <KeyboardShortcutsModal />
 * ```
 */
import { useState, useMemo, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, X, Keyboard } from 'lucide-react'
import { useKeyboardShortcut } from './use-keyboard-shortcut'
import { cn } from '@/lib/utils'
import {
  getShortcutsByCategory,
  searchShortcuts,
  formatKeyForPlatform,
  getCategories,
  type KeyboardShortcut,
  type ShortcutCategory,
} from '@/lib/keyboard-shortcuts'

// ============================================================================
// TYPES
// ============================================================================

interface KeyboardShortcutsModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Keyboard key badge component
 */
function KeyBadge({ children }: { children: string }) {
  const formattedKey = formatKeyForPlatform(children)

  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[1.5rem] h-6 px-1.5',
        'rounded border bg-muted',
        'text-xs font-medium text-muted-foreground',
        'shadow-sm'
      )}
    >
      {formattedKey}
    </kbd>
  )
}

/**
 * Shortcut row component
 */
function ShortcutRow({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 px-3',
        'hover:bg-accent rounded-lg'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{shortcut.label}</p>
        {shortcut.description && (
          <p className="text-xs text-muted-foreground truncate">{shortcut.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 ml-4">
        {shortcut.keys.map((key, index) => (
          <KeyBadge key={`${shortcut.id}-${index}`}>{key}</KeyBadge>
        ))}
      </div>
    </div>
  )
}

/**
 * Category section component
 */
function CategorySection({
  category,
  shortcuts,
}: {
  category: ShortcutCategory
  shortcuts: KeyboardShortcut[]
}) {
  if (shortcuts.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
        {category}
      </h3>
      <div className="space-y-0.5">
        {shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.id} shortcut={shortcut} />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function KeyboardShortcutsModal({
  open: controlledOpen,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const open = controlledOpen ?? internalOpen

  // Wrap setOpen to handle search reset on close
  const setOpen = useCallback((isOpen: boolean | ((prev: boolean) => boolean)) => {
    const newOpenState = typeof isOpen === 'function' ? isOpen(open) : isOpen

    // Reset search when closing
    if (!newOpenState) {
      setSearch('')
    }

    if (onOpenChange) {
      onOpenChange(newOpenState)
    } else {
      setInternalOpen(newOpenState)
    }
  }, [open, onOpenChange])

  // Handle Cmd+/ keyboard shortcut (via centralized provider)
  useKeyboardShortcut('keyboard-shortcuts', () => setOpen((prev) => !prev))

  // Get shortcuts, filtered by search if needed
  const displayedShortcuts = useMemo(() => {
    if (search.trim()) {
      return searchShortcuts(search)
    }
    return null // Will use grouped display
  }, [search])

  // Get grouped shortcuts for default display
  const groupedShortcuts = useMemo(() => getShortcutsByCategory(), [])
  const categories = useMemo(() => getCategories(), [])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'motion-reduce:animate-none'
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'bg-background rounded-xl shadow-2xl border overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'motion-reduce:animate-none'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <Dialog.Title className="text-lg font-semibold text-foreground">
                Keyboard Shortcuts
              </Dialog.Title>
            </div>
            <Dialog.Close
              className={cn(
                'rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          {/* Search */}
          <div className="border-b px-4 py-2">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shortcuts..."
                aria-label="Search keyboard shortcuts"
                className={cn(
                  'w-full h-9 pl-9 pr-3 rounded-lg border bg-transparent',
                  'text-sm placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'
                )}
              />
            </div>
          </div>

          {/* Shortcuts list */}
          <div className="max-h-96 overflow-y-auto p-2">
            {displayedShortcuts ? (
              // Search results (flat list)
              displayedShortcuts.length > 0 ? (
                <div className="space-y-0.5">
                  {displayedShortcuts.map((shortcut) => (
                    <ShortcutRow key={shortcut.id} shortcut={shortcut} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No shortcuts found for &quot;{search}&quot;
                </div>
              )
            ) : (
              // Grouped display (default)
              categories.map((category) => (
                <CategorySection
                  key={category}
                  category={category}
                  shortcuts={groupedShortcuts[category]}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
            <span>
              Press{' '}
              <kbd className="rounded bg-muted border px-1 font-mono text-[10px] font-medium">
                {formatKeyForPlatform('⌘')}+/
              </kbd>{' '}
              to toggle this dialog
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
