import { Link } from '@tanstack/react-router';
import { MapPin, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import { DataTableEmpty } from '@/components/shared/data-table';
import { FormatAmount } from '@/components/shared/format';
import { cn } from '@/lib/utils';
import { InventoryDashboardReadWarning } from './inventory-dashboard-read-warning';
import type { CategoryStock, LocationStock } from '@/hooks/inventory';

interface InventoryDashboardStockBreakdownCardsProps {
  categories: CategoryStock[];
  locations: LocationStock[];
  isLoading: boolean;
  showDegraded: boolean;
  readErrorMessage: string;
}

export function InventoryDashboardStockBreakdownCards({
  categories,
  locations,
  isLoading,
  showDegraded,
  readErrorMessage,
}: InventoryDashboardStockBreakdownCardsProps) {
  return (
    <>
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">On-Hand by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <CategorySkeleton />
          ) : (
            <div className="space-y-4">
              {showDegraded ? (
                <InventoryDashboardReadWarning
                  title="Category breakdown may be stale."
                  message={readErrorMessage}
                />
              ) : null}
              <CategoryList categories={categories} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">On-Hand by Location</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LocationSkeleton />
          ) : (
            <div className="space-y-4">
              {showDegraded ? (
                <InventoryDashboardReadWarning
                  title="Location breakdown may be stale."
                  message={readErrorMessage}
                />
              ) : null}
              <LocationList locations={locations} />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function CategoryList({
  categories,
}: {
  categories: CategoryStock[];
}) {
  if (categories.length === 0) {
    return (
      <DataTableEmpty
        variant="empty"
        icon={Package}
        title="No categories found"
        description="Inventory items will be grouped by category once products are assigned categories."
        className="py-4"
      />
    );
  }

  return (
    <div className="space-y-3">
      {categories.slice(0, 5).map((category) => (
        <div
          key={category.categoryId ?? 'uncategorized'}
          className="flex items-center justify-between"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{category.categoryName}</p>
            <p className="text-xs text-muted-foreground">
              <FormatAmount amount={category.totalValue} showCents={false} />
            </p>
          </div>
          <Badge variant="secondary" className="ml-2 tabular-nums">
            {category.unitCount.toLocaleString()}
          </Badge>
        </div>
      ))}
      {categories.length > 5 && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          +{categories.length - 5} more categories
        </p>
      )}
    </div>
  );
}

function LocationList({
  locations,
}: {
  locations: LocationStock[];
}) {
  if (locations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No locations configured</p>
        <Link
          to="/inventory/locations"
          className={cn(buttonVariants({ variant: 'link', size: 'sm' }))}
        >
          Add a location
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {locations.slice(0, 5).map((location) => (
        <div key={location.locationId}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate">{location.locationName}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {location.percentage}%
            </span>
          </div>
          <Progress value={location.percentage} className="h-1.5" />
        </div>
      ))}
      {locations.length > 5 && (
        <Link
          to="/inventory/locations"
          className="block text-xs text-muted-foreground text-center pt-2 hover:text-foreground"
        >
          View all {locations.length} locations
        </Link>
      )}
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
    </div>
  );
}

function LocationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index}>
          <div className="flex justify-between mb-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}
