/**
 * Unified Jobs Context
 *
 * Centralized state management for all job views (Kanban, Calendar, Timeline).
 * Ensures seamless switching between views with shared data and state.
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { useRealtimeJobUpdates } from '@/hooks/jobs/use-jobs-view-sync';
import { queryKeys } from '@/lib/query-keys';

// ============================================================================
// TYPES
// ============================================================================

export type JobViewType = 'kanban' | 'traditional' | 'weekly' | 'timeline';

export interface UnifiedJobFilters {
  installerIds: string[];
  statuses: string[];
  priorities: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
}

export interface UnifiedJobViewState {
  activeView: JobViewType;
  currentWeekStart: Date;
  filters: UnifiedJobFilters;
  selectedJobIds: string[];
  expandedJobs: Set<string>;
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

export type UnifiedJobAction =
  | { type: 'SET_ACTIVE_VIEW'; payload: JobViewType }
  | { type: 'SET_WEEK_START'; payload: Date }
  | { type: 'UPDATE_FILTERS'; payload: Partial<UnifiedJobFilters> }
  | { type: 'SET_SELECTED_JOBS'; payload: string[] }
  | { type: 'TOGGLE_JOB_EXPANDED'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'REFRESH_DATA' }
  | {
      type: 'JOB_DATA_CHANGED';
      payload: { jobId: string; action: 'create' | 'update' | 'delete' };
    };

// ============================================================================
// CONTEXT
// ============================================================================

interface UnifiedJobsContextType {
  state: UnifiedJobViewState;
  actions: {
    setActiveView: (view: JobViewType) => void;
    setWeekStart: (date: Date) => void;
    updateFilters: (filters: Partial<UnifiedJobFilters>) => void;
    setSelectedJobs: (jobIds: string[]) => void;
    toggleJobExpanded: (jobId: string) => void;
    refreshData: () => void;
    clearError: () => void;
    setLoading: (isLoading: boolean) => void;
    setError: (message: string | null) => void;
    // Cross-view synchronization
    notifyJobChange: (jobId: string, action: 'create' | 'update' | 'delete') => void;
  };
}

const UnifiedJobsContext = createContext<UnifiedJobsContextType | null>(null);

// ============================================================================
// REDUCER
// ============================================================================

const initialState: UnifiedJobViewState = {
  activeView: 'kanban',
  currentWeekStart: new Date(),
  filters: {
    installerIds: [],
    statuses: [],
    priorities: [],
  },
  selectedJobIds: [],
  expandedJobs: new Set(),
  lastUpdated: new Date(),
  isLoading: false,
  error: null,
};

function unifiedJobsReducer(
  state: UnifiedJobViewState,
  action: UnifiedJobAction
): UnifiedJobViewState {
  switch (action.type) {
    case 'SET_ACTIVE_VIEW':
      return {
        ...state,
        activeView: action.payload,
        // Clear view-specific state when switching
        selectedJobIds: [],
        expandedJobs: new Set(),
      };

    case 'SET_WEEK_START':
      return {
        ...state,
        currentWeekStart: action.payload,
      };

    case 'UPDATE_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
        selectedJobIds: [], // Clear selection when filters change
      };

    case 'SET_SELECTED_JOBS':
      return {
        ...state,
        selectedJobIds: action.payload,
      };

    case 'TOGGLE_JOB_EXPANDED':
      const newExpanded = new Set(state.expandedJobs);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return {
        ...state,
        expandedJobs: newExpanded,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'REFRESH_DATA':
      return {
        ...state,
        lastUpdated: new Date(),
      };

    case 'JOB_DATA_CHANGED':
      return {
        ...state,
        lastUpdated: new Date(),
      };

    default:
      return state;
  }
}

// ============================================================================
// PROVIDER
// ============================================================================

interface UnifiedJobsProviderProps {
  children: React.ReactNode;
  initialView?: JobViewType;
  initialWeekStart?: Date;
}

export function UnifiedJobsProvider({
  children,
  initialView = 'kanban',
  initialWeekStart,
}: UnifiedJobsProviderProps) {
  const [state, dispatch] = useReducer(unifiedJobsReducer, {
    ...initialState,
    activeView: initialView,
    currentWeekStart: initialWeekStart || getStartOfWeek(new Date()),
  });

  // Real-time updates integration
  useRealtimeJobUpdates(30000);

  const actions = {
    setActiveView: useCallback((view: JobViewType) => {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
    }, []),

    setWeekStart: useCallback((date: Date) => {
      dispatch({ type: 'SET_WEEK_START', payload: date });
    }, []),

    updateFilters: useCallback((filters: Partial<UnifiedJobFilters>) => {
      dispatch({ type: 'UPDATE_FILTERS', payload: filters });
    }, []),

    setSelectedJobs: useCallback((jobIds: string[]) => {
      dispatch({ type: 'SET_SELECTED_JOBS', payload: jobIds });
    }, []),

    toggleJobExpanded: useCallback((jobId: string) => {
      dispatch({ type: 'TOGGLE_JOB_EXPANDED', payload: jobId });
    }, []),

    refreshData: useCallback(() => {
      dispatch({ type: 'REFRESH_DATA' });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: 'SET_ERROR', payload: null });
    }, []),

    setLoading: useCallback((isLoading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: isLoading });
    }, []),

    setError: useCallback((message: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: message });
    }, []),

    notifyJobChange: useCallback((jobId: string, action: 'create' | 'update' | 'delete') => {
      dispatch({ type: 'JOB_DATA_CHANGED', payload: { jobId, action } });
    }, []),
  };

  const contextValue: UnifiedJobsContextType = {
    state,
    actions,
  };

  return <UnifiedJobsContext.Provider value={contextValue}>{children}</UnifiedJobsContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useUnifiedJobs(): UnifiedJobsContextType {
  const context = useContext(UnifiedJobsContext);
  if (!context) {
    throw new Error('useUnifiedJobs must be used within UnifiedJobsProvider');
  }
  return context;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Gets the start of the week for a given date.
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Adjust for Sunday start
  return new Date(d.setDate(diff));
}

/**
 * Hook for view-specific data fetching with unified state.
 */
