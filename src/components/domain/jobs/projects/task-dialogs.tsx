/**
 * Task Dialogs
 *
 * Create and Edit dialogs for project tasks.
 *
 * NOTE: Tasks in this system are created within site visits, not directly
 * under projects. These dialogs provide guidance to users.
 *
 * SPRINT-03: New components for project-centric jobs model
 * SPRINT-05: Wired up TaskEditDialog with API integration
 */

import { useEffect } from 'react';
import { z } from 'zod';
import { Plus, Info, Edit3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import type { JobTask } from 'drizzle/schema';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { TextField, TextareaField, SelectField, NumberField } from '@/components/shared/forms';
import { useUpdateTask } from '@/hooks/jobs';
import { toast } from '@/lib/toast';

// ============================================================================
// SCHEMAS
// ============================================================================

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']),
  estimatedHours: z.number().min(0).optional().nullable(),
});

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

// ============================================================================
// CREATE DIALOG
// ============================================================================

export interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defaultWorkstreamId?: string;
  onSuccess?: () => void;
}

export function TaskCreateDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess: _onSuccess,
}: TaskCreateDialogProps) {
  const navigate = useNavigate();

  const handleGoToSchedule = () => {
    onOpenChange(false);
    navigate({ to: '/schedule/calendar', search: { projectId } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Task
          </DialogTitle>
          <DialogDescription>
            Tasks are created within site visits
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Tasks are part of site visits</p>
              <p className="text-muted-foreground mt-1">
                In this system, tasks are created within site visits. Go to the schedule
                to create a site visit and add tasks to it.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGoToSchedule}>
            Go to Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// EDIT DIALOG
// ============================================================================

export interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task: JobTask | null;
  onSuccess?: () => void;
}

export function TaskEditDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
}: TaskEditDialogProps) {
  const updateTask = useUpdateTask();

  const form = useTanStackForm({
    schema: taskFormSchema,
    defaultValues: {
      title: '',
      description: '',
      status: 'pending' as const,
      estimatedHours: null,
    },
    onSubmit: async (data) => {
      if (!task) return;

      try {
        await updateTask.mutateAsync({
          taskId: task.id,
          title: data.title,
          description: data.description,
          status: data.status,
          estimatedHours: data.estimatedHours ?? undefined,
        });

        toast.success('Task updated successfully');
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } catch (error) {
        console.error('Error updating task:', error);
        toast.error('Failed to update task');
      }
    },
  });

  // Reset form when task changes
  useEffect(() => {
    if (task && open) {
      form.reset({
        title: task.title,
        description: task.description || '',
        status: (task.status as 'pending' | 'in_progress' | 'completed' | 'blocked') || 'pending',
        estimatedHours: task.estimatedHours || null,
      });
    }
  }, [task, open, form]);

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Task
          </DialogTitle>
          <DialogDescription>Update task details</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
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

          <form.Field name="status">
            {(field) => (
              <SelectField
                field={field}
                label="Status"
                options={statusOptions}
              />
            )}
          </form.Field>

          <form.Field name="estimatedHours">
            {(field) => (
              <NumberField
                field={field}
                label="Estimated Hours"
                placeholder="e.g., 4"
                min={0}
                step={0.5}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTask.isPending}>
              {updateTask.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
