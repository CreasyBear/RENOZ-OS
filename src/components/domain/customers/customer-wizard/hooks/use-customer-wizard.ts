/**
 * useCustomerWizard Hook
 *
 * Manages wizard state including:
 * - Current step navigation
 * - Step completion tracking
 * - Form state via TanStack Form
 * - Contact and address collections
 */
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useTanStackForm, type TanStackFormApi } from '@/hooks/_shared/use-tanstack-form';
import type { ManagedContact } from '../../contact-manager';
import type { ManagedAddress } from '../../address-manager';
import { customerWizardSchema } from '@/lib/schemas/customers';
import {
  wizardSteps,
  type WizardStep,
  type CustomerWizardValues,
  type CustomerWizardData,
} from '../types';

const defaultFormValues: CustomerWizardValues = {
  name: '',
  legalName: '',
  email: '',
  phone: '',
  website: '',
  status: 'prospect',
  type: 'business',
  size: undefined,
  industry: '',
  taxId: '',
  registrationNumber: '',
  creditHold: false,
  creditHoldReason: '',
  tags: [],
};

export interface UseCustomerWizardReturn {
  // Form
  form: TanStackFormApi<CustomerWizardValues>;

  // Step state
  currentStep: WizardStep;
  currentStepIndex: number;
  completedSteps: Set<WizardStep>;
  setCompletedSteps: React.Dispatch<React.SetStateAction<Set<WizardStep>>>;
  isFirstStep: boolean;
  isLastStep: boolean;

  // Collections
  contacts: ManagedContact[];
  setContacts: React.Dispatch<React.SetStateAction<ManagedContact[]>>;
  addresses: ManagedAddress[];
  setAddresses: React.Dispatch<React.SetStateAction<ManagedAddress[]>>;

  // Navigation
  goToNextStep: () => Promise<void>;
  goToPreviousStep: () => void;
  setCurrentStepByIndex: (index: number) => void;

  // Data
  getWizardData: () => CustomerWizardData;

  // Validation for FormWizard
  validateBasicStep: () => Promise<boolean>;
}

export function useCustomerWizard(): UseCustomerWizardReturn {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const [contacts, setContacts] = useState<ManagedContact[]>([]);
  const [addresses, setAddresses] = useState<ManagedAddress[]>([]);
  const validationPassedRef = useRef(false);

  const form = useTanStackForm<CustomerWizardValues>({
    schema: customerWizardSchema,
    defaultValues: defaultFormValues,
    onSubmitInvalid: () => {
      toast.error('Please fix the errors below and try again.');
    },
    onSubmit: async () => {
      validationPassedRef.current = true;
    },
  });

  const currentStepIndex = wizardSteps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === wizardSteps.length - 1;

  const validateBasicStep = useCallback(async (): Promise<boolean> => {
    validationPassedRef.current = false;
    try {
      await form.handleSubmit();
      return validationPassedRef.current;
    } catch {
      return false;
    }
  }, [form]);

  const goToNextStep = useCallback(async () => {
    if (currentStep === 'basic') {
      const isValid = await validateBasicStep();
      if (!isValid) return;
    }

    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep(wizardSteps[currentStepIndex + 1]);
  }, [currentStep, currentStepIndex, validateBasicStep]);

  const goToPreviousStep = useCallback(() => {
    setCurrentStep(wizardSteps[currentStepIndex - 1]);
  }, [currentStepIndex]);

  const setCurrentStepByIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, wizardSteps.length - 1));
      if (clamped > currentStepIndex) {
        setCompletedSteps((prev) => new Set([...prev, currentStep]));
      }
      setCurrentStep(wizardSteps[clamped]);
    },
    [currentStepIndex, currentStep]
  );

  const getWizardData = useCallback(
    (): CustomerWizardData => ({
      customer: form.state.values,
      contacts,
      addresses,
    }),
    [form.state.values, contacts, addresses]
  );

  return {
    form,
    currentStep,
    currentStepIndex,
    completedSteps,
    setCompletedSteps,
    isFirstStep,
    isLastStep,
    contacts,
    setContacts,
    addresses,
    setAddresses,
    goToNextStep,
    goToPreviousStep,
    setCurrentStepByIndex,
    getWizardData,
    validateBasicStep,
  };
}