export function useUnifiedJobData(viewType: JobViewType) {
  const { state, actions } = useUnifiedJobs();

  // This would integrate with specific data fetching hooks based on view type
  const getQueryKey = useCallback(() => {
    return [
      ...queryKeys.jobs.all,
      viewType,
      state.currentWeekStart.toISOString(),
      state.filters,
      state.lastUpdated.getTime(),
    ];
  }, [viewType, state.currentWeekStart, state.filters, state.lastUpdated]);

  const getCommonQueryOptions = useCallback(
    () => ({
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    }),
    []
  );

  return {
    queryKey: getQueryKey(),
    queryOptions: getCommonQueryOptions(),
    state,
    actions,
  };
}

// ============================================================================
// CROSS-VIEW SYNCHRONIZATION
// ============================================================================

/**
 * Hook for cross-view synchronization of job mutations.
 */
export function useCrossViewJobSync() {
  const { actions } = useUnifiedJobs();

  const handleJobMutation = useCallback(
    (
      mutationFn: () => Promise<any>,
      options: {
        onSuccess?: (data: any) => void;
        onError?: (error: Error) => void;
        optimisticUpdate?: () => void;
      } = {}
    ) => {
      const { onSuccess, onError, optimisticUpdate } = options;

      // Apply optimistic update if provided
      if (optimisticUpdate) {
        optimisticUpdate();
      }

      return mutationFn()
        .then((data) => {
          // Notify all views of the change
          if (data?.jobId) {
            actions.notifyJobChange(data.jobId, 'update');
          }
          onSuccess?.(data);
          return data;
        })
        .catch((error) => {
          onError?.(error);
          throw error;
        });
    },
    [actions]
  );

  return {
    handleJobMutation,
    notifyJobChange: actions.notifyJobChange,
  };
}

// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================

/**
 * Hook for performance monitoring across job views.
 */
export function useJobViewPerformance() {
  const { state } = useUnifiedJobs();

  const trackViewSwitch = useCallback(
    (fromView: JobViewType, toView: JobViewType, duration: number) => {
      // Track view switching performance
      console.log(`View switch: ${fromView} -> ${toView} (${duration}ms)`);
    },
    []
  );

  const trackDataLoad = useCallback(
    (viewType: JobViewType, duration: number, itemCount: number) => {
      // Track data loading performance
      console.log(`${viewType} data load: ${duration}ms for ${itemCount} items`);
    },
    []
  );

  return {
    trackViewSwitch,
    trackDataLoad,
    currentView: state.activeView,
  };
}
