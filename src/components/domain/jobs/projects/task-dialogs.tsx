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

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from '@tanstack/react-router';
import type { JobTask } from 'drizzle/schema';
import { useEffect } from 'react';
import { useUpdateTask } from '@/hooks/jobs';
import { toast } from '@/lib/toast';

// ============================================================================
// SCHEMAS
// ============================================================================

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']),
  estimatedHours: z.number().min(0).optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

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
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
      estimatedHours: undefined,
    },
  });

  // Reset form when task changes
  useEffect(() => {
    if (task && open) {
      form.reset({
        title: task.title,
        description: task.description || '',
        status: (task.status as TaskFormData['status']) || 'pending',
        estimatedHours: task.estimatedHours || undefined,
      });
    }
  }, [task, open, form]);

  const onSubmit = async (data: TaskFormData) => {
    if (!task) return;

    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        title: data.title,
        description: data.description,
        status: data.status,
        estimatedHours: data.estimatedHours,
      });
      
      toast.success('Task updated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimatedHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Hours</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="e.g., 4"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[80px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTask.isPending}>
                {updateTask.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
