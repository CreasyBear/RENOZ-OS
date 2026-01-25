/**
 * Knowledge Base Category Tree
 *
 * Displays categories in a hierarchical tree structure with accordion.
 *
 * @see src/hooks/use-knowledge-base.ts
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-007b
 */

import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { KbCategoryResponse } from '@/lib/schemas/support/knowledge-base';

// ============================================================================
// TYPES
// ============================================================================

interface CategoryTreeNode extends KbCategoryResponse {
  children?: CategoryTreeNode[];
}

interface KbCategoryTreeProps {
  /** From route container (useKbCategories). */
  categories: KbCategoryResponse[];
  selectedId?: string | null;
  onSelect?: (category: KbCategoryResponse | null) => void;
  /** From route container (selection handler). */
  onEdit?: (category: KbCategoryResponse) => void;
  /** From route container (useDeleteKbCategory). */
  onDelete?: (category: KbCategoryResponse) => void;
  showActions?: boolean;
  showCounts?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function buildTree(categories: KbCategoryResponse[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // First pass: create nodes
  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort by sortOrder
  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((node) => {
      if (node.children?.length) {
        sortNodes(node.children);
      }
    });
  };
  sortNodes(roots);

  return roots;
}

// ============================================================================
// TREE NODE COMPONENT
// ============================================================================

interface TreeNodeProps {
  node: CategoryTreeNode;
  level: number;
  selectedId?: string | null;
  onSelect?: (category: KbCategoryResponse | null) => void;
  onEdit?: (category: KbCategoryResponse) => void;
  onDelete?: (category: KbCategoryResponse) => void;
  showActions?: boolean;
  showCounts?: boolean;
}

function TreeNode({
  node,
  level,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  showActions,
  showCounts,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          'group hover:bg-muted/50 flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5',
          isSelected && 'bg-muted'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect?.(isSelected ? null : node)}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
          </Button>
        ) : (
          <span className="w-6" />
        )}

        {expanded && hasChildren ? (
          <FolderOpen className="text-muted-foreground h-4 w-4" />
        ) : (
          <Folder className="text-muted-foreground h-4 w-4" />
        )}

        <span className={cn('flex-1 text-sm', !node.isActive && 'text-muted-foreground')}>
          {node.name}
        </span>

        {!node.isActive && (
          <Badge variant="outline" className="text-xs">
            Inactive
          </Badge>
        )}

        {showCounts && node.articleCount !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {node.articleCount}
          </Badge>
        )}

        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(node)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(node)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onEdit={onEdit}
              showActions={showActions}
              showCounts={showCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function KbCategoryTree({
  categories,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  showActions = true,
  showCounts = true,
}: KbCategoryTreeProps) {
  const tree = buildTree(categories);

  if (tree.length === 0) {
    return <div className="text-muted-foreground p-4 text-center text-sm">No categories found</div>;
  }

  return (
    <div className="space-y-0.5">
      {/* All Articles option */}
      <div
        className={cn(
          'hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5',
          selectedId === null && 'bg-muted'
        )}
        onClick={() => onSelect?.(null)}
      >
        <span className="w-6" />
        <Folder className="text-muted-foreground h-4 w-4" />
        <span className="flex-1 text-sm font-medium">All Articles</span>
      </div>

      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          showActions={showActions}
          showCounts={showCounts}
        />
      ))}
    </div>
  );
}
