/**
 * Warranty Extensions TanStack Query Hook
 *
 * Provides data fetching and mutations for warranty extensions.
 *
 * @see src/server/functions/warranty-extensions.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-007c
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  extendWarranty,
  listWarrantyExtensions,
  getExtensionHistory,
  getExtensionById,
} from '@/server/functions/warranty/extensions/warranty-extensions';
import type {
  ExtendWarrantyInput,
  GetExtensionHistoryInput,
} from '@/lib/schemas/warranty/extensions';
import { toast } from '../../_shared/use-toast';
import {
  calculateNewExpiryDate,
  formatDateAustralian,
  getDaysDifference,
} from '@/lib/warranty/date-utils';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// LIST WARRANTY EXTENSIONS (for a specific warranty)
// ============================================================================

/**
 * Hook for fetching all extensions for a specific warranty.
 * Returns extensions in reverse chronological order (most recent first).
 *
 * @param warrantyId - The warranty to fetch extensions for
 */
export function useWarrantyExtensions(warrantyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.warrantyExtensions.list(warrantyId ?? ''),
    queryFn: async () => {
      const result = await listWarrantyExtensions({
        data: { warrantyId: warrantyId! } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: !!warrantyId,
  });
}

// ============================================================================
// GET EXTENSION HISTORY (organization-wide with pagination)
// ============================================================================

/**
 * Hook for fetching extension history across the organization.
 * Supports filtering by extension type and date range.
 *
 * @param options - Filter and pagination options
 */
export function useExtensionHistory(options?: GetExtensionHistoryInput) {
  const params: GetExtensionHistoryInput = {
    page: options?.page ?? 1,
    limit: options?.limit ?? 20,
    sortBy: options?.sortBy ?? 'created_at_desc',
    extensionType: options?.extensionType,
    startDate: options?.startDate,
    endDate: options?.endDate,
  };

  return useQuery({
    queryKey: queryKeys.warrantyExtensions.historyFiltered(params),
    queryFn: async () => {
      const result = await getExtensionHistory({ data: params });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
  });
}

// ============================================================================
// GET EXTENSION BY ID
// ============================================================================

/**
 * Hook for fetching a single extension by ID with full details.
 *
 * @param extensionId - The extension ID to fetch
 */
export function useExtensionById(extensionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.warrantyExtensions.detail(extensionId ?? ''),
    queryFn: async () => {
      const result = await getExtensionById({
        data: { extensionId: extensionId! } 
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: !!extensionId,
  });
}

// ============================================================================
// EXTEND WARRANTY (Mutation)
// ============================================================================

/**
 * Hook for extending a warranty's coverage period.
 *
 * On success:
 * - Invalidates the warranty's extensions list
 * - Invalidates the extension history
 * - Shows a success toast
 *
 * On error:
 * - Shows an error toast with the error message
 */
export function useExtendWarranty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExtendWarrantyInput) => extendWarranty({ data }),
    onSuccess: (result, variables) => {
      // Invalidate the specific warranty's extensions list
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyExtensions.list(variables.warrantyId),
      });
      // Invalidate the organization-wide history
      queryClient.invalidateQueries({
        queryKey: queryKeys.warrantyExtensions.history(),
      });
      // Invalidate warranty queries to update expiry date display
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranties.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.warranties.detail(variables.warrantyId),
      });

      const newExpiry = new Date(result.warranty.newExpiryDate);
      if (result.notificationQueued === false) {
        toast.warning(
          `Warranty extended but we couldn't send the email notification. The customer will not be notified.`
        );
      } else {
        toast.success(
          `Warranty extended by ${variables.extensionMonths} month${variables.extensionMonths > 1 ? 's' : ''}. New expiry: ${newExpiry.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
        );
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to extend warranty');
    },
  });
}

// ============================================================================
// HELPER: Calculate new expiry date preview
// ============================================================================

/**
 * Calculate the new expiry date given current expiry and extension months.
 *
 * @param currentExpiry - Current expiry date (Date or ISO string)
 * @param extensionMonths - Number of months to extend
 * @returns New expiry date
 */
export { calculateNewExpiryDate, formatDateAustralian, getDaysDifference };
