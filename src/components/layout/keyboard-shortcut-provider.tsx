/**
 * Keyboard Shortcut Provider
 *
 * Centralized keyboard event handler. Supports modifier keys (Cmd/Ctrl, Shift, Alt)
 * and sequential combos (G then D).
 *
 * @example
 * ```tsx
 * <KeyboardShortcutProvider>
 *   <App />
 * </KeyboardShortcutProvider>
 * ```
 */
import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import {
  KeyboardShortcutContext,
  SHORTCUT_MATCHERS,
  SEQUENCE_TIMEOUT_MS,
  isSequential,
} from './keyboard-shortcut-context'

// ============================================================================
// PROVIDER
// ============================================================================

export function KeyboardShortcutProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef(new Map<string, () => void>())
  const pendingKeyRef = useRef<string | null>(null)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const register = useCallback((id: string, handler: () => void) => {
    handlersRef.current.set(id, handler)
    return () => {
      handlersRef.current.delete(id)
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable ||
        target?.getAttribute('role') === 'combobox'
      ) {
        if (!e.metaKey && !e.ctrlKey) return
      }

      const handlers = handlersRef.current
      const key = e.key.toLowerCase()

      if (pendingKeyRef.current) {
        const firstKey = pendingKeyRef.current
        pendingKeyRef.current = null
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current)
          pendingTimerRef.current = null
        }

        for (const [id, matcher] of Object.entries(SHORTCUT_MATCHERS)) {
          if (!isSequential(matcher)) continue
          if (
            matcher.sequence[0] === firstKey &&
            matcher.sequence[1] === key &&
            !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
          ) {
            const handler = handlers.get(id)
            if (handler) {
              e.preventDefault()
              handler()
              return
            }
          }
        }
      }

      for (const [id, matcher] of Object.entries(SHORTCUT_MATCHERS)) {
        if (isSequential(matcher)) continue

        const keyMatches = key === matcher.key
        const metaMatches = matcher.meta
          ? (e.metaKey || e.ctrlKey)
          : (!e.metaKey && !e.ctrlKey)
        const shiftMatches = matcher.shift ? e.shiftKey : !e.shiftKey
        const altMatches = matcher.alt ? e.altKey : !e.altKey

        if (keyMatches && metaMatches && shiftMatches && altMatches) {
          const handler = handlers.get(id)
          if (handler) {
            e.preventDefault()
            handler()
            return
          }
        }
      }

      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const isFirstKey = Object.values(SHORTCUT_MATCHERS).some(
          (m) => isSequential(m) && m.sequence[0] === key
        )
        if (isFirstKey) {
          pendingKeyRef.current = key
          pendingTimerRef.current = setTimeout(() => {
            pendingKeyRef.current = null
            pendingTimerRef.current = null
          }, SEQUENCE_TIMEOUT_MS)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    }
  }, [])

  return (
    <KeyboardShortcutContext.Provider value={{ register }}>
      {children}
    </KeyboardShortcutContext.Provider>
  )
}
