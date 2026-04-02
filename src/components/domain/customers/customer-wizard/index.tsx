/**
 * CustomerWizard Component
 *
 * Multi-step wizard for creating new customers with:
 * 1. Basic Information - Name, type, status, business details
 * 2. Contacts - Add key contacts for the customer
 * 3. Addresses - Add billing/shipping addresses
 * 4. Review - Review all information before submission
 *
 * Features:
 * - Step navigation with validation (FormWizard)
 * - Draft auto-save to localStorage
 * - TanStack Form with Zod validation
 */
import { useRef } from 'react';
import {
  FormWizard,
  FormFieldDisplayProvider,
  DraftRestorePrompt,
  DraftSavingIndicator,
  FormErrorSummary,
} from '@/components/shared/forms';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ContactManager } from '../contact-manager';
import { AddressManager } from '../address-manager';
import { useCustomerWizard } from './hooks/use-customer-wizard';
import { useCustomerWizardDraft } from './use-customer-wizard-draft';
import { BasicInfoStep } from './steps/basic-info-step';
import { ReviewStep } from './steps/review-step';
import { wizardSteps } from './types';
import type { CustomerWizardProps } from './types';
import { getCustomerCreateSubmissionState } from './submission-state';

const WIZARD_STEPS = [
  { id: 'basic', label: 'Details', description: 'Basic information' },
  { id: 'contacts', label: 'Contacts', description: 'Key contacts' },
  { id: 'addresses', label: 'Addresses', description: 'Billing & shipping' },
  { id: 'review', label: 'Review', description: 'Confirm details' },
];

export function CustomerWizard({
  onSubmit,
  onCancel,
  isLoading = false,
  availableTags = [],
}: CustomerWizardProps) {
  const {
    form,
    currentStep,
    currentStepIndex,
    completedSteps,
    setCompletedSteps,
    contacts,
    setContacts,
    addresses,
    setAddresses,
    setCurrentStepByIndex,
    getWizardData,
    validateBasicStep,
    submitError,
    serverFieldErrors,
    setSubmitError,
    applyServerFieldErrors,
    clearServerErrors,
  } = useCustomerWizard();
  const stepContentRef = useRef<HTMLDivElement>(null);

  const draft = useCustomerWizardDraft({
    form,
    contacts,
    setContacts,
    addresses,
    setAddresses,
    currentStepIndex,
    completedSteps,
    setCurrentStepByIndex,
    setCompletedSteps,
    enabled: true,
    debounceMs: 1500,
  });

  const handleComplete = async () => {
    clearServerErrors();
    const isValid = await validateBasicStep();
    if (!isValid) return;

    try {
      await onSubmit(getWizardData());
      draft.clear();
    } catch (error) {
      const submissionState = getCustomerCreateSubmissionState(error)
      draft.flush()
      applyServerFieldErrors(submissionState.fieldErrors)
      setSubmitError(submissionState.submitError)
      setCurrentStepByIndex(submissionState.targetStepIndex)
      toast.error(submissionState.submitError)
      setTimeout(() => {
        stepContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  };

  const validateStep = async (step: number): Promise<boolean> => {
    if (step === 0) {
      return validateBasicStep();
    }
    return true;
  };

  const canNavigateToStep = (stepIndex: number) => {
    const maxCompleted = Math.max(
      -1,
      ...Array.from(completedSteps).map((s) => wizardSteps.indexOf(s))
    );
    return stepIndex <= maxCompleted + 1;
  };

  const stepContent =
    currentStep === 'basic' ? (
      <BasicInfoStep
        form={form}
        availableTags={availableTags}
        serverFieldErrors={serverFieldErrors}
      />
    ) : currentStep === 'contacts' ? (
      <ContactManager contacts={contacts} onChange={setContacts} />
    ) : currentStep === 'addresses' ? (
      <AddressManager addresses={addresses} onChange={setAddresses} />
    ) : (
      <ReviewStep data={getWizardData()} />
    );

  return (
    <div className="mx-auto max-w-3xl">
      <DraftRestorePrompt
        hasDraft={draft.hasDraft}
        savedAt={draft.savedAt}
        onRestore={draft.restore}
        onDiscard={draft.clear}
      />
      <DraftSavingIndicator isSaving={draft.isSaving} savedAt={draft.savedAt} />

      <div className="flex justify-end mb-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (currentStepIndex === WIZARD_STEPS.length - 1) {
            void handleComplete();
          }
        }}
      >
        <FormErrorSummary
          form={form}
          submitError={submitError}
          fieldErrors={serverFieldErrors}
          showFieldErrors={Object.keys(serverFieldErrors).length > 0}
          onDismiss={clearServerErrors}
          className="mb-4"
        />
        <FormWizard
          steps={WIZARD_STEPS}
          currentStep={currentStepIndex}
          onStepChange={setCurrentStepByIndex}
          onComplete={handleComplete}
          validateStep={validateStep}
          canNavigateToStep={canNavigateToStep}
          isSubmitting={isLoading}
          submitOnLastStep
          labels={{
            previous: 'Back',
            next: 'Next',
            complete: 'Create Customer',
            completing: 'Creating…',
          }}
        >
          <FormFieldDisplayProvider form={form}>
            <div ref={stepContentRef} className="scroll-mt-4">
              {stepContent}
            </div>
          </FormFieldDisplayProvider>
        </FormWizard>
      </form>
    </div>
  );
}

// Re-export types for consumers
export type { CustomerWizardProps, CustomerWizardData, CustomerWizardValues } from './types';
