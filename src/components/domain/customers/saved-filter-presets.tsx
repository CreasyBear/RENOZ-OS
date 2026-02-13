/**
 * Saved Customer Filter Presets Presenter
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 *
 * Component for displaying and managing user-saved customer filter presets.
 * Extends FilterPresets with save/delete functionality.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 * @see _development/_audit/container-presenter-standardization/design-patterns.md
 */

import { useState } from 'react';
import { BookmarkCheck, MoreVertical, Trash2, Edit2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CustomerFiltersState } from '@/lib/schemas/customers/saved-filters';
import { cn } from '@/lib/utils';
import type { SavedCustomerFilter } from '@/hooks/customers/use-saved-filters';

// ============================================================================
// TYPES
// ============================================================================

export interface SavedFilterPresetsProps {
  /** @source useSavedCustomerFilters hook in CustomersListContainer */
  savedFilters: SavedCustomerFilter[];
  /** @source useSavedCustomerFilters hook in CustomersListContainer */
  isLoading?: boolean;
  /** Current filter state */
  currentFilters: CustomerFiltersState;
  /** Handler to apply a saved filter */
  onApply: (filters: Partial<CustomerFiltersState>) => void;
  /** Handler to save current filters */
  onSave: (name: string, filters: CustomerFiltersState) => Promise<void>;
  /** Handler to update a saved filter name */
  onUpdate: (id: string, name: string) => Promise<void>;
  /** Handler to delete a saved filter */
  onDelete: (id: string) => Promise<void>;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SavedFilterPresets({
  savedFilters,
  isLoading = false,
  currentFilters,
  onApply,
  onSave,
  onUpdate,
  onDelete,
  className,
}: SavedFilterPresetsProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);

  const handleSaveCurrent = async () => {
    if (!filterName.trim()) return;

    try {
      if (editingFilterId) {
        await onUpdate(editingFilterId, filterName.trim());
      } else {
        await onSave(filterName.trim(), currentFilters);
      }
      setFilterName('');
      setEditingFilterId(null);
      setSaveDialogOpen(false);
    } catch {
      // Error handled by container
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved filter?')) return;

    try {
      await onDelete(id);
    } catch {
      // Error handled by container
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2 min-h-8', className)}>
      {/* Save Current Filters - first so it sits next to Active filters bar */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => {
          setEditingFilterId(null);
          setFilterName('');
          setSaveDialogOpen(true);
        }}
        disabled={isLoading}
      >
        <Save className="h-3.5 w-3.5" />
        Save Current Filters
      </Button>

      {/* Saved Filters */}
      {savedFilters.map((saved) => (
        <div key={saved.id} className="relative group inline-flex items-center">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => onApply(saved.filters)}
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            {saved.name}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingFilterId(saved.id);
                  setFilterName(saved.name);
                  setSaveDialogOpen(true);
                }}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(saved.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFilterId ? 'Rename Saved Filter' : 'Save Current Filters'}
            </DialogTitle>
            <DialogDescription>
              {editingFilterId
                ? 'Give this filter preset a new name.'
                : 'Save your current filter settings as a preset for quick access.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Filter Name</Label>
              <Input
                id="filter-name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="e.g., Active High-Value Customers"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filterName.trim()) {
                    handleSaveCurrent();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCurrent} disabled={!filterName.trim()}>
              {editingFilterId ? 'Rename' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
