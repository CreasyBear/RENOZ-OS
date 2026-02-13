/**
 * Duplicate Detection Hook
 *
 * React hook for real-time duplicate customer detection.
 * Debounces API calls and provides loading/error states.
 *
 * @example
 * const { duplicates, isChecking, checkForDuplicates } = useDuplicateDetection()
 *
 * // In form onChange handlers:
 * checkForDuplicates({ name, email, phone })
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  detectDuplicates,
  type DuplicateMatch,
} from '@/server/functions/customers/customer-duplicates';
import { queryKeys } from '@/lib/query-keys';
import { useDebounce } from '../_shared/use-debounce';

// ============================================================================
// TYPES
// ============================================================================

export interface DuplicateDetectionInput {
  name?: string;
  email?: string;
  phone?: string;
}

export interface DuplicateDetectionOptions {
  /** Similarity threshold (0-1). Default: 0.3 */
  threshold?: number;
  /** Debounce delay in ms. Default: 300 */
  debounceMs?: number;
  /** Maximum results to return. Default: 5 */
  limit?: number;
  /** Customer ID to exclude (for edit mode) */
  excludeCustomerId?: string;
  /** Auto-check on mount with initial values */
  initialValues?: DuplicateDetectionInput;
}

export interface DuplicateDetectionResult {
  /** List of potential duplicate matches */
  duplicates: DuplicateMatch[];
  /** Whether a check is currently in progress */
  isChecking: boolean;
  /** Error message if check failed */
  error: string | null;
  /** Whether there are more matches beyond the limit */
  hasMore: boolean;
  /** Trigger a duplicate check with new values */
  checkForDuplicates: (input: DuplicateDetectionInput) => void;
  /** Clear current duplicates */
  clearDuplicates: () => void;
  /** Dismiss a specific duplicate (mark as "not a duplicate") */
  dismissDuplicate: (customerId: string) => void;
  /** List of dismissed customer IDs */
  dismissedIds: string[];
}

// ============================================================================
// HOOK
// ============================================================================

export function useDuplicateDetection(
  options: DuplicateDetectionOptions = {}
): DuplicateDetectionResult {
  const {
    threshold = 0.3,
    debounceMs = 300,
    limit = 5,
    excludeCustomerId,
    initialValues,
  } = options;

  // State
  const [input, setInput] = useState<DuplicateDetectionInput>(initialValues ?? {});
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Server function
  const detectDuplicatesFn = useServerFn(detectDuplicates);

  const debouncedInput = useDebounce(input, debounceMs);
  const hasName = !!debouncedInput.name && debouncedInput.name.length >= 2;
  const hasEmail = !!debouncedInput.email && debouncedInput.email.includes('@');
  const hasPhone = !!debouncedInput.phone && debouncedInput.phone.length >= 6;
  const isEnabled = hasName || hasEmail || hasPhone;

  const query = useQuery({
    queryKey: queryKeys.customers.duplicates.check({
      name: hasName ? debouncedInput.name : undefined,
      email: hasEmail ? debouncedInput.email : undefined,
      phone: hasPhone ? debouncedInput.phone : undefined,
      threshold,
      excludeCustomerId,
      limit,
    }),
    queryFn: async () => {
      const result = await detectDuplicatesFn({
        data: {
          name: hasName ? debouncedInput.name : undefined,
          email: hasEmail ? debouncedInput.email : undefined,
          phone: hasPhone ? debouncedInput.phone : undefined,
          threshold,
          excludeCustomerId,
          limit,
        },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: isEnabled,
    staleTime: 10 * 1000,
    retry: 1,
  });

  const duplicates = useMemo(() => {
    const list = query.data?.duplicates ?? [];
    return list.filter((d: DuplicateMatch) => !dismissedIds.includes(d.customerId));
  }, [query.data, dismissedIds]);
  const hasMore = query.data?.hasMore ?? false;
  const error = query.error instanceof Error ? query.error.message : null;

  const checkForDuplicates = useCallback(
    (nextInput: DuplicateDetectionInput) => {
      setInput(nextInput);
    },
    [setInput]
  );

  /**
   * Clear all duplicates
   */
  const clearDuplicates = useCallback(() => {
    setInput({});
    setDismissedIds([]);
  }, [setInput, setDismissedIds]);

  /**
   * Dismiss a specific duplicate (user confirmed it's not a duplicate)
   */
  const dismissDuplicate = useCallback(
    (customerId: string) => {
      setDismissedIds((prev) => [...prev, customerId]);
    },
    [setDismissedIds]
  );

  return {
    duplicates,
    isChecking: query.isFetching,
    error,
    hasMore,
    checkForDuplicates,
    clearDuplicates,
    dismissDuplicate,
    dismissedIds,
  };
}

// Query keys are now centralized in @/lib/query-keys.ts

// Re-export types
export type { DuplicateMatch };
