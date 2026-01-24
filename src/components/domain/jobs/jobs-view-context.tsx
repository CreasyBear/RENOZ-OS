'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type JobsViewType = 'traditional' | 'weekly' | 'timeline' | 'kanban';

export interface JobsViewFilters {
  installerIds: string[];
  statuses: string[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface JobsViewState {
  activeView: JobsViewType;
  filters: JobsViewFilters;
  weekStart: Date;
}

interface JobsViewContextValue {
  // View state
  activeView: JobsViewType;
  setActiveView: (view: JobsViewType) => void;

  // Filters
  filters: JobsViewFilters;
  setFilters: (filters: JobsViewFilters) => void;
  updateFilters: (updates: Partial<JobsViewFilters>) => void;

  // Week navigation
  weekStart: Date;
  setWeekStart: (date: Date) => void;

  // Persistence
  saveViewPreferences: () => void;
  loadViewPreferences: () => void;

  // Computed values
  hasActiveFilters: boolean;
  filteredInstallerCount: number;
  filteredStatusCount: number;
}

const JobsViewContext = createContext<JobsViewContextValue | null>(null);

const STORAGE_KEY = 'jobs-view-preferences';

const defaultFilters: JobsViewFilters = {
  installerIds: [],
  statuses: [],
};

const defaultState: JobsViewState = {
  activeView: 'traditional',
  filters: defaultFilters,
  weekStart: (() => {
    // Start from the beginning of the current week (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  })(),
};

export function JobsViewProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<JobsViewType>(defaultState.activeView);
  const [filters, setFilters] = useState<JobsViewFilters>(defaultState.filters);
  const [weekStart, setWeekStart] = useState<Date>(defaultState.weekStart);

  // Load preferences on mount
  useEffect(() => {
    loadViewPreferences();
  }, []);

  // Save preferences when state changes
  useEffect(() => {
    saveViewPreferences();
  }, [activeView, filters, weekStart]);

  const updateFilters = useCallback((updates: Partial<JobsViewFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveViewPreferences = useCallback(() => {
    try {
      const preferences = {
        activeView,
        filters,
        weekStart: weekStart.toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save jobs view preferences:', error);
    }
  }, [activeView, filters, weekStart]);

  const loadViewPreferences = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const preferences = JSON.parse(saved);
        setActiveView(preferences.activeView || defaultState.activeView);
        setFilters(preferences.filters || defaultState.filters);
        if (preferences.weekStart) {
          setWeekStart(new Date(preferences.weekStart));
        }
      }
    } catch (error) {
      console.warn('Failed to load jobs view preferences:', error);
    }
  }, []);

  // Computed values
  const hasActiveFilters = filters.installerIds.length > 0 || filters.statuses.length > 0;
  const filteredInstallerCount = filters.installerIds.length;
  const filteredStatusCount = filters.statuses.length;

  const value: JobsViewContextValue = {
    activeView,
    setActiveView,
    filters,
    setFilters,
    updateFilters,
    weekStart,
    setWeekStart,
    saveViewPreferences,
    loadViewPreferences,
    hasActiveFilters,
    filteredInstallerCount,
    filteredStatusCount,
  };

  return <JobsViewContext.Provider value={value}>{children}</JobsViewContext.Provider>;
}

export function useJobsView() {
  const context = useContext(JobsViewContext);
  if (!context) {
    throw new Error('useJobsView must be used within a JobsViewProvider');
  }
  return context;
}

// Hook for cross-view data synchronization
export function useJobsViewSync() {
  const { activeView, filters, weekStart } = useJobsView();

  // Calculate date range based on current view and week
  const dateRange = React.useMemo(() => {
    if (activeView === 'traditional') {
      // Traditional calendar: show broader range
      const start = new Date(weekStart);
      start.setDate(start.getDate() - 7); // 1 week before
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 21); // 3 weeks after
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    } else {
      // Weekly calendar and timeline: show current week
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      return {
        startDate: weekStart.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    }
  }, [activeView, weekStart]);

  // Return unified query parameters for all views
  return {
    dateRange,
    installerIds: filters.installerIds.length > 0 ? filters.installerIds : undefined,
    statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
  };
}
