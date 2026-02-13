/**
 * Project Detail UI State Hook
 *
 * Manages UI state for the project detail view.
 * Separated from data fetching per STANDARDS.md:
 * "Never mix UI state with data fetching hooks."
 *
 * @see STANDARDS.md §2.3 Hook Patterns
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 6.4
 */

import { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectDetailUIState {
  // Tab State
  activeTab: string;
  onTabChange: (tab: string) => void;

  // Sidebar State
  showSidebar: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Dialog States
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  completionDialogOpen: boolean;
  setCompletionDialogOpen: (open: boolean) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  activityDialogOpen: boolean;
  setActivityDialogOpen: (open: boolean) => void;

  // Dialog Helpers
  openEditDialog: () => void;
  openDeleteDialog: () => void;
  openCompletionDialog: () => void;
  openActivityDialog: () => void;
  closeAllDialogs: () => void;
}

export interface UseProjectDetailUIOptions {
  /** Initial active tab (default: 'overview') */
  initialTab?: string;
  /** Initial sidebar visibility (default: true) */
  initialSidebarOpen?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * UI state hook for project detail view.
 *
 * Provides stable callbacks and state management for:
 * - Tab navigation
 * - Sidebar visibility
 * - Dialog open/close states
 *
 * @example
 * ```tsx
 * const ui = useProjectDetailUI({ initialTab: 'tasks' });
 *
 * return (
 *   <Tabs value={ui.activeTab} onValueChange={ui.onTabChange}>
 *     ...
 *   </Tabs>
 * );
 * ```
 */
export function useProjectDetailUI(
  options: UseProjectDetailUIOptions = {}
): ProjectDetailUIState {
  const { initialTab = 'overview', initialSidebarOpen = true } = options;

  // ─────────────────────────────────────────────────────────────────────────
  // Tab State
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(initialTab);

  const onTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Sidebar State
  // ─────────────────────────────────────────────────────────────────────────
  const [showSidebar, setShowSidebar] = useState(initialSidebarOpen);

  // Functional setState for stable callback (Vercel rerender-functional-setstate)
  const toggleSidebar = useCallback(() => {
    setShowSidebar((prev) => !prev);
  }, []);

  const setSidebarOpen = useCallback((open: boolean) => {
    setShowSidebar(open);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Dialog States
  // ─────────────────────────────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  // Dialog helpers (stable callbacks)
  const openEditDialog = useCallback(() => setEditDialogOpen(true), []);
  const openDeleteDialog = useCallback(() => setDeleteDialogOpen(true), []);
  const openCompletionDialog = useCallback(() => setCompletionDialogOpen(true), []);
  const openActivityDialog = useCallback(() => setActivityDialogOpen(true), []);

  const closeAllDialogs = useCallback(() => {
    setDeleteDialogOpen(false);
    setCompletionDialogOpen(false);
    setEditDialogOpen(false);
    setActivityDialogOpen(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // Tab State
    activeTab,
    onTabChange,

    // Sidebar State
    showSidebar,
    toggleSidebar,
    setSidebarOpen,

    // Dialog States
    deleteDialogOpen,
    setDeleteDialogOpen,
    completionDialogOpen,
    setCompletionDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    activityDialogOpen,
    setActivityDialogOpen,

    // Dialog Helpers
    openEditDialog,
    openDeleteDialog,
    openCompletionDialog,
    openActivityDialog,
    closeAllDialogs,
  };
}
