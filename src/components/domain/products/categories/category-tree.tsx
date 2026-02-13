/**
 * CategoryTree Component
 *
 * Hierarchical category tree with drag-drop reordering,
 * expand/collapse, and inline actions.
 */
import { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  GripVertical,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { TruncateTooltip } from "@/components/shared/truncate-tooltip";
import { confirmations, useConfirmation } from "@/hooks";
import type { CategoryNode } from "@/lib/schemas/products";

// CategoryNode type moved to schemas/products.ts - imported above

interface CategoryTreeProps {
  categories: CategoryNode[];
  selectedId?: string | null;
  onSelect?: (category: CategoryNode) => void;
  onEdit?: (category: CategoryNode) => void;
  onDelete?: (category: CategoryNode) => void;
  onAddChild?: (parentCategory: CategoryNode) => void;
  onMove?: (categoryId: string, newParentId: string | null, newSortOrder: number) => void;
  onDuplicate?: (category: CategoryNode) => void;
  isLoading?: boolean;
  showProductCounts?: boolean;
  allowDragDrop?: boolean;
}

interface TreeNodeProps {
  node: CategoryNode;
  level: number;
  selectedId?: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect?: (category: CategoryNode) => void;
  onEdit?: (category: CategoryNode) => void;
  onDelete?: (category: CategoryNode) => void;
  onAddChild?: (parentCategory: CategoryNode) => void;
  onMoveUp?: (category: CategoryNode) => void;
  onMoveDown?: (category: CategoryNode) => void;
  onDuplicate?: (category: CategoryNode) => void;
  showProductCounts?: boolean;
  allowDragDrop?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

function TreeNode({
  node,
  level,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  showProductCounts = true,
  allowDragDrop = false,
  isFirst = false,
  isLast = false,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const confirmation = useConfirmation();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
  };

  const handleSelect = () => {
    onSelect?.(node);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(node);
  };

  const handleDelete = useCallback(async () => {
    const warnings: string[] = [];
    if (hasChildren) {
      warnings.push(
        `Warning: This category has ${node.children.length} subcategories that will also be deleted.`
      );
    }
    if (node.productCount && node.productCount > 0) {
      warnings.push(
        `${node.productCount} products are in this category and will become uncategorized.`
      );
    }

    const baseDescription = `Are you sure you want to delete "${node.name}"?`;
    const description = warnings.length > 0 ? `${baseDescription}\n\n${warnings.join("\n")}` : baseDescription;

    await confirmation.confirm({
      ...confirmations.delete(node.name, "category"),
      description,
      onConfirm: () => onDelete?.(node),
    });
  }, [confirmation, hasChildren, node, onDelete]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect();
    } else if (e.key === "ArrowRight" && hasChildren && !isExpanded) {
      e.preventDefault();
      onToggle(node.id);
    } else if (e.key === "ArrowLeft" && isExpanded) {
      e.preventDefault();
      onToggle(node.id);
    }
  };

  return (
    <>
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={level + 1}
        tabIndex={isSelected ? 0 : -1}
        className={cn(
          "group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
          isSelected && "bg-primary/10 hover:bg-primary/15",
          !node.isActive && "opacity-60"
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
      >
        {/* Drag handle */}
        {allowDragDrop && (
          <button
            type="button"
            aria-label={`Drag ${node.name} to reorder`}
            className="cursor-grab opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Drag to reorder</span>
          </button>
        )}

        {/* Expand/collapse toggle */}
        <button
          type="button"
          aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          aria-expanded={hasChildren ? isExpanded : undefined}
          disabled={!hasChildren}
          className={cn(
            "p-0.5 rounded hover:bg-muted transition-colors",
            !hasChildren && "invisible"
          )}
          onClick={handleToggle}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
        )}

        {/* Category name */}
        <TruncateTooltip
          text={node.name}
          maxLength={30}
          maxWidth="flex-1"
          className={cn("text-sm", isSelected && "font-medium")}
        />

        {/* Product count */}
        {showProductCounts && node.productCount !== undefined && node.productCount > 0 && (
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {node.productCount}
          </Badge>
        )}

        {/* Inactive badge */}
        {!node.isActive && (
          <Badge variant="outline" className="text-xs h-5 px-1.5">
            Inactive
          </Badge>
        )}

        {/* Actions dropdown */}
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
            <DropdownMenuItem onClick={() => onAddChild?.(node)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subcategory
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate?.(node)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!isFirst && (
              <DropdownMenuItem onClick={() => onMoveUp?.(node)}>
                <MoveUp className="h-4 w-4 mr-2" />
                Move Up
              </DropdownMenuItem>
            )}
            {!isLast && (
              <DropdownMenuItem onClick={() => onMoveDown?.(node)}>
                <MoveDown className="h-4 w-4 mr-2" />
                Move Down
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDuplicate={onDuplicate}
              showProductCounts={showProductCounts}
              allowDragDrop={allowDragDrop}
              isFirst={index === 0}
              isLast={index === node.children.length - 1}
            />
          ))}
        </div>
      )}

    </>
  );
}

