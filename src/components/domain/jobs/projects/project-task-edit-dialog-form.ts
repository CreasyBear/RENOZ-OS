import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  formatProjectTaskMutationError,
  useUpdateTask,
} from '@/hooks/jobs';
import {
  getProjectTaskEditDialogDefaultValues,
  getProjectTaskEditDialogResetValues,
  projectTaskEditDialogFormSchema,
} from './project-task-dialog-form-state';

import type { TaskWithWorkstream } from '@/lib/schemas/jobs';

export interface UseProjectTaskEditDialogFormOptions {
  task: TaskWithWorkstream | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function useProjectTaskEditDialogForm({
  task,
  open,
  onOpenChange,
  onSuccess,
}: UseProjectTaskEditDialogFormOptions) {
  const updateTask = useUpdateTask();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useTanStackForm({
    schema: projectTaskEditDialogFormSchema,
    defaultValues: getProjectTaskEditDialogDefaultValues(),
    onValidationError: (error) => {
      const messages = error.issues.map(i => i.message).join(', ');
      toast.error(`Validation error: ${messages}`);
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async (data) => {
      if (!task) return;

      setSubmitError(null);
      try {
        await updateTask.mutateAsync({
          taskId: task.id,
          jobId: task.jobId,
          title: data.title,
          description: data.description,
          status: data.status,
          estimatedHours: data.estimatedHours ?? undefined,
          assigneeId: data.assigneeId || undefined,
          dueDate: data.dueDate || undefined,
          priority: data.priority,
        });

        toast.success('Task updated successfully');
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } catch (error) {
        const message = formatProjectTaskMutationError(error, 'update');
        setSubmitError(message);
        toast.error(message);
      }
    },
  });

  useEffect(() => {
    if (task && open) {
      form.reset(getProjectTaskEditDialogResetValues(task));
    }
  }, [task, open, form]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && updateTask.isPending) return;
    if (!newOpen) setSubmitError(null);
    onOpenChange(newOpen);
  };

  return {
    form,
    handleOpenChange,
    submitError,
    updateTask,
  };
}
