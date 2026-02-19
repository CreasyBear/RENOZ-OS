/**
 * Customer Wizard Draft Hook
 *
 * Persists customer wizard state to localStorage. Follows use-order-create-draft pattern.
 * Saves customer form, contacts, addresses, and current step.
 *
 * @see use-order-create-draft.ts for pattern
 * @see use-form-draft.ts for form-draft infrastructure
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCreateDraftKey, DRAFT_PREFIX } from '@/hooks/_shared/use-form-draft';
import { logger } from '@/lib/logger';
import type { TanStackFormApi } from '@/hooks/_shared/use-tanstack-form';
import type { ManagedContact } from '../contact-manager';
import type { ManagedAddress } from '../address-manager';
import type { CustomerWizardValues, WizardStep } from './types';
import { wizardSteps } from './types';

const DRAFT_VERSION = 1;

/** Delay before allowing auto-save after restore */
const RESTORE_COOLDOWN_MS = 100;

const WIZARD_STEP_MIN = 0;
const WIZARD_STEP_MAX = wizardSteps.length - 1;

interface CustomerWizardDraftState {
  customer: CustomerWizardValues;
  contacts: ManagedContact[];
  addresses: ManagedAddress[];
  currentStep: number;
  completedSteps: WizardStep[];
}

interface DraftData<T> {
  version: number;
  values: T;
  savedAt: string;
}

function getDraftKey(): string {
  return `${DRAFT_PREFIX}${getCreateDraftKey('customer-wizard')}`;
}

function readDraft<T>(expectedVersion: number): DraftData<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(getDraftKey());
    if (!stored) return null;
    const data = JSON.parse(stored) as DraftData<T>;
    if (data.version !== expectedVersion) {
      localStorage.removeItem(getDraftKey());
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeDraft<T>(version: number, values: T): void {
  if (typeof window === 'undefined') return;
  try {
    const data: DraftData<T> = {
      version,
      values,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(getDraftKey(), JSON.stringify(data));
  } catch (error) {
    logger.warn('Failed to save customer wizard draft', { error: String(error) });
  }
}

function clearDraft(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getDraftKey());
}

export interface UseCustomerWizardDraftOptions {
  form: TanStackFormApi<CustomerWizardValues>;
  contacts: ManagedContact[];
  setContacts: React.Dispatch<React.SetStateAction<ManagedContact[]>>;
  addresses: ManagedAddress[];
  setAddresses: React.Dispatch<React.SetStateAction<ManagedAddress[]>>;
  currentStepIndex: number;
  completedSteps: Set<WizardStep>;
  setCurrentStepByIndex: (index: number) => void;
  setCompletedSteps: React.Dispatch<React.SetStateAction<Set<WizardStep>>>;
  enabled?: boolean;
  debounceMs?: number;
}

export interface UseCustomerWizardDraftReturn {
  hasDraft: boolean;
  savedAt: Date | null;
  isSaving: boolean;
  restore: () => void;
  clear: () => void;
}

export function useCustomerWizardDraft({
  form,
  contacts,
  setContacts,
  addresses,
  setAddresses,
  currentStepIndex,
  completedSteps,
  setCurrentStepByIndex,
  setCompletedSteps,
  enabled = true,
  debounceMs = 1500,
}: UseCustomerWizardDraftOptions): UseCustomerWizardDraftReturn {
  const [hasDraft, setHasDraft] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoringRef = useRef(false);
  const suppressAutosaveUntilChangeRef = useRef(false);
  const suppressedValuesSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const draft = readDraft<CustomerWizardDraftState>(DRAFT_VERSION);
    if (draft) {
      const id = setTimeout(() => {
        setHasDraft(true);
        setSavedAt(new Date(draft.savedAt));
      }, 0);
      return () => clearTimeout(id);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || isRestoringRef.current) return;
    const customer = form.state.values;
    const hasContent =
      (customer?.name?.trim?.()?.length ?? 0) > 0 ||
      (contacts?.length ?? 0) > 0 ||
      (addresses?.length ?? 0) > 0;
    if (!hasContent) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const snapshot = JSON.stringify({
      customer,
      contacts,
      addresses,
      currentStepIndex,
      completedSteps: Array.from(completedSteps),
    });
    if (suppressAutosaveUntilChangeRef.current) {
      if (suppressedValuesSnapshotRef.current === snapshot) {
        return;
      }
      suppressAutosaveUntilChangeRef.current = false;
      suppressedValuesSnapshotRef.current = null;
    }

    debounceRef.current = setTimeout(() => {
      setIsSaving(true);
      const state: CustomerWizardDraftState = {
        customer: { ...customer },
        contacts: [...contacts],
        addresses: [...addresses],
        currentStep: currentStepIndex,
        completedSteps: Array.from(completedSteps),
      };
      writeDraft(DRAFT_VERSION, state);
      setSavedAt(new Date());
      setIsSaving(false);
      debounceRef.current = null;
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [form.state.values, contacts, addresses, currentStepIndex, completedSteps, enabled, debounceMs]);

  const restore = useCallback(() => {
    const draft = readDraft<CustomerWizardDraftState>(DRAFT_VERSION);
    if (!draft) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setIsSaving(false);
    isRestoringRef.current = true;
    const { customer, contacts: c, addresses: a, currentStep: step } = draft.values;

    // Use form.reset for bulk restore to avoid multiple setFieldValue calls (prevents potential stack overflow)
    form.reset(customer);
    setContacts(c ?? []);
    setAddresses(a ?? []);
    if (typeof step === 'number' && step >= WIZARD_STEP_MIN && step <= WIZARD_STEP_MAX) {
      setCurrentStepByIndex(step);
    }
    const completed = (draft.values.completedSteps ?? []) as WizardStep[];
    if (completed.length > 0) {
      setCompletedSteps(new Set(completed));
    }

    clearDraft();
    setHasDraft(false);
    setSavedAt(null);
    suppressAutosaveUntilChangeRef.current = true;
    suppressedValuesSnapshotRef.current = JSON.stringify({
      customer,
      contacts: c ?? [],
      addresses: a ?? [],
      currentStepIndex: typeof step === 'number' ? step : currentStepIndex,
      completedSteps: completed.length > 0 ? completed : Array.from(completedSteps),
    });
    setTimeout(() => {
      isRestoringRef.current = false;
    }, RESTORE_COOLDOWN_MS);
  }, [form, setContacts, setAddresses, setCurrentStepByIndex, setCompletedSteps, currentStepIndex, completedSteps]);

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setIsSaving(false);
    clearDraft();
    setHasDraft(false);
    setSavedAt(null);
    suppressAutosaveUntilChangeRef.current = true;
    suppressedValuesSnapshotRef.current = JSON.stringify({
      customer: form.state.values,
      contacts,
      addresses,
      currentStepIndex,
      completedSteps: Array.from(completedSteps),
    });
  }, [form.state.values, contacts, addresses, currentStepIndex, completedSteps]);

  return { hasDraft, savedAt, isSaving, restore, clear };
}
