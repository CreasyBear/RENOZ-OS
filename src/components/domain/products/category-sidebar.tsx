/**
 * CategorySidebar Component
 *
 * Hierarchical category tree navigation for product filtering.
 *
 * Features:
 * - Expandable/collapsible tree structure
 * - Active category highlighting
 * - Product count per category (future)
 */
import { useState } from "react";
import { ChevronRight, ChevronDown, FolderOpen, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Category with children from getCategoryTree
interface CategoryNode {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children: CategoryNode[];
}

interface CategorySidebarProps {
  categories: CategoryNode[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string | null) => void;
}

interface CategoryItemProps {
  category: CategoryNode;
  level: number;
  selectedCategoryId?: string;
  onSelect: (categoryId: string | null) => void;
  expandedIds: Set<string>;
  onToggleExpand: (categoryId: string) => void;
}

function CategoryItem({
  category,
  level,
  selectedCategoryId,
  onSelect,
  expandedIds,
  onToggleExpand,
}: CategoryItemProps) {
  const isSelected = selectedCategoryId === category.id;
  const isExpanded = expandedIds.has(category.id);
  const hasChildren = category.children.length > 0;

  return (
    <div>
      <button
        onClick={() => onSelect(category.id)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isSelected && "bg-primary/10 text-primary font-medium",
          level > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(category.id);
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" /> // Spacer for alignment
        )}

        {/* Folder icon */}
        {isExpanded || isSelected ? (
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Category name */}
        <span className="truncate">{category.name}</span>
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {category.children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              level={level + 1}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategorySidebarProps) {
  // Track expanded category IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand path to selected category
    const expanded = new Set<string>();
    if (selectedCategoryId) {
      // Find and expand parent path (simple approach for now)
      const findPath = (cats: CategoryNode[], targetId: string): string[] => {
        for (const cat of cats) {
          if (cat.id === targetId) return [cat.id];
          if (cat.children.length > 0) {
            const path = findPath(cat.children, targetId);
            if (path.length > 0) return [cat.id, ...path];
          }
        }
        return [];
      };
      const path = findPath(categories, selectedCategoryId);
      path.forEach((id) => expanded.add(id));
    }
    return expanded;
  });

  const toggleExpand = (categoryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Categories</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* All products option */}
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            !selectedCategoryId && "bg-primary/10 text-primary font-medium"
          )}
        >
          <span className="w-5" /> {/* Spacer */}
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span>All Products</span>
        </button>

        {/* Category tree */}
        <div className="mt-2 space-y-0.5">
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              level={0}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelectCategory}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>

        {/* Empty state */}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No categories yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
