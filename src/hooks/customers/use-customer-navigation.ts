/**
 * Customer Navigation Hook
 *
 * Shared hook for consistent customer navigation across the application.
 * Provides memoized navigation handlers for common customer routes.
 *
 * @example
 * ```tsx
 * const { navigateToCustomer, navigateToEdit, navigateToCreate } = useCustomerNavigation();
 * 
 * // Navigate to customer detail
 * navigateToCustomer(customerId);
 * 
 * // Navigate to edit customer
 * navigateToEdit(customerId);
 * 
 * // Navigate to create customer
 * navigateToCreate();
 * ```
 */

import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';

export interface UseCustomerNavigationReturn {
  /** Navigate to customer detail page */
  navigateToCustomer: (customerId: string) => void;
  /** Navigate to customer edit page */
  navigateToEdit: (customerId: string) => void;
  /** Navigate to customer create page */
  navigateToCreate: () => void;
  /** Navigate to customers list */
  navigateToList: () => void;
}

/**
 * Hook for customer navigation
 */
export function useCustomerNavigation(): UseCustomerNavigationReturn {
  const navigate = useNavigate();

  const navigateToCustomer = useCallback(
    (customerId: string) => {
      navigate({
        to: '/customers/$customerId',
        params: { customerId },
        search: {},
      });
    },
    [navigate]
  );

  const navigateToEdit = useCallback(
    (customerId: string) => {
      navigate({
        to: '/customers/$customerId/edit',
        params: { customerId },
        search: {},
      });
    },
    [navigate]
  );

  const navigateToCreate = useCallback(() => {
    navigate({ to: '/customers/new' });
  }, [navigate]);

  const navigateToList = useCallback(() => {
    navigate({ to: '/customers' });
  }, [navigate]);

  return {
    navigateToCustomer,
    navigateToEdit,
    navigateToCreate,
    navigateToList,
  };
}
