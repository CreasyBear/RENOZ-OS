/**
 * FulfillmentHeader Component
 *
 * Advanced header controls for the fulfillment dashboard.
 * Includes sorting, date filtering, import/export, and automation controls.
 *
 * @see Square UI task-management header reference
 */
import { useState, memo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Download,
  Upload,
  Settings,
  SortAsc,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { FulfillmentFilters } from './fulfillment-filters';
import { CollaborationStatus } from './realtime-status';
import { useFulfillmentPresence } from './user-presence';
import type { FulfillmentFiltersState } from './fulfillment-filters';

export interface FulfillmentHeaderProps {
  filters: FulfillmentFiltersState;
  onFiltersChange: (filters: FulfillmentFiltersState) => void;
  availableCustomers?: Array<{ id: string; name: string }>;
  realtimeStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectAttempts?: number;
  onReconnect?: () => void;
  onSort?: (sortBy: string, direction: 'asc' | 'desc') => void;
  onDateFilter?: (date: Date | undefined) => void;
  onImport?: () => void;
  onExport?: () => void;
  onAddOrder?: (stage?: string) => void;
  onRefresh?: () => void;
  activeUserCount?: number;
  isRefreshing?: boolean;
  isExporting?: boolean;
  lastUpdate?: Date;
  className?: string;
}

export const FulfillmentHeader = memo(function FulfillmentHeader({
  filters,
  onFiltersChange,
  availableCustomers = [],
  realtimeStatus = 'connecting',
  reconnectAttempts = 0,
  onReconnect,
  activeUserCount = 1,
  onSort,
  onDateFilter,
  onImport,
  onExport,
  onAddOrder,
  onRefresh,
  isRefreshing = false,
  isExporting = false,
  lastUpdate,
  className,
}: FulfillmentHeaderProps) {
  useFulfillmentPresence();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateOpen, setDateOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    onDateFilter?.(date);
    setDateOpen(false);
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className={`border-border bg-background border-b ${className || ''}`}>
      {/* Top row - Title and primary actions */}
      <div className="flex items-center justify-between px-4 py-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold">Fulfillment Dashboard</h1>
            <p className="text-muted-foreground text-sm">Manage order fulfillment workflow</p>
          </div>
          <div className="flex items-center gap-3">
            <CollaborationStatus
              realtimeStatus={realtimeStatus}
              activeUserCount={activeUserCount}
              reconnectAttempts={reconnectAttempts}
              onReconnect={onReconnect}
            />
            {lastUpdate && (
              <Badge variant="outline" className="text-xs">
                Updated {formatLastUpdate(lastUpdate)}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <div className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}>⟳</div>
            Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onAddOrder?.('to_allocate')}
            className="gap-2"
          >
            <Plus className="size-4" />
            Add Order
          </Button>
        </div>
      </div>

      {/* Bottom row - Filters and controls */}
      <div className="border-border flex items-center justify-between overflow-x-auto border-t px-4 py-3 lg:px-6">
        <div className="flex shrink-0 items-center gap-3">
          <FulfillmentFilters
            filters={filters}
            onChange={onFiltersChange}
            availableCustomers={availableCustomers}
          />

          {/* Sort dropdown */}
          {onSort && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SortAsc className="size-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onSort('priority', 'desc')}>
                  Priority (High to Low)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSort('date', 'asc')}>
                  Due Date (Earliest First)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSort('value', 'desc')}>
                  Value (Highest First)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSort('customer', 'asc')}>
                  Customer (A-Z)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Date filter */}
          {onDateFilter && (
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="size-4" />
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Import/Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Import functionality is available in the Fulfillment Overview dashboard */}
              {onImport && (
                <DropdownMenuItem onClick={onImport} className="gap-2">
                  <Upload className="size-4" />
                  Import Orders
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onExport} disabled={isExporting} className="gap-2">
                <Download className="size-4" />
                {isExporting ? 'Exporting...' : 'Export Data'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Automation placeholder */}
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="size-4" />
            Automate
          </Button>
        </div>
      </div>
    </div>
  );
});
