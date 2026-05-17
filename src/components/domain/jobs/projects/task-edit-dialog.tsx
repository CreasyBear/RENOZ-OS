import { useState } from 'react';
import { Edit3 } from 'lucide-react';

import { FormDialog, TextField, TextareaField } from '@/components/shared/forms';
import { UserInviteDialog } from '@/components/domain/users/user-invite-dialog';
import { useUserLookup } from '@/hooks/users';
import {
  ProjectTaskAssigneeField,
  ProjectTaskDueDateField,
  ProjectTaskEstimatedHoursField,
  ProjectTaskPriorityField,
  ProjectTaskStatusField,
} from './project-task-dialog-fields';
import { useProjectTaskEditDialogForm } from './project-task-edit-dialog-form';

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
  const { userMap } = useUserLookup();
  const [showUserInvite, setShowUserInvite] = useState(false);

  const {
    form,
    handleOpenChange,
    submitError,
    updateTask,
  } = useProjectTaskEditDialogForm({
    task,
    open,
    onOpenChange,
    onSuccess,
  });

  if (!task) return null;

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
