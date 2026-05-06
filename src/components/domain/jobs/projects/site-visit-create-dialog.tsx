/**
 * SiteVisitCreateDialog Component
 *
 * Dialog for creating new site visits for a project.
 *
 * SPRINT-03: New component for project-centric jobs model
 */

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { Calendar } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  FormDialog,
  TextareaField,
  SelectField,
  NumberField,
  DateField,
} from '@/components/shared/forms';
import {
  formatSiteVisitMutationError,
  useAllInstallers,
  useCreateSiteVisit,
} from '@/hooks/jobs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { VISIT_TYPE_OPTIONS } from '@/lib/constants/site-visits';
import {
  CURRENT_USER_INSTALLER_OPTION_VALUE,
  createSiteVisitInstallerOptions,
  formatInstallerDirectoryReadError,
  resolveSiteVisitInstallerId,
} from '../site-visits/site-visit-installer-options';

// ============================================================================
// SCHEMA
// ============================================================================

const createSiteVisitFormSchema = z.object({
  visitType: z.enum(['assessment', 'installation', 'commissioning', 'service', 'warranty', 'inspection', 'maintenance']),
  scheduledDate: z.date(),
  scheduledTime: z.string().optional(),
  estimatedDuration: z.number().min(15).max(480).optional().nullable(),
  installerId: z.string().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export interface SiteVisitCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Callback after successful creation */
  onSuccess?: (visitId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SiteVisitCreateDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: SiteVisitCreateDialogProps) {
  const navigate = useNavigate();
  const createSiteVisit = useCreateSiteVisit();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    data: installersData,
    error: installersError,
    refetch: refetchInstallers,
  } = useAllInstallers();
  const installerOptions = createSiteVisitInstallerOptions(installersData ?? []);
  const installerDirectoryMessage = formatInstallerDirectoryReadError(installersError);

  const form = useTanStackForm({
    schema: createSiteVisitFormSchema,
    defaultValues: {
      visitType: 'installation' as const,
      scheduledDate: new Date(),
      scheduledTime: '',
      estimatedDuration: 120,
      installerId: CURRENT_USER_INSTALLER_OPTION_VALUE,
      notes: '',
    },
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async (data) => {
      setSubmitError(null);
      try {
        const result = await createSiteVisit.mutateAsync({
          projectId,
          visitType: data.visitType,
          scheduledDate: format(data.scheduledDate, 'yyyy-MM-dd'),
          scheduledTime: data.scheduledTime || undefined,
          estimatedDuration: data.estimatedDuration ?? undefined,
          installerId: resolveSiteVisitInstallerId(data.installerId),
          notes: data.notes,
        });

        toast.success('Site visit scheduled successfully', {
          action: {
            label: 'View in Schedule',
            onClick: () => navigate({ to: '/schedule/calendar', search: { projectId } }),
          },
        });
        onOpenChange(false);
        form.reset();
        onSuccess?.(result.id);
      } catch (err) {
        const msg = formatSiteVisitMutationError(err, 'create');
        setSubmitError(msg);
        toast.error(msg);
      }
    },
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => setSubmitError(null), 0);
      form.reset({
        visitType: 'installation',
        scheduledDate: new Date(),
        scheduledTime: '',
        estimatedDuration: 120,
        installerId: CURRENT_USER_INSTALLER_OPTION_VALUE,
        notes: '',
      });
    }
  }, [open, form]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && createSiteVisit.isPending) return;
    if (!newOpen) setSubmitError(null);
    onOpenChange(newOpen);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Site Visit
        </span>
      }
      description="Schedule a new site visit for this project."
      form={form}
      submitLabel="Schedule Visit"
      loadingLabel="Scheduling..."
      submitError={submitError}
      submitDisabled={createSiteVisit.isPending}
      size="lg"
      className="max-w-lg"
      resetOnClose={false}
    >
          <div className="space-y-4">
            {/* Visit Type */}
            <form.Field name="visitType">
              {(field) => (
                <SelectField
                  field={field}
                  label="Visit Type"
                  options={VISIT_TYPE_OPTIONS}
                  required
                />
              )}
            </form.Field>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="scheduledDate">
                {(field) => (
                  <DateField
                    field={field}
                    label="Date"
                    required
                  />
                )}
              </form.Field>

              {/* Time - using native time input since we don't have a TimeField */}
              <form.Field name="scheduledTime">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Time (Optional)</Label>
                    <Input
                      type="time"
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            {/* Duration & Installer */}
            {installersError ? (
              <Alert variant={installersData === undefined ? 'destructive' : 'default'}>
                <AlertTitle>
                  {installersData === undefined
                    ? 'Installer directory unavailable'
                    : 'Showing cached installers'}
                </AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{installerDirectoryMessage}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refetchInstallers()}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="estimatedDuration">
                {(field) => (
                  <NumberField
                    field={field}
                    label="Duration (minutes)"
                    description="Estimated visit duration"
                    min={15}
                    max={480}
                    step={15}
                  />
                )}
              </form.Field>

              <form.Field name="installerId">
                {(field) => (
                  <SelectField
                    field={field}
                    label="Assigned Installer"
                    options={installerOptions}
                    placeholder="Select installer"
                  />
                )}
              </form.Field>
            </div>

            {/* Notes */}
            <form.Field name="notes">
              {(field) => (
                <TextareaField
                  field={field}
                  label="Notes"
                  placeholder="Any special instructions or notes for this visit..."
                  rows={3}
                />
              )}
            </form.Field>
          </div>
    </FormDialog>
  );
}
