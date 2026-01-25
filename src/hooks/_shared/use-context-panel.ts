/**
 * Context Panel Hook
 *
 * Controls the open/closed state of context panels (sidebars).
 * Works with PageLayout.Sidebar to provide responsive behavior:
 * - Desktop: Always visible (fixed panel)
 * - Mobile: Opens as a drawer via this hook
 *
 * @example
 * ```tsx
 * const { isOpen, open, close, toggle } = useContextPanel();
 *
 * <Button onClick={open}>Show Details</Button>
 * <PageLayout.Sidebar isOpen={isOpen} onOpenChange={setIsOpen}>
 *   <ActivityFeed />
 * </PageLayout.Sidebar>
 * ```
 */
import { useState, useCallback } from 'react';

export interface UseContextPanelReturn {
  /** Whether the context panel is open (mobile drawer state) */
  isOpen: boolean;
  /** Open the context panel */
  open: () => void;
  /** Close the context panel */
  close: () => void;
  /** Toggle the context panel open/closed */
  toggle: () => void;
  /** Set the open state directly (for onOpenChange callbacks) */
  setIsOpen: (open: boolean) => void;
}

export function useContextPanel(defaultOpen = false): UseContextPanelReturn {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  };
}
