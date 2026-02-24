/**
 * Workstream Dialogs
 *
 * Create and Edit dialogs for project workstreams.
 *
 * SPRINT-03: New components for project-centric jobs model
 * SPRINT-05: Migrated to TanStack Form
 */

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Layers, Plus } from 'lucide-react';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  FormDialog,
  TextField,
  TextareaField,
  SelectField,
} from '@/components/shared/forms';
import { useCreateWorkstream, useUpdateWorkstream } from '@/hooks/jobs';
import { toast } from 'sonner';
import type { ProjectWorkstream } from '@/lib/schemas/jobs';

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

/** Parse API defaultVisitType (string | null) to form enum or undefined */
function parseDefaultVisitType(
  raw: string | null | undefined
): WorkstreamFormData['defaultVisitType'] {
  const parsed = workstreamFormSchema.shape.defaultVisitType.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

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

  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useTanStackForm({
    schema: workstreamFormSchema,
    defaultValues: {
      name: '',
      description: '',
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async (data) => {
      setSubmitError(null);
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create workstream';
        setSubmitError(msg);
        toast.error(msg);
      }
    },
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => setSubmitError(null), 0);
      form.reset({
        name: '',
        description: '',
        defaultVisitType: undefined,
      });
    }
  }, [open, form]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && createWorkstream.isPending) return;
    if (!newOpen) setSubmitError(null);
    onOpenChange(newOpen);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Workstream
        </span>
      }
      description="Create a new workstream to organize project tasks"
      form={form}
      submitLabel="Create"
      submitError={submitError}
      submitDisabled={createWorkstream.isPending}
      size="md"
      className="max-w-md"
      resetOnClose={false}
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
    </FormDialog>
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useTanStackForm({
    schema: workstreamFormSchema,
    defaultValues: {
      name: workstream?.name || '',
      description: workstream?.description || '',
      defaultVisitType: parseDefaultVisitType(workstream?.defaultVisitType),
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async (data) => {
      if (!workstream) return;

      setSubmitError(null);
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update workstream';
        setSubmitError(msg);
        toast.error(msg);
      }
    },
  });

  useEffect(() => {
    if (workstream && open) {
      setTimeout(() => setSubmitError(null), 0);
      form.reset({
        name: workstream.name,
        description: workstream.description || '',
        defaultVisitType: parseDefaultVisitType(workstream.defaultVisitType),
      });
    }
  }, [workstream, open, form]);

  if (!workstream) return null;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && updateWorkstream.isPending) return;
    if (!newOpen) setSubmitError(null);
    onOpenChange(newOpen);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Edit Workstream
        </span>
      }
      description="Update workstream details"
      form={form}
      submitLabel="Save Changes"
      submitError={submitError}
      submitDisabled={updateWorkstream.isPending}
      size="md"
      className="max-w-md"
      resetOnClose={false}
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
    </FormDialog>
  );
}


