/**
 * Project Completion Dialog Component
 *
 * Dialog for completing a project with final costs, customer satisfaction,
 * and handover pack generation.
 *
 * Story 028: Project Completion Workflow
 *
 * @path src/components/domain/jobs/projects/project-completion-dialog.tsx
 */

import { useState, useEffect } from 'react';
import { useTanStackForm } from '@/hooks/_shared/use-tanstack-form';
import { CheckCircle, Star, PartyPopper } from 'lucide-react';
import {
  projectCompletionFormSchema,
  type CompletionValidation,
  type ProjectCompletionFormValues,
} from '@/lib/schemas/jobs/projects';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  FormFieldDisplayProvider,
  FormErrorSummary,
  NumberField,
  SelectField,
  TextareaField,
  CheckboxField,
  DateStringField,
} from '@/components/shared/forms';
import { useCompleteProject } from '@/hooks/jobs';
import { toast } from '@/lib/toast';
import { DisabledButtonWithTooltip } from '@/components/shared/disabled-with-tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  estimatedTotalValue?: number;
  /** Completion validation - when provided, blocks "completed" status if tasks/BOM incomplete */
  completionValidation?: CompletionValidation;
  /** Callback after successful completion */
  onSuccess?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProjectCompletionDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  estimatedTotalValue,
  completionValidation,
  onSuccess,
}: ProjectCompletionDialogProps) {
  const completeProject = useCompleteProject();
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useTanStackForm<ProjectCompletionFormValues>({
    schema: projectCompletionFormSchema,
    defaultValues: {
      status: 'completed',
      actualCompletionDate: format(new Date(), 'yyyy-MM-dd'),
      actualTotalCost: undefined,
      customerSatisfactionRating: undefined,
      customerFeedback: '',
      generateHandoverPack: true,
      overrideReason: '',
    },
    onSubmit: async (data) => {
      setSubmitError(null);
      try {
        const updatedProject = await completeProject.mutateAsync({
          projectId,
          status: data.status,
          actualCompletionDate: data.actualCompletionDate,
          actualTotalCost: data.actualTotalCost,
          customerSatisfactionRating: data.customerSatisfactionRating,
          customerFeedback: data.customerFeedback,
          generateHandoverPack: data.generateHandoverPack,
        });

        if (data.status === 'completed') {
        setShowCelebration(true);
        toast.success('Project completed successfully! 🎉', {
          description: updatedProject?.handoverPackUrl
            ? 'Handover pack generated.'
            : undefined,
          action: updatedProject?.handoverPackUrl
            ? { label: 'View Handover Pack', onClick: () => window.open(updatedProject.handoverPackUrl!, '_blank') }
            : undefined,
        });
      } else {
        toast.success(`Project marked as ${data.status}`);
      }

        setTimeout(() => {
          form.reset();
          onSuccess?.();
          onOpenChange(false);
          setShowCelebration(false);
        }, 1500);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setSubmitError(message);
        toast.error(`Failed to complete project: ${message}`);
      }
    },
    onSubmitInvalid: () => {},
  });

  const selectedRating = form.useWatch('customerSatisfactionRating');
  const actualCost = form.useWatch('actualTotalCost');
  const status = form.useWatch('status');
  const overrideReason = form.useWatch('overrideReason');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSubmitError(null);
      form.reset({
        status: 'completed',
        actualCompletionDate: format(new Date(), 'yyyy-MM-dd'),
        actualTotalCost: undefined,
        customerSatisfactionRating: undefined,
        customerFeedback: '',
        generateHandoverPack: true,
        overrideReason: '',
      });
    }
  }, [open, form]);

  // Completion validation: block "completed" if tasks or BOM incomplete
  const isTasksIncomplete =
    completionValidation &&
    completionValidation.totalTasks > 0 &&
    completionValidation.completedTasks < completionValidation.totalTasks;
  const isBomIncomplete =
    completionValidation &&
    completionValidation.totalBomItems > 0 &&
    completionValidation.installedBomItems < completionValidation.totalBomItems;
  const isCompletionBlocked =
    status === 'completed' && (isTasksIncomplete === true || isBomIncomplete === true);
  const hasValidOverride =
    !isCompletionBlocked || (overrideReason?.trim().length ?? 0) >= 10;

  // Calculate variance
  const variance = estimatedTotalValue && actualCost
    ? actualCost - estimatedTotalValue
    : null;
  const variancePercent = estimatedTotalValue && actualCost
    ? ((actualCost - estimatedTotalValue) / estimatedTotalValue) * 100
    : null;

  const isPending = completeProject.isPending;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, onOpenChange);

  if (showCelebration) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[400px] text-center">
          <div className="py-8">
            <PartyPopper className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Project Complete!</h2>
            <p className="text-muted-foreground">
              {projectTitle} has been successfully completed.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Complete Project
          </DialogTitle>
          <DialogDescription>
            Finalize {projectTitle} with completion details and customer feedback
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-6"
        >
          <FormFieldDisplayProvider form={form}>
            <FormErrorSummary form={form} submitError={submitError ?? completeProject.error?.message ?? null} />
            {/* Status Selection */}
            <form.Field name="status">
              {(field) => (
                <SelectField
                  field={field}
                  label="Final Status"
                  placeholder="Select final status"
                  options={[
                    { value: 'completed', label: '✅ Completed' },
                    { value: 'cancelled', label: '❌ Cancelled' },
                    { value: 'on_hold', label: '⏸️ On Hold' },
                  ]}
                  required
                />
              )}
            </form.Field>

            {/* Completion Date */}
            <form.Field name="actualCompletionDate">
              {(field) => (
                <DateStringField
                  field={field}
                  label="Completion Date"
                  required
                />
              )}
            </form.Field>

            {/* Actual Cost */}
            <form.Field name="actualTotalCost">
              {(field) => (
                <div className="space-y-1">
                  <NumberField
                    field={field}
                    label="Actual Total Cost"
                    step={0.01}
                    placeholder="Enter actual total cost"
                    description={
                      estimatedTotalValue
                        ? `Estimated: $${estimatedTotalValue.toLocaleString()}`
                        : undefined
                    }
                  />
                  {estimatedTotalValue && variance !== null && (
                    <p
                      className={cn(
                        'text-xs font-medium',
                        variance > 0 ? 'text-red-500' : variance < 0 ? 'text-green-500' : 'text-muted-foreground'
                      )}
                    >
                      Variance: {variance > 0 ? '+' : ''}{variancePercent?.toFixed(1)}%
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {status === 'completed' && isCompletionBlocked && (
              <Alert variant="destructive">
                <AlertDescription>
                  {isTasksIncomplete && isBomIncomplete
                    ? `${completionValidation!.totalTasks - completionValidation!.completedTasks} task(s) incomplete and ${completionValidation!.totalBomItems - completionValidation!.installedBomItems} BOM item(s) not installed.`
                    : isTasksIncomplete
                      ? `${completionValidation!.totalTasks - completionValidation!.completedTasks} task(s) incomplete.`
                      : `${completionValidation!.totalBomItems - completionValidation!.installedBomItems} BOM item(s) not installed.`}{' '}
                  Provide a reason below to override and complete anyway.
                </AlertDescription>
              </Alert>
            )}

            {status === 'completed' && (
              <>
                {isCompletionBlocked && (
                  <form.Field name="overrideReason">
                    {(field) => (
                      <TextareaField
                        field={field}
                        label="Override Reason"
                        placeholder="I understand items are incomplete. Reason for override..."
                        description="Minimum 10 characters required to complete with incomplete items"
                        rows={3}
                        required
                      />
                    )}
                  </form.Field>
                )}

                {/* Customer Rating */}
                <form.Field name="customerSatisfactionRating">
                  {(field) => (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Customer Satisfaction (Optional)
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Overall customer satisfaction rating
                      </p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            className={cn(
                              'p-1 transition-colors',
                              (hoveredRating !== null
                                ? rating <= hoveredRating
                                : rating <= (selectedRating || 0)
                              )
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            )}
                            onMouseEnter={() => setHoveredRating(rating)}
                            onMouseLeave={() => setHoveredRating(null)}
                            onClick={() => field.handleChange(rating)}
                          >
                            <Star className="h-8 w-8 fill-current" />
                          </button>
                        ))}
                      </div>
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>

                {/* Customer Feedback */}
                <form.Field name="customerFeedback">
                  {(field) => (
                    <TextareaField
                      field={field}
                      label="Customer Feedback (Optional)"
                      placeholder="Enter overall customer feedback..."
                      rows={4}
                    />
                  )}
                </form.Field>

                {/* Generate Handover Pack */}
                <form.Field name="generateHandoverPack">
                  {(field) => (
                    <div className="rounded-md border p-4">
                      <CheckboxField
                        field={field}
                        label="Generate Handover Pack"
                        description="Automatically generate a completion summary document with project details, system specifications, and warranty information."
                      />
                    </div>
                  )}
                </form.Field>
              </>
            )}
          </FormFieldDisplayProvider>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={completeProject.isPending}
            >
              Cancel
            </Button>
            <DisabledButtonWithTooltip
              type="submit"
              disabled={
                completeProject.isPending ||
                !form.state.canSubmit ||
                (status === 'completed' && isCompletionBlocked && !hasValidOverride)
              }
              disabledReason={
                status === 'completed' && isCompletionBlocked && !hasValidOverride
                  ? isTasksIncomplete && isBomIncomplete
                    ? 'Complete all tasks and BOM items first, or provide an override reason below (min 10 characters)'
                    : isTasksIncomplete
                      ? 'Complete all tasks first, or provide an override reason below'
                      : 'Install all BOM items first, or provide an override reason below'
                  : undefined
              }
            >
              {completeProject.isPending
                ? 'Completing...'
                : status === 'completed'
                  ? 'Complete Project'
                  : 'Update Status'}
            </DisabledButtonWithTooltip>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
