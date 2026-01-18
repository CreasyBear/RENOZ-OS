/**
 * Change Diff Viewer
 *
 * Displays before/after values for activity changes in a side-by-side format.
 * Handles various data types including objects, arrays, and primitives.
 *
 * @see ACTIVITY-TIMELINE-UI acceptance criteria
 */

import { cn } from "~/lib/utils";
import type { ActivityChanges } from "@/lib/schemas/activities";

// ============================================================================
// TYPES
// ============================================================================

interface ChangeDiffProps {
  changes: ActivityChanges | null;
  className?: string;
  /** Show compact view (single line per field) vs full diff */
  compact?: boolean;
}

interface FieldDiffProps {
  field: string;
  before: unknown;
  after: unknown;
  compact?: boolean;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format a value for display, handling various types.
 */
function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "—";
  if (value === "") return '""';

  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value;

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length <= 3) return value.join(", ");
    return `[${value.length} items]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    if (keys.length <= 2) {
      return `{${keys.map((k) => `${k}: ${formatValue((value as Record<string, unknown>)[k])}`).join(", ")}}`;
    }
    return `{${keys.length} properties}`;
  }

  return String(value);
}

/**
 * Get CSS classes for diff styling.
 */
function getDiffClasses(type: "before" | "after" | "unchanged") {
  switch (type) {
    case "before":
      return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400";
    case "after":
      return "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400";
    case "unchanged":
      return "text-muted-foreground";
  }
}

// ============================================================================
// FIELD DIFF COMPONENT
// ============================================================================

function FieldDiff({ field, before, after, compact }: FieldDiffProps) {
  const beforeStr = formatValue(before);
  const afterStr = formatValue(after);
  const hasChange = beforeStr !== afterStr;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm py-1">
        <span className="font-medium text-muted-foreground min-w-[100px]">
          {field}:
        </span>
        {hasChange ? (
          <>
            <span className={cn("px-1.5 py-0.5 rounded line-through", getDiffClasses("before"))}>
              {beforeStr}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className={cn("px-1.5 py-0.5 rounded", getDiffClasses("after"))}>
              {afterStr}
            </span>
          </>
        ) : (
          <span className={getDiffClasses("unchanged")}>{beforeStr}</span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start py-2 border-b last:border-0">
      <div>
        <div className="text-xs text-muted-foreground mb-1">Before</div>
        <div className={cn("px-2 py-1 rounded text-sm break-words", getDiffClasses("before"))}>
          {beforeStr}
        </div>
      </div>
      <div className="text-muted-foreground self-center mt-4">→</div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">After</div>
        <div className={cn("px-2 py-1 rounded text-sm break-words", getDiffClasses("after"))}>
          {afterStr}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Displays activity changes in a diff format.
 *
 * @example
 * ```tsx
 * <ChangeDiff
 *   changes={{
 *     before: { status: "draft", name: "Old Name" },
 *     after: { status: "active", name: "New Name" },
 *     fields: ["status", "name"]
 *   }}
 * />
 * ```
 */
export function ChangeDiff({ changes, className, compact = false }: ChangeDiffProps) {
  if (!changes || !changes.fields?.length) {
    return (
      <div className={cn("text-sm text-muted-foreground italic", className)}>
        No changes recorded
      </div>
    );
  }

  const { before, after, fields } = changes;

  return (
    <div className={cn("space-y-1", className)} role="list" aria-label="Field changes">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        {fields.length} field{fields.length === 1 ? "" : "s"} changed
      </div>
      {fields.map((field) => (
        <div key={field} role="listitem">
          <FieldDiff
            field={field}
            before={before?.[field]}
            after={after?.[field]}
            compact={compact}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Compact inline diff for single field changes.
 */
export function InlineChangeDiff({
  before,
  after,
  className,
}: {
  before: unknown;
  after: unknown;
  className?: string;
}) {
  const beforeStr = formatValue(before);
  const afterStr = formatValue(after);

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className={cn("px-1 rounded text-xs line-through", getDiffClasses("before"))}>
        {beforeStr}
      </span>
      <span className="text-muted-foreground text-xs">→</span>
      <span className={cn("px-1 rounded text-xs", getDiffClasses("after"))}>
        {afterStr}
      </span>
    </span>
  );
}

export { formatValue };
