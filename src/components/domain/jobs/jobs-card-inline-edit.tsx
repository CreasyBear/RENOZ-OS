/**
 * JobsCardInlineEdit Component
 *
 * Inline editing component that appears on task cards for quick edits.
 * Allows editing title, description, priority, and other fields directly on the card.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { KanbanTask } from '@/hooks/jobs/use-job-tasks-kanban';

const editTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
});

type EditTaskFormData = z.infer<typeof editTaskSchema>;

export interface JobsCardInlineEditProps {
  task: KanbanTask;
  onSave: (taskId: string, data: EditTaskFormData) => Promise<void>;
  onCancel: () => void;
}

export function JobsCardInlineEdit({ task, onSave, onCancel }: JobsCardInlineEditProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: task.title,
      description: task.description || '',
      priority: task.priority,
    },
  });

  const handleSubmit = async (data: EditTaskFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(task.id, data);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(handleSubmit)();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="border-primary/50 bg-muted/30 space-y-3 rounded-lg border border-dashed p-3">
      {/* Title Input */}
      <div>
        <Input
          {...form.register('title')}
          className="focus-visible:ring-primary h-auto border-none bg-transparent p-0 text-sm font-medium focus-visible:ring-1"
          placeholder="Task title..."
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {form.formState.errors.title && (
          <p className="mt-1 text-xs text-red-600">{form.formState.errors.title.message}</p>
        )}
      </div>

      {/* Priority Selector */}
      <div>
        <Select
          value={form.watch('priority')}
          onValueChange={(value) =>
            form.setValue('priority', value as EditTaskFormData['priority'])
          }
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low Priority</SelectItem>
            <SelectItem value="normal">Normal Priority</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="urgent">Urgent Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description Input */}
      <div>
        <Textarea
          {...form.register('description')}
          className="focus-visible:ring-primary h-auto min-h-[60px] resize-none border-none bg-transparent p-0 text-xs focus-visible:ring-1"
          placeholder="Task description..."
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-7 px-2"
        >
          <X className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={form.handleSubmit(handleSubmit)}
          disabled={isSubmitting}
          className="h-7 px-2"
        >
          <Check className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Hook for managing inline edit state
export function useJobsCardInlineEdit() {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const startEditing = (taskId: string) => setEditingTaskId(taskId);
  const stopEditing = () => setEditingTaskId(null);
  const isEditing = (taskId: string) => editingTaskId === taskId;

  return {
    editingTaskId,
    startEditing,
    stopEditing,
    isEditing,
  };
}
