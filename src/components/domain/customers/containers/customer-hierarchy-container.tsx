/**
 * Customer Hierarchy Container
 *
 * ARCHITECTURE: Container Component - handles data fetching and mutations.
 * Fetches customers, transforms to tree structure, handles parent updates.
 *
 * @see ./customer-hierarchy-tree.tsx (presenter)
 * @see src/hooks/customers/use-customers.ts (hooks)
 */

import { useMemo, useCallback } from 'react';
import { useCustomers, useUpdateCustomer, useCustomerNavigation } from '@/hooks/customers';
import { toastSuccess, toastError, useConfirmation } from '@/hooks';
import { CustomerHierarchyTree, type CustomerNode } from '../customer-hierarchy-tree';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerHierarchyContainerProps {
  /** Current customer ID (to highlight in tree) */
  currentCustomerId?: string;
  /** Organization ID to filter customers */
  organizationId?: string;
  /** Show health score badges */
  showHealthScore?: boolean;
  /** Show order count badges */
  showOrderCount?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Transform flat customer list to tree structure
 */
function buildCustomerTree(customers: Array<{
  id: string;
  name: string;
  customerCode?: string | null;
  status: string;
  type: string;
  parentId?: string | null;
  healthScore?: number | null;
  totalOrders?: number | null;
}>): CustomerNode[] {
  // Create a map for quick lookup
  const customerMap = new Map<string, CustomerNode>();
  
  // First pass: create all nodes
  customers.forEach((customer) => {
    customerMap.set(customer.id, {
      id: customer.id,
      name: customer.name,
      customerCode: customer.customerCode,
      status: customer.status,
      type: customer.type,
      parentId: customer.parentId,
      children: [],
      healthScore: customer.healthScore,
      totalOrders: customer.totalOrders,
    });
  });
  
  // Second pass: build parent-child relationships
  const rootNodes: CustomerNode[] = [];
  
  customerMap.forEach((node) => {
    if (node.parentId) {
      const parent = customerMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not found, treat as root
        rootNodes.push(node);
      }
    } else {
      // No parent, it's a root node
      rootNodes.push(node);
    }
  });
  
  return rootNodes;
}

// ============================================================================
// CONTAINER
// ============================================================================

export function CustomerHierarchyContainer({
  currentCustomerId,
  showHealthScore = false,
  showOrderCount = false,
  className,
}: CustomerHierarchyContainerProps) {
  const { navigateToCustomer } = useCustomerNavigation();
  const confirmation = useConfirmation();
  
  // Fetch all customers (we need the full list to build the tree)
  const { data: customersData, isLoading } = useCustomers({
    // Fetch all customers - we'll filter client-side for tree
    pageSize: 1000, // Large page size to get all customers
  });
  
  // Update customer mutation
  const updateCustomerMutation = useUpdateCustomer();
  
  // Transform customers to tree structure
  const treeNodes = useMemo(() => {
    if (!customersData?.items) return [];
    return buildCustomerTree(customersData.items);
  }, [customersData]);
  
  // Handle viewing a customer
  const handleViewCustomer = useCallback((customerId: string) => {
    navigateToCustomer(customerId);
  }, [navigateToCustomer]);
  
  // Handle setting parent relationship
  const handleSetParent = useCallback(async (customerId: string, parentId: string | null) => {
    // Prevent circular references
    if (parentId === customerId) {
      toastError('Cannot set customer as its own parent');
      return;
    }
    
    // Check for circular reference in tree
    const checkCircular = (nodeId: string, targetParentId: string | null, visited = new Set<string>()): boolean => {
      if (visited.has(nodeId)) return false; // Already checked this branch
      visited.add(nodeId);
      
      if (nodeId === targetParentId) return true; // Found circular reference
      
      const node = customersData?.items.find((c) => c.id === nodeId);
      if (!node?.parentId) return false;
      
      return checkCircular(node.parentId, targetParentId, visited);
    };
    
    if (parentId && checkCircular(parentId, customerId)) {
      toastError('Cannot create circular parent relationship');
      return;
    }
    
    // Confirm action
    const action = parentId ? 'set parent' : 'remove parent';
    const { confirmed } = await confirmation.confirm({
      title: `Update customer`,
      description: `Are you sure you want to ${action} for this customer?`,
      confirmLabel: 'Update',
      variant: 'default',
    });
    
    if (!confirmed) return;
    
    try {
      await updateCustomerMutation.mutateAsync({
        id: customerId,
        parentId: parentId || undefined,
      });
      toastSuccess(`Customer ${action} updated`);
    } catch (error) {
      toastError(error instanceof Error ? error.message : `Failed to ${action}`);
    }
  }, [updateCustomerMutation, customersData, confirmation]);
  
  return (
    <CustomerHierarchyTree
      customers={treeNodes}
      selectedId={currentCustomerId}
      onViewCustomer={handleViewCustomer}
      onSetParent={handleSetParent}
      isLoading={isLoading}
      showHealthScore={showHealthScore}
      showOrderCount={showOrderCount}
      className={className}
    />
  );
}
