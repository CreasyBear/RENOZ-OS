/**
 * Form Draft Hook
 *
 * Auto-saves form state to localStorage with debouncing.
 * Follows Vercel best practice: version and minimize localStorage data.
 *
 * Features:
 * - Debounced auto-save (default 1s)
 * - Schema versioning for safe migrations
 * - Restore/discard draft functionality
 * - Integrates with TanStack Form
 * - Clears draft on successful submit
 *
 * @example
 * ```tsx
 * const form = useTanStackForm({
 *   schema: customerSchema,
 *   defaultValues: { name: '', email: '' },
 *   onSubmit: async (values) => {
 *     await createCustomer({ data: values });
 *     draft.clear(); // Clear draft on success
 *   },
 * });
 *
 * const draft = useFormDraft({
 *   key: 'customer-create',
 *   version: 1,
 *   form,
 *   enabled: true,
 * });
 *
 * // Show restore prompt if draft exists
 * {draft.hasDraft && (
 *   <DraftRestorePrompt
 *     onRestore={draft.restore}
 *     onDiscard={draft.clear}
 *     savedAt={draft.savedAt}
 *   />
 * )}
 * ```
 */

import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { logger } from '@/lib/logger';
import type { TanStackFormApi } from './use-tanstack-form';

// ============================================================================
// TYPES
// ============================================================================

interface DraftData<T> {
  version: number;
  values: T;
  savedAt: string;
}

export interface UseFormDraftOptions<TFormData> {
  /** Unique key for this form type (e.g., 'customer-create', 'order-edit-123') */
  key: string;
  /** Schema version - increment when form structure changes to invalidate old drafts */
  version: number;
  /** TanStack Form instance */
  form: TanStackFormApi<TFormData>;
  /** Enable/disable auto-save (default: true) */
  enabled?: boolean;
  /** Debounce delay in ms (default: 1000) */
  debounceMs?: number;
  /** Fields to exclude from draft (e.g., sensitive data) */
  excludeFields?: (keyof TFormData)[];
  /** Callback when draft is restored */
  onRestore?: (values: TFormData) => void;
  /** Callback when draft is cleared */
  onClear?: () => void;
}

export interface UseFormDraftReturn<TFormData> {
  /** Whether a valid draft exists */
  hasDraft: boolean;
  /** When the draft was last saved */
  savedAt: Date | null;
  /** Whether auto-save is currently pending */
  isSaving: boolean;
  /** Restore the draft to the form */
  restore: () => void;
  /** Clear the draft without restoring */
  clear: () => void;
  /** Manually save current form state */
  save: () => void;
  /** The draft values (if any) */
  draftValues: TFormData | null;
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/** Shared prefix for all form drafts. Used by clearAllFormDrafts and order-create-draft. */
export const DRAFT_PREFIX = 'form-draft:';

function getDraftKey(key: string): string {
  return `${DRAFT_PREFIX}${key}`;
}

function readDraft<T>(key: string, expectedVersion: number): DraftData<T> | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(getDraftKey(key));
    if (!stored) return null;

    const data = JSON.parse(stored) as DraftData<T>;

