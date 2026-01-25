/**
 * Checklist Item Card
 *
 * Individual checklist item with checkbox, notes, and photo attachment.
 * 44px touch targets for mobile accessibility.
 *
 * @see _Initiation/_prd/2-domains/jobs/jobs.prd.json - DOM-JOBS-004c
 */

import * as React from 'react';
import { Camera, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { ChecklistItemResponse } from '@/lib/schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface ChecklistItemCardProps {
  item: ChecklistItemResponse;
  onToggleComplete: (isCompleted: boolean) => void;
  onUpdateNotes: (notes: string | null) => void;
  onAttachPhoto: () => void;
  isUpdating?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChecklistItemCard({
  item,
  onToggleComplete,
  onUpdateNotes,
  onAttachPhoto,
  isUpdating = false,
}: ChecklistItemCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [localNotes, setLocalNotes] = React.useState(item.notes ?? '');
  const [notesChanged, setNotesChanged] = React.useState(false);

  // Sync local notes when item changes
  React.useEffect(() => {
    setLocalNotes(item.notes ?? '');
    setNotesChanged(false);
  }, [item.notes]);

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    setNotesChanged(value !== (item.notes ?? ''));
  };

  const handleSaveNotes = () => {
    onUpdateNotes(localNotes || null);
    setNotesChanged(false);
  };

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    if (checked !== 'indeterminate') {
      onToggleComplete(checked);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        item.isCompleted && 'bg-muted/50 border-muted'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox - 44px touch target */}
        <div className="flex min-h-[44px] min-w-[44px] items-center justify-center">
          <Checkbox
            id={`item-${item.id}`}
            checked={item.isCompleted}
            onCheckedChange={handleCheckboxChange}
            disabled={isUpdating}
            className="h-6 w-6"
            aria-label={`Mark "${item.itemText}" as ${item.isCompleted ? 'incomplete' : 'complete'}`}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <label
              htmlFor={`item-${item.id}`}
              className={cn(
                'cursor-pointer text-sm font-medium',
                item.isCompleted && 'text-muted-foreground line-through'
              )}
            >
              {item.itemText}
            </label>

            {/* Badges */}
            <div className="flex shrink-0 items-center gap-1">
              {item.requiresPhoto && !item.photoUrl && (
                <Badge variant="outline" className="text-xs">
                  <Camera className="mr-1 h-3 w-3" />
                  Photo
                </Badge>
              )}
              {item.photoUrl && (
                <Badge variant="secondary" className="text-xs">
                  <Camera className="mr-1 h-3 w-3" />
                  Attached
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {item.itemDescription && (
            <p className="text-muted-foreground mt-1 text-sm">{item.itemDescription}</p>
          )}

          {/* Completed info */}
          {item.isCompleted && item.completedByUser && (
            <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
              <User className="h-3 w-3" />
              <span>
                Completed by {item.completedByUser.name || item.completedByUser.email}
                {item.completedAt && (
                  <>
                    {' on '}
                    {new Date(item.completedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable notes/photo section */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              {isExpanded ? (
                <ChevronUp className="mr-1 h-4 w-4" />
              ) : (
                <ChevronDown className="mr-1 h-4 w-4" />
              )}
              {item.notes ? 'Edit Notes' : 'Add Notes'}
            </Button>
          </CollapsibleTrigger>

          {item.requiresPhoto && (
            <Button variant="ghost" size="sm" className="h-8" onClick={onAttachPhoto}>
              <Camera className="mr-1 h-4 w-4" />
              {item.photoUrl ? 'Change Photo' : 'Add Photo'}
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-3">
          <div className="space-y-2">
            <Textarea
              placeholder="Add notes about this item..."
              value={localNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={2}
              className="resize-none"
            />
            {notesChanged && (
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveNotes} disabled={isUpdating}>
                  Save Notes
                </Button>
              </div>
            )}
          </div>

          {/* Photo preview */}
          {item.photoUrl && (
            <div className="mt-3">
              <img
                src={item.photoUrl}
                alt="Checklist item photo"
                className="max-h-48 rounded-lg object-cover"
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
