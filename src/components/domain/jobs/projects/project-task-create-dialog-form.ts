import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  formatProjectTaskMutationError,
  useCreateTask,
} from '@/hooks/jobs';
import {
  getProjectTaskCreateDialogDefaultValues,
  getProjectTaskCreateMoreResetValues,
  projectTaskCreateDialogFormSchema,
  type ProjectTaskTemplateOption,
} from './project-task-dialog-form-state';

export interface UseProjectTaskCreateDialogFormOptions {
  projectId: string;
  selectedSiteVisitId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function useProjectTaskCreateDialogForm({
  projectId,
  selectedSiteVisitId,
  onOpenChange,
  onSuccess,
}: UseProjectTaskCreateDialogFormOptions) {
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createMore, setCreateMore] = useState(false);

  const form = useTanStackForm({
    schema: projectTaskCreateDialogFormSchema,
    defaultValues: getProjectTaskCreateDialogDefaultValues(),
    onValidationError: (error) => {
      const messages = error.issues.map(i => i.message).join(', ');
      toast.error(`Validation error: ${messages}`);
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async (values) => {
      setSubmitError(null);
      try {
        await createTask.mutateAsync({
          projectId,
          siteVisitId: selectedSiteVisitId || undefined,
          title: values.title,
          description: values.description || undefined,
          assigneeId: values.assigneeId || undefined,
          dueDate: values.dueDate || undefined,
          priority: values.priority || 'normal',
          estimatedHours: values.estimatedHours ?? undefined,
          workstreamId: values.workstreamId || undefined,
          status: 'pending',
        });

        toast.success('Task created successfully', {
          action: {
            label: 'View Tasks',
            onClick: () => {
              onOpenChange(false);
              navigate({ to: '/projects/$projectId', params: { projectId }, search: { tab: 'tasks' } });
            },
          },
        });

        if (createMore) {
          form.reset(getProjectTaskCreateMoreResetValues(values));
        } else {
          onOpenChange(false);
          form.reset();
        }

        onSuccess?.();
      } catch (error) {
        const message = formatProjectTaskMutationError(error, 'create');
        setSubmitError(message);
        toast.error(message);
      }
    },
  });

  const applyTemplate = (option: ProjectTaskTemplateOption) => {
    form.setFieldValue('title', option.title);
    form.setFieldValue('description', option.description ?? '');
  };

  const setWorkstreamId = (workstreamId: string) => {
    form.setFieldValue('workstreamId', workstreamId);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && createTask.isPending) return;
    if (!newOpen) setSubmitError(null);
    onOpenChange(newOpen);
  };

  return {
    applyTemplate,
    createMore,
    createTask,
    form,
    handleOpenChange,
    setCreateMore,
    setWorkstreamId,
    submitError,
  };
}
