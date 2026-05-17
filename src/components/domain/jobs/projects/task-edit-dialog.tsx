import { useEffect, useState } from 'react';
import { Edit3 } from 'lucide-react';

import { FormDialog, TextField, TextareaField } from '@/components/shared/forms';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { formatProjectTaskMutationError, useUpdateTask } from '@/hooks/jobs';
import { UserInviteDialog } from '@/components/domain/users/user-invite-dialog';
import { useUserLookup } from '@/hooks/users';
import { toast } from 'sonner';
import {
  getProjectTaskEditDialogDefaultValues,
  getProjectTaskEditDialogResetValues,
  projectTaskEditDialogFormSchema,
} from './project-task-dialog-form-state';
import {
  ProjectTaskAssigneeField,
  ProjectTaskDueDateField,
  ProjectTaskEstimatedHoursField,
  ProjectTaskPriorityField,
  ProjectTaskStatusField,
} from './project-task-dialog-fields';

import type { TaskWithWorkstream } from '@/lib/schemas/jobs';

export interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task: TaskWithWorkstream | null;
  onSuccess?: () => void;
}

export function TaskEditDialog({
  open,
  onOpenChange,
  projectId: _projectId,
  task,
  onSuccess,
}: TaskEditDialogProps) {
  const updateTask = useUpdateTask();
  const { userMap } = useUserLookup();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showUserInvite, setShowUserInvite] = useState(false);

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

  if (!task) return null;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && updateTask.isPending) return;
    if (!newOpen) setSubmitError(null);
    onOpenChange(newOpen);
  };

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={
          <span className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Task
          </span>
        }
        description={
          <>
            Update task details
            <span className="ml-2 text-xs text-muted-foreground">(Cmd+Enter to save)</span>
          </>
        }
        form={form}
        submitLabel="Save Changes"
        loadingLabel="Saving..."
        submitError={submitError}
        submitDisabled={updateTask.isPending}
        size="lg"
        className="max-w-lg"
        resetOnClose={false}
      >
        <form.Field name="title">
          {(field) => (
            <TextField
              field={field}
              label="Title"
              required
            />
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <TextareaField
              field={field}
              label="Description"
              rows={3}
            />
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="status">
            {(field) => <ProjectTaskStatusField field={field} />}
          </form.Field>

          <form.Field name="priority">
            {(field) => <ProjectTaskPriorityField field={field} />}
          </form.Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="assigneeId">
            {(field) => (
              <ProjectTaskAssigneeField
                field={field}
                users={Array.from(userMap.values())}
                emptyValue={null}
                onInviteUser={() => setShowUserInvite(true)}
              />
            )}
          </form.Field>

          <form.Field name="dueDate">
            {(field) => <ProjectTaskDueDateField field={field} emptyValue={null} />}
          </form.Field>
        </div>

        <form.Field name="estimatedHours">
          {(field) => (
            <ProjectTaskEstimatedHoursField
              field={field}
              placeholder="e.g., 4"
            />
          )}
        </form.Field>
      </FormDialog>

      <UserInviteDialog
        open={showUserInvite}
        onOpenChange={setShowUserInvite}
        onSuccess={() => {}}
      />
    </>
  );
}
