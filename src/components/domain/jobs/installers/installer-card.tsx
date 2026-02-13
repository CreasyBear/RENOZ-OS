/**
 * Installer Card Component
 *
 * Card-based display for installer list items with:
 * - Avatar with initials fallback
 * - Status badge
 * - Experience and capacity stats
 * - Vehicle type
 * - Selection checkbox and actions menu
 */

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/shared/status-badge';
import { INSTALLER_STATUS_CONFIG } from './installer-status-config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Briefcase, Calendar, MapPin, MoreHorizontal } from 'lucide-react';

export interface InstallerCardProps {
  installer: {
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
    vehicleType: string | null;
  };
  onClick: () => void;
  selected: boolean;
  onToggleSelect: (nextSelected: boolean) => void;
}

export function InstallerCard({ installer, onClick, selected, onToggleSelect }: InstallerCardProps) {
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
              <StatusBadge
                status={installer.status}
                statusConfig={INSTALLER_STATUS_CONFIG}
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected}
              onCheckedChange={(value) => onToggleSelect(Boolean(value))}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${installer.user?.name || installer.user?.email || 'installer'}`}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Open installer actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onClick()}>
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span>{installer.yearsExperience ?? 0} years exp</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{installer.maxJobsPerDay} jobs/day</span>
          </div>
        </div>

        {installer.vehicleType && installer.vehicleType !== 'none' && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{installer.vehicleType}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
