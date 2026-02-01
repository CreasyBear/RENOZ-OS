/**
 * ProjectCreateDialog Component
 *
 * Dialog for creating new projects.
 * Based on patterns from job-create-dialog and reference project-wizard.
 *
 * SPRINT-03: New component for project-centric jobs model
 */

import { useMemo, useEffect } from 'react';
import { z } from 'zod';
import { Folder, MapPin, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  TextField,
  TextareaField,
  SelectField,
  NumberField,
  DateField,
} from '@/components/shared/forms';
import { useCreateProject } from '@/hooks/jobs';
import { useCustomers } from '@/hooks/customers';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';

// ============================================================================
// SCHEMA
// ============================================================================

const createProjectFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  customerId: z.string().min(1, 'Customer is required'),
  projectType: z.enum(['solar', 'battery', 'solar_battery', 'service', 'warranty', 'inspection', 'commissioning']),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  siteAddress: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string(),
  }),
  startDate: z.date().optional().nullable(),
  targetCompletionDate: z.date().optional().nullable(),
  estimatedTotalValue: z.number().min(0).optional().nullable(),
});

const projectTypeOptions = [
  { value: 'solar', label: 'Solar Only' },
  { value: 'battery', label: 'Battery Only' },
  { value: 'solar_battery', label: 'Solar + Battery' },
  { value: 'service', label: 'Service' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'commissioning', label: 'Commissioning' },
];

const priorityOptions = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected customer ID (optional) */
  defaultCustomerId?: string;
  /** Callback after successful creation */
  onSuccess?: (projectId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProjectCreateDialog({
  open,
  onOpenChange,
  defaultCustomerId,
  onSuccess,
}: ProjectCreateDialogProps) {
  const createProject = useCreateProject();
  const { data: customersData } = useCustomers({ pageSize: 100 });

  const customers = useMemo(() => {
    return customersData?.items ?? [];
  }, [customersData]);

  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: customer.name,
  }));

  const form = useTanStackForm({
    schema: createProjectFormSchema,
    defaultValues: {
      title: '',
      description: '',
      customerId: defaultCustomerId || '',
      projectType: 'solar_battery' as const,
      priority: 'medium' as const,
      siteAddress: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Australia',
      },
      startDate: null,
      targetCompletionDate: null,
      estimatedTotalValue: null,
    },
    onSubmit: async (data) => {
      try {
        const result = await createProject.mutateAsync({
          title: data.title,
          description: data.description,
          customerId: data.customerId,
          projectType: data.projectType,
          priority: data.priority,
          siteAddress: data.siteAddress,
          startDate: data.startDate ? format(data.startDate, 'yyyy-MM-dd') : undefined,
          targetCompletionDate: data.targetCompletionDate
            ? format(data.targetCompletionDate, 'yyyy-MM-dd')
            : undefined,
          estimatedTotalValue: data.estimatedTotalValue ?? undefined,
          // Required by API schema with defaults
          scope: { inScope: [], outOfScope: [] },
          outcomes: [],
          keyFeatures: { p0: [], p1: [], p2: [] },
        });

        toast.success('Project created successfully');
        onOpenChange(false);
        form.reset();
        onSuccess?.(result.id);
      } catch {
        toast.error('Failed to create project');
      }
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: '',
        description: '',
        customerId: defaultCustomerId || '',
        projectType: 'solar_battery',
        priority: 'medium',
        siteAddress: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'Australia',
        },
        startDate: null,
        targetCompletionDate: null,
        estimatedTotalValue: null,
      });
    }
  }, [open, defaultCustomerId, form]);

  const isSubmitting = createProject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Create a new project for solar or battery installation.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex-1 overflow-hidden"
        >
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>

                <form.Field name="title">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Project Title"
                      placeholder="e.g., Smith Residence Solar Installation"
                      required
                    />
                  )}
                </form.Field>

                <form.Field name="description">
                  {(field) => (
                    <TextareaField
                      field={field}
                      label="Description"
                      placeholder="Brief description of the project..."
                      rows={3}
                    />
                  )}
                </form.Field>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="customerId">
                    {(field) => (
                      <SelectField
                        field={field}
                        label="Customer"
                        options={customerOptions}
                        placeholder="Select customer"
                        required
                      />
                    )}
                  </form.Field>

                  <form.Field name="projectType">
                    {(field) => (
                      <SelectField
                        field={field}
                        label="Project Type"
                        options={projectTypeOptions}
                        required
                      />
                    )}
                  </form.Field>
                </div>

                <form.Field name="priority">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Priority"
                      options={priorityOptions}
                      required
                    />
                  )}
                </form.Field>
              </div>

              {/* Site Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Site Address
                </h3>

                <form.Field name="siteAddress.street">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Street Address"
                      placeholder="123 Main St"
                      required
                    />
                  )}
                </form.Field>

                <div className="grid grid-cols-3 gap-4">
                  <form.Field name="siteAddress.city">
                    {(field) => (
                      <TextField
                        field={field}
                        label="City"
                        required
                      />
                    )}
                  </form.Field>

                  <form.Field name="siteAddress.state">
                    {(field) => (
                      <TextField
                        field={field}
                        label="State"
                        required
                      />
                    )}
                  </form.Field>

                  <form.Field name="siteAddress.postalCode">
                    {(field) => (
                      <TextField
                        field={field}
                        label="Postal Code"
                        required
                      />
                    )}
                  </form.Field>
                </div>
              </div>

              {/* Dates & Value */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline & Value
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="startDate">
                    {(field) => (
                      <DateField
                        field={field}
                        label="Start Date (Optional)"
                        placeholder="Pick a date"
                      />
                    )}
                  </form.Field>

                  <form.Field name="targetCompletionDate">
                    {(field) => (
                      <DateField
                        field={field}
                        label="Target Completion (Optional)"
                        placeholder="Pick a date"
                      />
                    )}
                  </form.Field>
                </div>

                <form.Field name="estimatedTotalValue">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Estimated Value (Optional)"
                      description="Estimated total project value in AUD"
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                      prefix="$"
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
