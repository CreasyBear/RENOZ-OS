/**
 * UI State Store - Gold Standard from Midday
 *
 * Centralized Zustand store for UI state management.
 * Eliminates scattered useState calls for global UI concerns.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// UI STATE INTERFACE
// ============================================================================

interface UiState {
  // Sidebar
  sidebarCollapsed: boolean;

  // Theme
  theme: 'light' | 'dark' | 'system';

  // Modals/Dialogs
  activeModal: string | null;
  modalStack: string[];

  // Loading states
  globalLoading: boolean;
  globalLoadingMessage?: string;

  // Notifications
  notificationsEnabled: boolean;
  soundEnabled: boolean;

  // Table settings (per table)
  tableSettings: Record<
    string,
    {
      pageSize: number;
      columnVisibility: Record<string, boolean>;
      sorting: Array<{ id: string; desc: boolean }>;
    }
  >;

  // Search state
  searchQuery: string;
  searchFilters: Record<string, any>;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  openModal: (modalId: string) => void;
  closeModal: (modalId?: string) => void;
  closeAllModals: () => void;

  setGlobalLoading: (loading: boolean, message?: string) => void;

  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;

  updateTableSettings: (
    tableId: string,
    settings: Partial<UiState['tableSettings'][string]>
  ) => void;
  getTableSettings: (tableId: string) => UiState['tableSettings'][string] | undefined;

  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: Record<string, any>) => void;
  clearSearch: () => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarCollapsed: false,
      theme: 'system',
      activeModal: null,
      modalStack: [],
      globalLoading: false,
      notificationsEnabled: true,
      soundEnabled: true,
      tableSettings: {},
      searchQuery: '',
      searchFilters: {},

      // Sidebar actions
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Theme actions
      setTheme: (theme) => set({ theme }),

      // Modal actions
      openModal: (modalId) =>
        set((state) => ({
          activeModal: modalId,
          modalStack: [...state.modalStack.filter((id) => id !== modalId), modalId],
        })),

      closeModal: (modalId) =>
        set((state) => {
          const newStack = modalId
            ? state.modalStack.filter((id) => id !== modalId)
            : state.modalStack.slice(0, -1);

          return {
            modalStack: newStack,
            activeModal: newStack[newStack.length - 1] || null,
          };
        }),

      closeAllModals: () => set({ activeModal: null, modalStack: [] }),

      // Loading actions
      setGlobalLoading: (loading, message) =>
        set({ globalLoading: loading, globalLoadingMessage: message }),

      // Notification actions
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      // Table settings actions
      updateTableSettings: (tableId, settings) =>
        set((state) => ({
          tableSettings: {
            ...state.tableSettings,
            [tableId]: {
              ...state.tableSettings[tableId],
              ...settings,
            },
          },
        })),

      getTableSettings: (tableId) => get().tableSettings[tableId],

      // Search actions
      setSearchQuery: (query) => set({ searchQuery: query }),

      setSearchFilters: (filters) => set({ searchFilters: filters }),

      clearSearch: () => set({ searchQuery: '', searchFilters: {} }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        notificationsEnabled: state.notificationsEnabled,
        soundEnabled: state.soundEnabled,
        tableSettings: state.tableSettings,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Selector for sidebar state
 */
export const useSidebarState = () =>
  useUiStore((state) => ({
    collapsed: state.sidebarCollapsed,
    toggle: state.toggleSidebar,
    setCollapsed: state.setSidebarCollapsed,
  }));

/**
 * Selector for theme state
 */
export const useThemeState = () =>
  useUiStore((state) => ({
    theme: state.theme,
    setTheme: state.setTheme,
  }));

/**
 * Selector for modal state
 */
export const useModalState = () =>
  useUiStore((state) => ({
    activeModal: state.activeModal,
    modalStack: state.modalStack,
    openModal: state.openModal,
    closeModal: state.closeModal,
    closeAllModals: state.closeAllModals,
    isModalOpen: (modalId: string) => state.modalStack.includes(modalId),
  }));

/**
 * Selector for global loading state
 */
export const useGlobalLoadingState = () =>
  useUiStore((state) => ({
    isLoading: state.globalLoading,
    message: state.globalLoadingMessage,
    setLoading: state.setGlobalLoading,
  }));

/**
 * Selector for table settings
 */
export const useTableSettings = (tableId: string) => {
  const settings = useUiStore((state) => state.getTableSettings(tableId));
  const updateSettings = useUiStore((state) => state.updateTableSettings);

  return {
    settings: settings || {
      pageSize: 20,
      columnVisibility: {},
      sorting: [],
    },
    updateSettings: (newSettings: Partial<NonNullable<typeof settings>>) =>
      updateSettings(tableId, newSettings),
  };
};
