import { isReadQueryError } from '@/lib/read-path-policy';

export const SUPPLIER_LIST_FALLBACK_MESSAGE =
  'Supplier list is temporarily unavailable. Please refresh and try again.';

export const SUPPLIER_DETAIL_FALLBACK_MESSAGE =
  'Supplier details are temporarily unavailable. Please refresh and try again.';

export const SUPPLIER_EDIT_MISSING_DETAIL_MESSAGE =
  'The supplier could not be loaded for editing. Refresh and try again.';

export function getSupplierListReadErrorMessage(error: unknown): string {
  return isReadQueryError(error) ? error.message : SUPPLIER_LIST_FALLBACK_MESSAGE;
}

export function getSupplierDetailReadErrorMessage(error: unknown): string {
  if (!error) {
    return SUPPLIER_EDIT_MISSING_DETAIL_MESSAGE;
  }

  return isReadQueryError(error) ? error.message : SUPPLIER_DETAIL_FALLBACK_MESSAGE;
}
