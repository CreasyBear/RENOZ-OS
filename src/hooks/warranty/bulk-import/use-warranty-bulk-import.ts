/**
 * Warranty Bulk Import TanStack Query Hook
 *
 * Provides mutations for CSV preview and bulk warranty registration.
 *
 * @see src/server/functions/warranty-bulk-import.ts
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json - DOM-WAR-005b
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  previewBulkWarrantyImport,
  bulkRegisterWarrantiesFromCsv,
} from '@/server/functions/warranty/bulk-import/warranty-bulk-import';
import type {
  PreviewBulkWarrantyImportInput,
  BulkRegisterWarrantiesInput,
  PreviewResult,
  BulkRegisterResult,
} from '@/lib/schemas/warranty/bulk-import';
import { toast } from '../../_shared/use-toast';

// ============================================================================
// QUERY KEYS
// ============================================================================

// Query keys are now centralized in @/lib/query-keys.ts

// ============================================================================
// PREVIEW BULK IMPORT
// ============================================================================

/**
 * Hook for previewing bulk warranty import from CSV.
 * Parses and validates CSV without creating records.
 */
export function usePreviewWarrantyImport() {
  return useMutation<PreviewResult, Error, PreviewBulkWarrantyImportInput>({
    mutationFn: (data) => previewBulkWarrantyImport({ data }),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to parse CSV');
    },
  });
}

// ============================================================================
// BULK REGISTER WARRANTIES
// ============================================================================

/**
 * Hook for bulk registering warranties from validated CSV data.
 * Creates warranty records for all valid rows.
 */
export function useBulkRegisterWarranties() {
  const queryClient = useQueryClient();

  return useMutation<BulkRegisterResult, Error, BulkRegisterWarrantiesInput>({
    mutationFn: (data) => bulkRegisterWarrantiesFromCsv({ data }),
    onSuccess: (data) => {
      // Invalidate warranty-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.warranties.lists() });
      toast.success(`Successfully registered ${data.summary.totalCreated} warranties`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to register warranties');
    },
  });
}
