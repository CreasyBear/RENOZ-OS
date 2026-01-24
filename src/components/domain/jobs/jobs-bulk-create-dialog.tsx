/**
 * JobsBulkCreateDialog Component
 *
 * Dialog for bulk creating multiple tasks at once within kanban columns.
 * Supports templates and quick forms for efficient task creation.
 */

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Copy, Trash2, Form } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCreateTask } from '@/hooks/jobs';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  estimatedHours: z.number().min(0).optional(),
});

const bulkCreateSchema = z.object({
  tasks: z.array(taskSchema).min(1, 'At least one task is required'),
});

type BulkCreateFormData = z.infer<typeof bulkCreateSchema>;

// Task templates for common job types
const TASK_TEMPLATES = {
  installation: [
    {
      title: 'Site preparation and assessment',
      description: 'Assess installation site, check requirements, prepare area',
      priority: 'normal' as const,
      estimatedHours: 2,
    },
    {
      title: 'Equipment setup and configuration',
      description: 'Install and configure equipment according to specifications',
      priority: 'high' as const,
      estimatedHours: 4,
    },
    {
      title: 'Testing and quality check',
      description: 'Test all functionality and perform quality assurance',
      priority: 'high' as const,
      estimatedHours: 2,
    },
    {
      title: 'Customer training and handover',
      description: 'Train customer on operation and provide documentation',
      priority: 'normal' as const,
      estimatedHours: 1,
    },
  ],
  service: [
    {
      title: 'Initial diagnosis',
      description: 'Diagnose the issue and identify root cause',
      priority: 'normal' as const,
      estimatedHours: 1,
    },
    {
      title: 'Parts procurement',
      description: 'Order and receive required replacement parts',
      priority: 'high' as const,
      estimatedHours: 1,
    },
    {
      title: 'Repair work',
      description: 'Perform the necessary repairs and maintenance',
      priority: 'high' as const,
      estimatedHours: 3,
    },
    {
      title: 'Final testing and verification',
      description: 'Test repairs and ensure everything works correctly',
      priority: 'high' as const,
      estimatedHours: 1,
    },
  ],
  warranty: [
    {
      title: 'Warranty claim verification',
      description: 'Verify warranty coverage and claim details',
      priority: 'normal' as const,
      estimatedHours: 1,
    },
    {
      title: 'Parts assessment',
      description: 'Assess damaged parts and determine replacement needs',
      priority: 'normal' as const,
      estimatedHours: 1,
    },
    {
      title: 'Repair execution',
      description: 'Perform warranty repair work',
      priority: 'high' as const,
      estimatedHours: 2,
    },
    {
      title: 'Documentation and follow-up',
      description: 'Document repair and follow up with customer',
      priority: 'normal' as const,
      estimatedHours: 1,
    },
  ],
};

export interface JobsBulkCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnId: string;
  jobId?: string; // Optional: if creating for a specific job
}

export function JobsBulkCreateDialog({
  open,
  onOpenChange,
  columnId,
  jobId,
}: JobsBulkCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTaskMutation = useCreateTask();

  const form = useForm<BulkCreateFormData>({
    resolver: zodResolver(bulkCreateSchema),
    defaultValues: {
      tasks: [{ title: '', description: '', priority: 'normal', estimatedHours: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tasks',
  });

  const columnName =
    {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      blocked: 'Blocked',
    }[columnId] || columnId;

  const handleSubmit = async (data: BulkCreateFormData) => {
    if (!jobId) {
      // For now, bulk task creation requires a job context
      // In a future iteration, we could allow job selection here
      console.warn('No jobId provided for bulk task creation');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create all tasks sequentially
      for (const taskData of data.tasks) {
        await createTaskMutation.mutateAsync({
          jobId,
          title: taskData.title,
          description: taskData.description || '',
          status: columnId as any,
          priority: taskData.priority,
          estimatedHours: taskData.estimatedHours,
        });
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create tasks:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  const addTask = () => {
    append({ title: '', description: '', priority: 'normal', estimatedHours: undefined });
  };

  const removeTask = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const applyTemplate = (templateKey: keyof typeof TASK_TEMPLATES) => {
    const template = TASK_TEMPLATES[templateKey];
    form.setValue(
      'tasks',
      template.map((task) => ({
        title: task.title,
        description: task.description,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
      }))
    );
  };

  const duplicateTask = (index: number) => {
    const currentTask = form.getValues(`tasks.${index}`);
    append({
      title: `${currentTask.title} (Copy)`,
      description: currentTask.description,
      priority: currentTask.priority,
      estimatedHours: currentTask.estimatedHours,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Create Tasks in {columnName}</DialogTitle>
          <DialogDescription>
            Create multiple tasks at once. All tasks will start in the {columnName.toLowerCase()}{' '}
            status.
          </DialogDescription>
        </DialogHeader>

        {/* Template Buttons */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Quick Templates:</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyTemplate('installation')}
            >
              Installation Tasks
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyTemplate('service')}
            >
              Service Tasks
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyTemplate('warranty')}
            >
              Warranty Tasks
            </Button>
          </div>
        </div>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border-border space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Task {index + 1}</Badge>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateTask(index)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTask(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title *</label>
                      <Input
                        {...form.register(`tasks.${index}.title`)}
                        placeholder="Enter task title..."
                      />
                      {form.formState.errors.tasks?.[index]?.title && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.tasks[index]?.title?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select
                        onValueChange={(value) =>
                          form.setValue(`tasks.${index}.priority`, value as any)
                        }
                        defaultValue={form.watch(`tasks.${index}.priority`)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description (Optional)</label>
                    <Textarea
                      {...form.register(`tasks.${index}.description`)}
                      placeholder="Enter task description..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estimated Hours (Optional)</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      {...form.register(`tasks.${index}.estimatedHours`, {
                        valueAsNumber: true,
                      })}
                      placeholder="e.g. 2.5"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={addTask} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Another Task
              </Button>

              <div className="text-muted-foreground text-sm">
                {fields.length} task{fields.length !== 1 ? 's' : ''} to create
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Creating...'
                  : `Create ${fields.length} Task${fields.length !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