    // Version mismatch - invalidate old draft
    if (data.version !== expectedVersion) {
      localStorage.removeItem(getDraftKey(key));
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function writeDraft<T>(key: string, version: number, values: T): void {
  if (typeof window === 'undefined') return;

  try {
    const data: DraftData<T> = {
      version,
      values,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(getDraftKey(key), JSON.stringify(data));
  } catch (error) {
    logger.warn('Failed to save form draft', { error: String(error) });
  }
}

function clearDraft(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getDraftKey(key));
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormDraft<TFormData>({
  key,
  version,
  form,
  enabled = true,
  debounceMs = 1000,
  excludeFields = [],
  onRestore,
  onClear,
}: UseFormDraftOptions<TFormData>): UseFormDraftReturn<TFormData> {
  const [hasDraft, setHasDraft] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftValues, setDraftValues] = useState<TFormData | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoringRef = useRef(false);
  const suppressAutosaveUntilChangeRef = useRef(false);
  const suppressedValuesSnapshotRef = useRef<string | null>(null);

  // Check for existing draft on mount. Defer setState to avoid sync setState in effect.
  useEffect(() => {
    if (!enabled) return;

    const draft = readDraft<TFormData>(key, version);
    if (draft) {
      startTransition(() => {
        setHasDraft(true);
        setSavedAt(new Date(draft.savedAt));
        setDraftValues(draft.values);
      });
    }
  }, [key, version, enabled]);

  // Filter out excluded fields
  const filterValues = useCallback(
    (values: TFormData): TFormData => {
      if (excludeFields.length === 0) return values;

      const filtered = { ...values };
      for (const field of excludeFields) {
        delete (filtered as Record<string, unknown>)[field as string];
      }
      return filtered;
    },
    [excludeFields]
  );

  // Save draft
  const save = useCallback(() => {
    if (!enabled || isRestoringRef.current) {
      setIsSaving(false);
      return;
    }

    const values = filterValues(form.state.values);
    writeDraft(key, version, values);
    setSavedAt(new Date());
    setHasDraft(true);
    setDraftValues(values);
    setIsSaving(false);
  }, [enabled, form.state.values, key, version, filterValues]);

  // Debounced auto-save on form changes
  useEffect(() => {
    if (!enabled) {
      setIsSaving(false);
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Don't save while restoring
    if (isRestoringRef.current) {
      setIsSaving(false);
      return;
    }

    // Check if form has been modified
    const currentValues = JSON.stringify(form.state.values);
    const defaultValues = JSON.stringify(form.options.defaultValues);

    if (currentValues === defaultValues) {
      setIsSaving(false);
      return;
    }

    // After explicit clear/restore, avoid immediately re-saving identical state.
    if (suppressAutosaveUntilChangeRef.current) {
      if (suppressedValuesSnapshotRef.current === currentValues) {
        setIsSaving(false);
        return;
      }
      suppressAutosaveUntilChangeRef.current = false;
      suppressedValuesSnapshotRef.current = null;
    }

    // Avoid flipping to "Saving..." while no draft writes can occur.
    if (!enabled || isRestoringRef.current) {
      setIsSaving(false);
      return;
    }

    startTransition(() => setIsSaving(true));

    // Debounce the save
    debounceTimerRef.current = setTimeout(() => {
      save();
      debounceTimerRef.current = null;
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [enabled, form.state.values, form.options.defaultValues, debounceMs, save]);

  // Restore draft to form
  const restore = useCallback(() => {
    const draft = readDraft<TFormData>(key, version);
    if (!draft) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsSaving(false);
    isRestoringRef.current = true;

    // Reset form with draft values
    form.reset(draft.values);

    // Clear the draft after restoring
    clearDraft(key);
    setHasDraft(false);
    setSavedAt(null);
    setDraftValues(null);
    suppressAutosaveUntilChangeRef.current = true;
    suppressedValuesSnapshotRef.current = JSON.stringify(draft.values);

    onRestore?.(draft.values);

    // Allow auto-save again after a short delay
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 100);
  }, [key, version, form, onRestore]);

  // Clear draft without restoring
  const clear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsSaving(false);
    clearDraft(key);
    setHasDraft(false);
    setSavedAt(null);
    setDraftValues(null);
    suppressAutosaveUntilChangeRef.current = true;
    suppressedValuesSnapshotRef.current = JSON.stringify(form.state.values);
    onClear?.();
  }, [key, onClear, form.state.values]);

  return {
    hasDraft,
    savedAt,
    isSaving,
    restore,
    clear,
    save,
    draftValues,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a draft key for editing an existing entity
 */
export function getEditDraftKey(entityType: string, entityId: string): string {
  return `${entityType}-edit-${entityId}`;
}

/**
 * Generate a draft key for creating a new entity
 */
export function getCreateDraftKey(entityType: string): string {
  return `${entityType}-create`;
}

/**
 * Clear all form drafts (useful for logout)
 */
export function clearAllFormDrafts(): void {
  if (typeof window === 'undefined') return;

  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith(DRAFT_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}
