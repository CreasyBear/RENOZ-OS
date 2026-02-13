/**
 * useKeyboardShortcut
 *
 * Register a handler for a named keyboard shortcut. Auto-unregisters on unmount.
 *
 * @param shortcutId - Must match a key in SHORTCUT_MATCHERS (keyboard-shortcut-context.ts)
 * @param handler - Callback to invoke when shortcut is triggered
 *
 * @example
 * ```tsx
 * useKeyboardShortcut('go-dashboard', () => navigate({ to: '/dashboard' }));
 * useKeyboardShortcut('quick-log', () => setQuickLogOpen(true));
 * ```
 */
import { useContext, useEffect, useRef } from 'react'
import { KeyboardShortcutContext } from './keyboard-shortcut-context'

export function useKeyboardShortcut(shortcutId: string, handler: () => void) {
  const ctx = useContext(KeyboardShortcutContext)
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!ctx) return

    const stableHandler = () => handlerRef.current()
    return ctx.register(shortcutId, stableHandler)
  }, [ctx, shortcutId])
}
