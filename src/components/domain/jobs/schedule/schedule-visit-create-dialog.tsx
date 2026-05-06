/**
 * Schedule Visit Create Dialog
 *
 * Dialog for creating site visits from the schedule calendar (cross-project context).
 * Includes project selector when no projectId is provided.
 * Follows EMPTY-STATE-STANDARDS, STANDARDS.md, and SCHEMA-TRACE.md.
 *
 * @source SiteVisitCreateDialog for form structure
 * @source EMPTY-STATE-STANDARDS for action CTAs
 * @source scheduleVisitFormSchema from lib/schemas/jobs/site-visits
 * @source useLoadProjectOptions from hooks/jobs
 */

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import {
  TextareaField,
  SelectField,
  NumberField,
  DateField,
  ComboboxField,
  FormErrorSummary,
  FormFieldDisplayProvider,
} from '@/components/shared/forms';
import {
  formatSiteVisitMutationError,
  useCreateSiteVisit,
  useAllInstallers,
  useLoadProjectOptions,
} from '@/hooks/jobs';
import { toast } from 'sonner';
import { scheduleVisitFormSchema } from '@/lib/schemas/jobs';
import { VISIT_TYPE_OPTIONS } from '@/lib/constants/site-visits';
import {
  createSiteVisitInstallerOptions,
  formatInstallerDirectoryReadError,
} from '../site-visits/site-visit-installer-options';
import {
  buildCreateSiteVisitInput,
  createScheduleSiteVisitFormDefaults,
} from '../site-visits/site-visit-create-form';

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduleVisitCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, project selector is hidden and this project is used */
  projectId?: string;
  /** Pre-fill date (e.g. from empty slot click or week view) */
  prefillDate?: Date;
  /** Pre-fill time (e.g. from empty slot click, format HH:mm) */
  prefillTime?: string;
  /** Callback after successful creation */
  onSuccess?: (visitId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleVisitCreateDialog({
  open,
  onOpenChange,
  projectId: initialProjectId,
  prefillDate,
  prefillTime,
  onSuccess,
}: ScheduleVisitCreateDialogProps) {
  const navigate = useNavigate();
  const loadProjectOptions = useLoadProjectOptions();
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
    schema: scheduleVisitFormSchema,
    defaultValues: createScheduleSiteVisitFormDefaults({
      projectId: initialProjectId,
      scheduledDate: prefillDate,
      scheduledTime: prefillTime,
    }),
    onSubmitInvalid: () => {
      setSubmitError(null);
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async (data) => {
      setSubmitError(null);
      const resolvedProjectId = initialProjectId ?? data.projectId;
      if (!resolvedProjectId) {
        const message = 'Please select a project';
        setSubmitError(message);
        toast.error(message);
        return;
      }
      try {
        const result = await createSiteVisit.mutateAsync(
          buildCreateSiteVisitInput(resolvedProjectId, data)
        );

        toast.success('Site visit scheduled successfully', {
          action: {
            label: 'View in Schedule',
            onClick: () =>
              navigate({ to: '/schedule/calendar', search: { projectId: resolvedProjectId } }),
          },
        });
        onOpenChange(false);
        form.reset();
        onSuccess?.(result.id);
      } catch (err) {
        const message = formatSiteVisitMutationError(err, 'create');
        setSubmitError(message);
        toast.error(message);
      }
    },
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => setSubmitError(null), 0);
      form.reset(
        createScheduleSiteVisitFormDefaults({
          projectId: initialProjectId,
          scheduledDate: prefillDate,
          scheduledTime: prefillTime,
        })
      );
    }
  }, [open, initialProjectId, prefillDate, prefillTime, form]);

  const isSubmitting = createSiteVisit.isPending;
  const showProjectSelector = !initialProjectId;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isSubmitting);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isSubmitting, (nextOpen) => {
    if (!nextOpen) setSubmitError(null);
    onOpenChange(nextOpen);
  });

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-w-lg"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Site Visit
          </DialogTitle>
          <DialogDescription>
            {showProjectSelector
              ? 'Create a new site visit. Select a project and fill in the visit details.'
              : 'Schedule a new site visit for this project.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          <FormErrorSummary form={form} submitError={submitError} />

          <FormFieldDisplayProvider form={form}>
          <div className="space-y-4">
            {showProjectSelector && (
              <form.Field name="projectId">
                {(field) => (
                  <ComboboxField
                    field={field}
                    label="Project"
                    loadOptions={loadProjectOptions}
                    placeholder="Search projects..."
                    searchPlaceholder="Search projects..."
                    required
                    allowClear={false}
                  />
                )}
              </form.Field>
            )}

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

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="scheduledDate">
                {(field) => (
                  <DateField field={field} label="Date" required />
                )}
              </form.Field>

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
          </FormFieldDisplayProvider>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Visit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
