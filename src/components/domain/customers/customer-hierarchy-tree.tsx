/**
 * CustomerHierarchyTree Component
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 *
 * Hierarchical tree visualization for customer parent-child relationships.
 * Based on CategoryTree pattern but simplified for customer hierarchy.
 *
 * Features:
 * - Expand/collapse nodes
 * - View customer details
 * - Set parent (change hierarchy)
 * - Visual hierarchy representation
 *
 * @see src/components/domain/products/categories/category-tree.tsx
 * @see _development/_audit/container-presenter-standardization/design-patterns.md
 */

import { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  MoreHorizontal,
  Eye,
  Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { TruncateTooltip } from '@/components/shared/truncate-tooltip';
import { useCustomerNavigation } from '@/hooks/customers';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerNode {
  id: string;
  name: string;
  customerCode?: string | null;
  status: string;
  type: string;
  parentId?: string | null;
  children: CustomerNode[];
  healthScore?: number | null;
  totalOrders?: number | null;
}

interface CustomerHierarchyTreeProps {
  /** @source useCustomers hook in container (transformed to tree structure) */
  customers: CustomerNode[];
  selectedId?: string | null;
  onSelect?: (customer: CustomerNode) => void;
  onViewCustomer?: (customerId: string) => void;
  onSetParent?: (customerId: string, parentId: string | null) => void;
  isLoading?: boolean;
  showHealthScore?: boolean;
  showOrderCount?: boolean;
  /** Additional CSS classes for root element */
  className?: string;
}

interface TreeNodeProps {
  node: CustomerNode;
  level: number;
  selectedId?: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect?: (customer: CustomerNode) => void;
  onViewCustomer?: (customerId: string) => void;
  onSetParent?: (customerId: string, parentId: string | null) => void;
  showHealthScore?: boolean;
  showOrderCount?: boolean;
}

// ============================================================================
// TREE NODE COMPONENT
// ============================================================================

function TreeNode({
  node,
  level,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  onViewCustomer,
  onSetParent,
  showHealthScore = false,
  showOrderCount = false,
}: TreeNodeProps) {
  const { navigateToCustomer } = useCustomerNavigation();
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        onToggle(node.id);
      }
    },
    [hasChildren, node.id, onToggle]
  );

  const handleSelect = useCallback(() => {
    onSelect?.(node);
  }, [node, onSelect]);

  const handleView = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onViewCustomer) {
        onViewCustomer(node.id);
      } else {
        navigateToCustomer(node.id);
      }
    },
    [node.id, onViewCustomer, navigateToCustomer]
  );

  const handleSetParent = useCallback(
    (parentId: string | null) => {
      onSetParent?.(node.id, parentId);
    },
    [node.id, onSetParent]
  );

  const handleUnlink = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleSetParent(null);
    },
    [handleSetParent]
  );

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent cursor-pointer',
          isSelected && 'bg-accent',
          level > 0 && 'ml-6'
        )}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Button */}
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'flex items-center justify-center w-4 h-4 rounded transition-colors',
            hasChildren ? 'cursor-pointer hover:bg-accent' : 'cursor-default opacity-0'
          )}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : null}
        </button>

        {/* Customer Icon */}
        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        {/* Customer Name */}
        <TruncateTooltip
          text={node.name}
          maxLength={30}
          maxWidth="flex-1"
          className={cn('text-sm', isSelected && 'font-medium')}
        />

        {/* Customer Code */}
        {node.customerCode && (
          <Badge variant="outline" className="text-xs h-5 px-1.5">
            {node.customerCode}
          </Badge>
        )}

        {/* Status Badge */}
        <Badge
          variant={
            node.status === 'active'
              ? 'default'
              : node.status === 'prospect'
                ? 'secondary'
                : 'outline'
          }
          className="text-xs h-5 px-1.5"
        >
          {node.status}
        </Badge>

        {/* Health Score */}
        {showHealthScore && node.healthScore !== null && node.healthScore !== undefined && (
          <Badge
            variant={node.healthScore >= 80 ? 'default' : node.healthScore >= 60 ? 'secondary' : 'destructive'}
            className="text-xs h-5 px-1.5"
          >
            {node.healthScore}
          </Badge>
        )}

        {/* Order Count */}
        {showOrderCount && node.totalOrders !== null && node.totalOrders !== undefined && node.totalOrders > 0 && (
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {node.totalOrders} orders
          </Badge>
        )}

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={handleView}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {node.parentId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleUnlink} className="text-destructive">
                  <Unlink className="h-4 w-4 mr-2" />
                  Remove Parent
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onViewCustomer={onViewCustomer}
              onSetParent={onSetParent}
              showHealthScore={showHealthScore}
              showOrderCount={showOrderCount}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerHierarchyTree({
  customers,
  selectedId,
  onSelect,
  onViewCustomer,
  onSetParent,
  isLoading = false,
  showHealthScore = false,
  showOrderCount = false,
  className,
}: CustomerHierarchyTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Initially expand root level (customers with no parent)
    return new Set(customers.filter((c) => !c.parentId).map((c) => c.id));
  });

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (nodes: CustomerNode[]) => {
      nodes.forEach((node) => {
        allIds.add(node.id);
        if (node.children.length > 0) {
          collectIds(node.children);
        }
      });
    };
    collectIds(customers);
    setExpandedIds(allIds);
  }, [customers]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No customers found</p>
      </div>
    );
  }

  // Filter to root nodes (no parent)
  const rootNodes = customers.filter((c) => !c.parentId);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">
          {customers.length} customer{customers.length !== 1 ? 's' : ''}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Tree */}
      <div className="space-y-1">
        {rootNodes.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onSelect={onSelect}
            onViewCustomer={onViewCustomer}
            onSetParent={onSetParent}
            showHealthScore={showHealthScore}
            showOrderCount={showOrderCount}
          />
        ))}
      </div>
    </div>
  );
}
