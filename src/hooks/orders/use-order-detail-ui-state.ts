'use client';

import { useCallback, useState } from 'react';

export function useOrderDetailUiState() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSidebar, setShowSidebar] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setShowSidebar((prev) => !prev);
  }, []);

  return {
    activeTab,
    onTabChange: setActiveTab,
    showSidebar,
    toggleSidebar,
    deleteDialogOpen,
    setDeleteDialogOpen,
    activityDialogOpen,
    setActivityDialogOpen,
  };
}