export function CategoryTree({
  categories,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  onMove,
  onDuplicate,
  isLoading = false,
  showProductCounts = true,
  allowDragDrop = false,
}: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Initially expand first level
    return new Set(categories.map((c) => c.id));
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
    const collectIds = (nodes: CategoryNode[]) => {
      nodes.forEach((node) => {
        allIds.add(node.id);
        if (node.children.length > 0) {
          collectIds(node.children);
        }
      });
    };
    collectIds(categories);
    setExpandedIds(allIds);
  }, [categories]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // Handle move up/down within siblings
  const handleMoveUp = useCallback(
    (category: CategoryNode) => {
      // Find siblings
      const findSiblings = (nodes: CategoryNode[], parentId: string | null): CategoryNode[] | null => {
        if (parentId === null) {
          return categories;
        }
        for (const node of nodes) {
          if (node.id === parentId) {
            return node.children;
          }
          const found = findSiblings(node.children, parentId);
          if (found) return found;
        }
        return null;
      };

      const siblings = findSiblings(categories, category.parentId ?? null);
      if (!siblings) return;

      const index = siblings.findIndex((s) => s.id === category.id);
      if (index > 0) {
        const prevSibling = siblings[index - 1];
        onMove?.(category.id, category.parentId ?? null, prevSibling.sortOrder);
      }
    },
    [categories, onMove]
  );

  const handleMoveDown = useCallback(
    (category: CategoryNode) => {
      const findSiblings = (nodes: CategoryNode[], parentId: string | null): CategoryNode[] | null => {
        if (parentId === null) {
          return categories;
        }
        for (const node of nodes) {
          if (node.id === parentId) {
            return node.children;
          }
          const found = findSiblings(node.children, parentId);
          if (found) return found;
        }
        return null;
      };

      const siblings = findSiblings(categories, category.parentId ?? null);
      if (!siblings) return;

      const index = siblings.findIndex((s) => s.id === category.id);
      if (index < siblings.length - 1) {
        const nextSibling = siblings[index + 1];
        onMove?.(category.id, category.parentId ?? null, nextSibling.sortOrder + 1);
      }
    },
    [categories, onMove]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No categories yet</p>
        <p className="text-sm mt-1">Create your first category to organize products</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Expand/collapse controls */}
      <div className="flex items-center justify-end gap-2 pb-2 border-b">
        <Button variant="ghost" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      {/* Tree */}
      <div className="space-y-0.5">
        {categories.map((category, index) => (
          <TreeNode
            key={category.id}
            node={category}
            level={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onDuplicate={onDuplicate}
            showProductCounts={showProductCounts}
            allowDragDrop={allowDragDrop}
            isFirst={index === 0}
            isLast={index === categories.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
