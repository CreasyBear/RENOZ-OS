/**
 * Audit Trail Card - Project Sidebar
 *
 * Displays project creation/update metadata.
 * Pure presenter component - receives all data via props.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 4.1 Zone 5B
 */

import { Clock, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface AuditTrailCardProps {
  createdAt: Date | string;
  createdByName?: string | null;
  updatedAt?: Date | string | null;
  updatedByName?: string | null;
  version?: number;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return formatDate(d);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AuditTrailCard({
  createdAt,
  createdByName,
  updatedAt,
  updatedByName,
  version,
  className,
}: AuditTrailCardProps) {
  return (
    <Card className={cn('shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {/* Created */}
        <div className="flex items-start gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="text-muted-foreground text-xs">Created</div>
            <div>
              {formatDate(createdAt)}
              {createdByName && (
                <span className="text-muted-foreground"> by {createdByName}</span>
              )}
            </div>
          </div>
        </div>

        {/* Updated */}
        {updatedAt && (
          <div className="flex items-start gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-muted-foreground text-xs">Last updated</div>
              <div>
                {formatRelativeTime(updatedAt)}
                {updatedByName && (
                  <span className="text-muted-foreground"> by {updatedByName}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Version */}
        {version !== undefined && version > 1 && (
          <div className="text-xs text-muted-foreground pt-1 border-t">
            Version {version}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
