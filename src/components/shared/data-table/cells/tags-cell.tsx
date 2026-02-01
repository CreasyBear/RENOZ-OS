import { memo, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface TagItem {
  id: string;
  name: string;
  color?: string;
}

export interface TagsCellProps {
  /** Array of tags to display */
  tags: TagItem[];
  /** Maximum visible tags before overflow (default: 2) */
  maxVisible?: number;
  /** Click handler for individual tags */
  onTagClick?: (id: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Tag list cell with overflow handling.
 *
 * Shows up to `maxVisible` tags, with remaining count in a tooltip.
 *
 * @example
 * ```tsx
 * <TagsCell
 *   tags={[
 *     { id: "1", name: "Urgent" },
 *     { id: "2", name: "VIP" },
 *     { id: "3", name: "New" },
 *   ]}
 *   maxVisible={2}
 *   onTagClick={(id) => console.log("Clicked:", id)}
 * />
 * ```
 */
export const TagsCell = memo(function TagsCell({
  tags,
  maxVisible = 2,
  onTagClick,
  className,
}: TagsCellProps) {
  if (!tags || tags.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const overflowTags = tags.slice(maxVisible);
  const hasOverflow = overflowTags.length > 0;

  const handleKeyDown = (tagId: string) => (e: KeyboardEvent<HTMLSpanElement>) => {
    if (onTagClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      e.stopPropagation();
      onTagClick(tagId);
    }
  };

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {visibleTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className={cn(
            "text-xs cursor-default",
            onTagClick && "cursor-pointer hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          )}
          style={tag.color ? { backgroundColor: tag.color } : undefined}
          role={onTagClick ? "button" : undefined}
          tabIndex={onTagClick ? 0 : undefined}
          onClick={
            onTagClick
              ? (e) => {
                  e.stopPropagation();
                  onTagClick(tag.id);
                }
              : undefined
          }
          onKeyDown={onTagClick ? handleKeyDown(tag.id) : undefined}
        >
          {tag.name}
        </Badge>
      ))}
      {hasOverflow && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-xs cursor-default"
            >
              +{overflowTags.length}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-1">
              {overflowTags.map((tag) => (
                <span key={tag.id} className="text-xs">
                  {tag.name}
                </span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});

TagsCell.displayName = "TagsCell";
