import { useCallback, useState } from 'react';

import type { TaskWithWorkstream } from '@/lib/schemas/jobs';

export function getProjectTaskCreateDialogKey(open: boolean): 'open' | 'closed' {
  return open ? 'open' : 'closed';
}

export function getProjectTaskEditDialogOpen(task: TaskWithWorkstream | null): boolean {
  return task !== null;
}

export function shouldClearProjectTaskEditingTask(open: boolean): boolean {
  return !open;
}

export function useProjectTaskDialogState() {
  const [editingTask, setEditingTask] = useState<TaskWithWorkstream | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);

  const openCreateDialog = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const openEditTask = useCallback((task: TaskWithWorkstream) => {
    setEditingTask(task);
  }, []);

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    if (shouldClearProjectTaskEditingTask(open)) {
      setEditingTask(null);
    }
  }, []);

  return {
    editingTask,
    isCreateDialogOpen,
    createDialogKey: getProjectTaskCreateDialogKey(isCreateDialogOpen),
    isEditDialogOpen: getProjectTaskEditDialogOpen(editingTask),
    setCreateDialogOpen,
    openCreateDialog,
    openEditTask,
    handleEditDialogOpenChange,
  };
}
