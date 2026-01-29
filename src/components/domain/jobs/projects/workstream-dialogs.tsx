/**
 * Workstream Dialogs
 *
 * Create and Edit dialogs for project workstreams.
 *
 * SPRINT-03: New components for project-centric jobs model
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers, Plus } from 'lucide-react';
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
import { useCreateWorkstream, useUpdateWorkstream } from '@/hooks/jobs';
import { toast } from '@/lib/toast';
import type { ProjectWorkstream } from 'drizzle/schema/jobs/workstreams-notes';

// ============================================================================
// SCHEMAS
// ============================================================================

const workstreamFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  defaultVisitType: z.enum([
    'assessment',
    'installation',
    'commissioning',
    'service',
    'warranty',
    'inspection',
    'maintenance',
  ]).optional(),
});

type WorkstreamFormData = z.infer<typeof workstreamFormSchema>;

// ============================================================================
// CREATE DIALOG
// ============================================================================

export interface WorkstreamCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

export function WorkstreamCreateDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: WorkstreamCreateDialogProps) {
  const createWorkstream = useCreateWorkstream(projectId);

  const form = useForm<WorkstreamFormData>({
    resolver: zodResolver(workstreamFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: WorkstreamFormData) => {
    try {
      await createWorkstream.mutateAsync({
        name: data.name,
        description: data.description,
        position: 0,
        defaultVisitType: data.defaultVisitType,
      });

      toast.success('Workstream created');
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to create workstream');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Workstream
          </DialogTitle>
          <DialogDescription>
            Create a new workstream to organize project tasks
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Site Assessment" {...field} />
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
                    <Textarea
                      placeholder="Describe this workstream..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultVisitType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Visit Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="installation">Installation</SelectItem>
                      <SelectItem value="commissioning">Commissioning</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="warranty">Warranty</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWorkstream.isPending}>
                {createWorkstream.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// EDIT DIALOG
// ============================================================================

export interface WorkstreamEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workstream: ProjectWorkstream | null;
  onSuccess?: () => void;
}

export function WorkstreamEditDialog({
  open,
  onOpenChange,
  projectId,
  workstream,
  onSuccess,
}: WorkstreamEditDialogProps) {
  const updateWorkstream = useUpdateWorkstream(projectId);

  const form = useForm<WorkstreamFormData>({
    resolver: zodResolver(workstreamFormSchema),
    defaultValues: {
      name: workstream?.name || '',
      description: workstream?.description || '',
      defaultVisitType: (workstream?.defaultVisitType as WorkstreamFormData['defaultVisitType']) || undefined,
    },
  });

  // Reset form when workstream changes
  useEffect(() => {
    if (workstream && open) {
      form.reset({
        name: workstream.name,
        description: workstream.description || '',
        defaultVisitType: (workstream.defaultVisitType as WorkstreamFormData['defaultVisitType']) || undefined,
      });
    }
  }, [workstream, open, form]);

  const onSubmit = async (data: WorkstreamFormData) => {
    if (!workstream) return;

    try {
      await updateWorkstream.mutateAsync({
        id: workstream.id,
        name: data.name,
        description: data.description,
        defaultVisitType: data.defaultVisitType,
      });

      toast.success('Workstream updated');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to update workstream');
    }
  };

  if (!workstream) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Edit Workstream
          </DialogTitle>
          <DialogDescription>Update workstream details</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
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

            <FormField
              control={form.control}
              name="defaultVisitType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Visit Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="installation">Installation</SelectItem>
                      <SelectItem value="commissioning">Commissioning</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="warranty">Warranty</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateWorkstream.isPending}>
                {updateWorkstream.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


