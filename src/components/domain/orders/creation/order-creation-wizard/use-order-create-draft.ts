/**
 * Order Create Draft Hook
 *
 * Persists OrderCreationWizard state to localStorage. Follows use-form-draft pattern.
 * Integrates with existing form-draft infrastructure (getCreateDraftKey, DRAFT_PREFIX).
 *
 * @see use-form-draft.ts for pattern
 * @see PREMORTEM_ORDERS_CREATION.md
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCreateDraftKey, DRAFT_PREFIX } from '@/hooks/_shared/use-form-draft';
import { logger } from '@/lib/logger';

const DRAFT_VERSION = 1;

/** Delay before allowing auto-save after restore (avoids re-writing stale draft) */
const RESTORE_COOLDOWN_MS = 100;

/** Wizard step bounds (matches STEPS in order-creation-wizard.tsx) */
const WIZARD_STEP_MIN = 1;
const WIZARD_STEP_MAX = 5;

/** Detect ISO date strings (JSON.parse leaves Date as string). Revives any parseable date. */
function isDateString(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(new Date(v).getTime());
}

interface DraftData<T> {
  version: number;
  values: T;
  savedAt: string;
}

/** Revive date strings when restoring from localStorage */
function reviveState<T>(raw: T): T {
  if (raw === null || typeof raw !== 'object') return raw;
  if (Array.isArray(raw)) return raw.map(reviveState) as T;
  const obj = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isDateString(v)) {
      out[k] = new Date(v);
    } else if (v && typeof v === 'object') {
      out[k] = reviveState(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

function getDraftKey(): string {
  return `${DRAFT_PREFIX}${getCreateDraftKey('order')}`;
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
    logger.warn('Failed to save order create draft', { error: String(error) });
  }
}

function clearDraft(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getDraftKey());
}

export interface UseOrderCreateDraftOptions<T> {
  state: T;
  setState: React.Dispatch<React.SetStateAction<T>>;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  /** Skip draft when user came from customer context with pre-select */
  skipDraft?: boolean;
  /** Debounce ms for auto-save */
  debounceMs?: number;
}

export interface UseOrderCreateDraftReturn {
  /** True when a draft was found on mount (returning user). Not set by auto-save. */
  hasDraft: boolean;
  savedAt: Date | null;
  restore: () => void;
  clear: () => void;
}

export function useOrderCreateDraft<T extends object>({
  state,
  setState,
  currentStep,
  setCurrentStep,
  skipDraft = false,
  debounceMs = 1500,
}: UseOrderCreateDraftOptions<T>): UseOrderCreateDraftReturn {
  const [hasDraft, setHasDraft] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoringRef = useRef(false);

  // Check for existing draft on mount (defer setState to avoid sync setState in effect)
  useEffect(() => {
    if (skipDraft) return;
    const draft = readDraft<T>(DRAFT_VERSION);
    if (draft) {
      const savedAt = new Date(draft.savedAt);
      const id = setTimeout(() => {
        setHasDraft(true);
        setSavedAt(savedAt);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [skipDraft]);

  // Debounced auto-save
  useEffect(() => {
    if (skipDraft || isRestoringRef.current) return;
    // Don't save empty state
    const hasContent = (state as { customer?: unknown; lineItems?: unknown[] }).customer != null ||
      ((state as { lineItems?: unknown[] }).lineItems?.length ?? 0) > 0;
    if (!hasContent) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      writeDraft(DRAFT_VERSION, { ...state, currentStep } as T & { currentStep: number });
      setSavedAt(new Date());
      debounceRef.current = null;
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state, currentStep, skipDraft, debounceMs]);

  const restore = useCallback(() => {
    const draft = readDraft<T & { currentStep?: number }>(DRAFT_VERSION);
    if (!draft) return;
    isRestoringRef.current = true;
    const revived = reviveState(draft.values) as T & { currentStep?: number };
    const { currentStep: step, ...rest } = revived;
    setState(rest as T);
    if (typeof step === 'number' && step >= WIZARD_STEP_MIN && step <= WIZARD_STEP_MAX) {
      setCurrentStep(step);
    }
    clearDraft();
    setHasDraft(false);
    setSavedAt(null);
    setTimeout(() => { isRestoringRef.current = false; }, RESTORE_COOLDOWN_MS);
  }, [setState, setCurrentStep]);

  const clear = useCallback(() => {
    clearDraft();
    setHasDraft(false);
    setSavedAt(null);
  }, []);

  return { hasDraft, savedAt, restore, clear };
}
