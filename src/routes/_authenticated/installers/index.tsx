/**
 * Installers List Route
 *
 * Installer directory with card-based layout showing:
 * - Profile info with avatar
 * - Status and availability
 * - Skills badges
 * - Territory coverage
 * - Quick actions
 *
 * SPRINT-03: Story 020 - Installer management routes
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Search,
  Plus,
  MapPin,
  Star,
  Briefcase,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';
import { useInstallers } from '@/hooks/jobs';
import type { InstallerListQuery } from '@/lib/schemas/jobs/installers';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/installers/')({
  component: InstallersListPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Installers" description="Loading..." />
      <PageLayout.Content>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-green-700', bg: 'bg-green-100' },
  busy: { label: 'Busy', color: 'text-orange-700', bg: 'bg-orange-100' },
  away: { label: 'Away', color: 'text-blue-700', bg: 'bg-blue-100' },
  suspended: { label: 'Suspended', color: 'text-red-700', bg: 'bg-red-100' },
  inactive: { label: 'Inactive', color: 'text-gray-700', bg: 'bg-gray-100' },
};

// ============================================================================
// INSTALLER CARD COMPONENT
// ============================================================================

interface InstallerCardProps {
  installer: Record<string, unknown> & {
    id: string;
    user?: {
      id: string;
      name: string | null;
      email: string;
      avatarUrl?: string;
    } | null;
    status: string;
    yearsExperience: number | null;
    maxJobsPerDay: number;
    vehicleType: string;
  };
  onClick: () => void;
}

function InstallerCard({ installer, onClick }: InstallerCardProps) {
  const status = STATUS_CONFIG[installer.status] || STATUS_CONFIG.inactive;
  const userName = installer.user?.name;
  const userEmail = installer.user?.email;
  const initials = (userName || userEmail || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={installer.user?.avatarUrl} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">
                {installer.user?.name || installer.user?.email}
              </h3>
              <Badge className={`${status.bg} ${status.color} text-xs mt-1`}>
                {status.label}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              // Show actions menu
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span>{installer.yearsExperience || 0} years exp</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{installer.maxJobsPerDay} jobs/day</span>
          </div>
        </div>

        {/* Vehicle */}
        {installer.vehicleType && installer.vehicleType !== 'none' && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{installer.vehicleType}</span>
          </div>
        )}

        {/* Rating Placeholder */}
        <div className="flex items-center gap-1 pt-2 border-t">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-medium">4.8</span>
          <span className="text-sm text-muted-foreground">(24 reviews)</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function InstallersListPage() {
  const navigate = useNavigate();

  // Filter state
  const [filters, setFilters] = useState<Partial<InstallerListQuery>>({
    page: 1,
    pageSize: 20,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Data fetching
  const { data, isLoading } = useInstallers(filters);

  // Handlers
  const handleViewInstaller = useCallback(
    (id: string) => {
      navigate({ to: '/installers/$installerId', params: { installerId: id } });
    },
    [navigate]
  );

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  }, []);

  const handleStatusChange = useCallback((status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: status === 'all' ? undefined : (status as typeof prev.status),
      page: 1,
    }));
  }, []);

  const installers = data?.items || [];
  const pagination = data?.pagination;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Installers"
        description="Manage your installation team"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Installer
          </Button>
        }
      />

      <PageLayout.Content>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search installers..."
              className="pl-10"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <Select
            value={filters.status || 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="away">Away</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Installers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="h-[200px] animate-pulse bg-muted" />
            ))}
          </div>
        ) : installers.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No installers found</h3>
            <p className="text-muted-foreground">
              {filters.search || filters.status
                ? 'Try adjusting your filters'
                : 'Add your first installer to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {installers.map((installer) => (
                <InstallerCard
                  key={installer.id}
                  installer={installer as InstallerCardProps['installer']}
                  onClick={() => handleViewInstaller(installer.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: (prev.page || 1) - 1,
                    }))
                  }
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: (prev.page || 1) + 1,
                    }))
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </PageLayout.Content>
    </PageLayout>
  );
}
