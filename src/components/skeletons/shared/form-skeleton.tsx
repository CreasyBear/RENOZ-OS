/**
 * FormSkeleton Component
 *
 * Loading placeholder for form-based routes.
 */
import { cn } from '~/lib/utils';
import { Skeleton } from '~/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '~/components/ui/card';

interface FormSkeletonProps {
  /** Number of form field groups to render */
  sections?: number;
  /** Show form actions (submit/cancel buttons) */
  showActions?: boolean;
  className?: string;
}

export function FormSkeleton({
  sections = 3,
  showActions = true,
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn('max-w-4xl space-y-6', className)}>
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-6 w-48" />
      </div>

      {/* Form sections */}
      {Array.from({ length: sections }).map((_, i) => (
        <Card key={`form-section-${i}`}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Field group 1 - two columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            {/* Field group 2 - full width */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Form actions */}
      {showActions && (
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  );
}
