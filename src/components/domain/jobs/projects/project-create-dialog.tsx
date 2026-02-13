/**
 * ProjectCreateDialog Component
 *
 * Dialog for creating new projects.
 * Based on patterns from job-create-dialog and reference project-wizard.
 *
 * @source src/components/domain/jobs/projects/project-create-dialog.tsx
 * @see docs/design-system/JOBS-DOMAIN-WORKFLOW.md
 */

import { useMemo, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
import { useCreateProject, useJobTemplates, useJobTemplate } from '@/hooks/jobs';
import { useCustomers, useCustomer } from '@/hooks/customers';
import { toast } from '@/lib/toast';
import {
  createProjectFormSchema,
  transformCreateProjectFormToApi,
} from '@/lib/schemas/jobs/projects';

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
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const { data: templatesData } = useJobTemplates({ includeInactive: false });

  const form = useTanStackForm({
    schema: createProjectFormSchema,
    defaultValues: {
      templateId: '',
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
      scopeInScope: '',
      scopeOutOfScope: '',
      outcomesText: '',
      startDate: null,
      targetCompletionDate: null,
      estimatedTotalValue: null,
    },
    onSubmit: async (data) => {
      try {
        const payload = transformCreateProjectFormToApi(data);
        const result = await createProject.mutateAsync(payload);

        toast.success('Project created successfully', {
          action: {
            label: 'View Project',
            onClick: () => navigate({ to: '/projects/$projectId', params: { projectId: result.id } }),
          },
        });
        onOpenChange(false);
        form.reset();
        onSuccess?.(result.id);
      } catch {
        toast.error('Failed to create project');
      }
    },
  });

  const templates = useMemo(() => templatesData?.templates ?? [], [templatesData]);
  const templateOptions = useMemo(
    () => [
      { value: '', label: 'No template' },
      ...templates.map((t) => ({ value: t.id, label: t.name })),
    ],
    [templates]
  );

  const selectedTemplateId = form.useWatch('templateId') ?? '';
  const selectedCustomerId = form.useWatch('customerId') ?? '';
  const { data: templateData } = useJobTemplate(
    selectedTemplateId && selectedTemplateId.length > 0 ? selectedTemplateId : undefined
  );
  const { data: selectedCustomer } = useCustomer({
    id: selectedCustomerId,
    enabled: !!selectedCustomerId && open,
  });

  const selectedTemplate = templateData?.template;
  const lastPrefilledTemplateId = useRef<string | null>(null);
  const lastPrefilledCustomerId = useRef<string | null>(null);

  // Prefill description from template when template is first selected
  useEffect(() => {
    if (!open || !selectedTemplate || selectedTemplate.id === lastPrefilledTemplateId.current) return;
    lastPrefilledTemplateId.current = selectedTemplate.id;
    if (selectedTemplate.description) {
      form.setFieldValue('description', selectedTemplate.description);
    }
  }, [open, selectedTemplate, form]);

  // Prefill site address from customer when customer is first selected
  useEffect(() => {
    if (!open || !selectedCustomer?.addresses?.length || selectedCustomer.id === lastPrefilledCustomerId.current)
      return;
    lastPrefilledCustomerId.current = selectedCustomer.id;
    const addr = selectedCustomer.addresses.find((a) => a.isPrimary) ?? selectedCustomer.addresses[0];
    if (addr) {
      const country = addr.country === 'AU' ? 'Australia' : addr.country ?? 'Australia';
      form.setFieldValue('siteAddress', {
        street: [addr.street1, addr.street2].filter(Boolean).join(', '),
        city: addr.city ?? '',
        state: addr.state ?? '',
        postalCode: addr.postcode ?? '',
        country,
      });
    }
  }, [open, selectedCustomer, form]);

  const customers = useMemo(() => customersData?.items ?? [], [customersData]);
  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: customer.name,
  }));

  useEffect(() => {
    if (!open) {
      lastPrefilledTemplateId.current = null;
      lastPrefilledCustomerId.current = null;
    }
  }, [open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        templateId: '',
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
        scopeInScope: '',
        scopeOutOfScope: '',
        outcomesText: '',
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

                {templateOptions.length > 1 && (
                  <form.Field name="templateId">
                    {(field) => (
                      <SelectField
                        field={field}
                        label="Template (optional)"
                        options={templateOptions}
                        placeholder="Select a template to prefill"
                      />
                    )}
                  </form.Field>
                )}

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

              {/* Scope & Outcomes (optional) */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Scope & Outcomes (Optional)</h3>
                <form.Field name="scopeInScope">
                  {(field) => (
                    <TextareaField
                      field={field}
                      label="In Scope"
                      placeholder="One item per line (e.g. Solar panel installation)"
                      rows={2}
                    />
                  )}
                </form.Field>
                <form.Field name="scopeOutOfScope">
                  {(field) => (
                    <TextareaField
                      field={field}
                      label="Out of Scope"
                      placeholder="One item per line (e.g. Roof repairs)"
                      rows={2}
                    />
                  )}
                </form.Field>
                <form.Field name="outcomesText">
                  {(field) => (
                    <TextareaField
                      field={field}
                      label="Outcomes"
                      placeholder="One outcome per line (e.g. 6.6kW system commissioned)"
                      rows={2}
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
