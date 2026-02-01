/**
 * Workstream Dialogs
 *
 * Create and Edit dialogs for project workstreams.
 *
 * SPRINT-03: New components for project-centric jobs model
 * SPRINT-05: Migrated to TanStack Form
 */

import { useEffect } from 'react';
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

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { TextField, TextareaField, SelectField } from '@/components/shared/forms';
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

const visitTypeOptions = [
  { value: 'assessment', label: 'Assessment' },
  { value: 'installation', label: 'Installation' },
  { value: 'commissioning', label: 'Commissioning' },
  { value: 'service', label: 'Service' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'maintenance', label: 'Maintenance' },
];

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

  const form = useTanStackForm({
    schema: workstreamFormSchema,
    defaultValues: {
      name: '',
      description: '',
    },
    onSubmit: async (data) => {
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
      } catch {
        toast.error('Failed to create workstream');
      }
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: '',
        description: '',
        defaultVisitType: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form.reset is stable
  }, [open]);

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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(field) => (
              <TextField
                field={field}
                label="Name"
                placeholder="e.g., Site Assessment"
                required
              />
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <TextareaField
                field={field}
                label="Description"
                placeholder="Describe this workstream..."
                rows={3}
              />
            )}
          </form.Field>

          <form.Field name="defaultVisitType">
            {(field) => (
              <SelectField
                field={field}
                label="Default Visit Type"
                placeholder="Select type (optional)"
                options={visitTypeOptions}
              />
            )}
          </form.Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createWorkstream.isPending}>
              {createWorkstream.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
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

  const form = useTanStackForm({
    schema: workstreamFormSchema,
    defaultValues: {
      name: workstream?.name || '',
      description: workstream?.description || '',
      defaultVisitType: (workstream?.defaultVisitType as WorkstreamFormData['defaultVisitType']) || undefined,
    },
    onSubmit: async (data) => {
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
      } catch {
        toast.error('Failed to update workstream');
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form.reset is stable
  }, [workstream, open]);

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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(field) => (
              <TextField
                field={field}
                label="Name"
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

          <form.Field name="defaultVisitType">
            {(field) => (
              <SelectField
                field={field}
                label="Default Visit Type"
                placeholder="Select type (optional)"
                options={visitTypeOptions}
              />
            )}
          </form.Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateWorkstream.isPending}>
              {updateWorkstream.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


