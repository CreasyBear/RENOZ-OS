/**
 * FulfillmentStats Component
 *
 * Displays summary statistic cards for the fulfillment dashboard.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'success' | 'info';
  loading?: boolean;
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  loading,
}: StatCardProps) {
  const variantStyles = {
    default: 'border-gray-200',
    warning: 'border-orange-200 bg-orange-50',
    success: 'border-green-200 bg-green-50',
    info: 'border-blue-200 bg-blue-50',
  };

  const iconStyles = {
    default: 'text-gray-400',
    warning: 'text-orange-500',
    success: 'text-green-500',
    info: 'text-blue-500',
  };

  if (loading) {
    return (
      <Card className={cn('transition-colors', variantStyles[variant])}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="mt-2 h-8 w-16" />
          <Skeleton className="mt-1 h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('transition-colors', variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">{title}</span>
          <span className={iconStyles[variant]}>{icon}</span>
        </div>
        <div className="mt-2">
          <span className="text-3xl font-semibold text-gray-900">{value}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
