/**
 * Detail Grid Component
 *
 * 2-column responsive grid for displaying entity fields.
 * Based on Midday reference pattern.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { cn } from '@/lib/utils';

export interface DetailGridField {
  /** Field label text */
  label: string;
  /** Field value (React node for flexibility) */
  value: React.ReactNode;
  /** Span full width (both columns) */
  colSpan?: 1 | 2;
  /** Hide this field */
  hidden?: boolean;
}

export interface DetailGridProps {
  /** Array of fields to display */
  fields: DetailGridField[];
  /** Grid columns on larger screens */
  columns?: 2 | 3;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Renders a responsive 2-column grid of label/value pairs.
 *
 * @example
 * ```tsx
 * <DetailGrid
 *   fields={[
 *     { label: 'Name', value: customer.name },
 *     { label: 'Email', value: customer.email },
 *     { label: 'Address', value: customer.address, colSpan: 2 },
 *   ]}
 * />
 * ```
 */
export function DetailGrid({ fields, columns = 2, className }: DetailGridProps) {
  const visibleFields = fields.filter((field) => !field.hidden);

  return (
    <dl
      className={cn(
        'grid gap-4',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
      role="list"
      aria-label="Entity details"
    >
      {visibleFields.map((field, index) => (
        <div
          key={`${field.label}-${index}`}
          className={cn(field.colSpan === 2 && 'sm:col-span-2')}
        >
          <dt className="text-xs text-muted-foreground mb-1">{field.label}</dt>
          <dd className="text-sm">
            {field.value ?? (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default DetailGrid;
