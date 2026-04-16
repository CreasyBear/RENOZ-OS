'use client';

import { Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  ServiceSystemListItem,
  ServiceSystemOwnershipStatus,
} from '@/lib/schemas/service';
import { isServiceSystemOwnershipStatus } from '@/lib/schemas/service';
import { SERVICE_SYSTEM_OWNERSHIP_STATUS_OPTIONS } from '../service-options';

export interface ServiceSystemsListViewProps {
  systems: ServiceSystemListItem[];
  search: string;
  ownershipStatus?: ServiceSystemOwnershipStatus;
  onSearchChange: (value: string) => void;
  onOwnershipStatusChange: (value: ServiceSystemOwnershipStatus | undefined) => void;
}

export function ServiceSystemsListView({
  systems,
  search,
  ownershipStatus,
  onSearchChange,
  onOwnershipStatusChange,
}: ServiceSystemsListViewProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Service Systems</CardTitle>
          <CardDescription>
            Find canonical installed systems and inspect current owner, lineage, and linked
            warranties.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search system, owner, customer, or order"
              className="pl-9"
            />
          </div>
          <Select
            value={ownershipStatus ?? 'all'}
            onValueChange={(value) =>
              onOwnershipStatusChange(
                value === 'all'
                  ? undefined
                  : isServiceSystemOwnershipStatus(value)
                    ? value
                    : undefined
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Ownership" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All systems</SelectItem>
              {SERVICE_SYSTEM_OWNERSHIP_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="text-muted-foreground text-sm">
        {systems.length} system{systems.length === 1 ? '' : 's'}
      </div>

      <div className="space-y-3">
        {systems.map((system) => (
          <Card key={system.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="text-base font-semibold">{system.displayName}</div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                    <span>
                      Current owner {system.currentOwner?.fullName ?? 'Not assigned yet'}
                    </span>
                    <span>
                      Purchased via {system.commercialCustomer?.name ?? 'Unknown commercial account'}
                    </span>
                  </div>
                </div>
                <Link
                  to="/support/service-systems/$serviceSystemId"
                  params={{ serviceSystemId: system.id }}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  Open System
                </Link>
              </div>

              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground mb-1 text-xs uppercase">Site</div>
                  <div className="font-medium">
                    {system.siteAddressLabel ?? 'No site address captured'}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground mb-1 text-xs uppercase">Source Order</div>
                  <div className="font-medium">
                    {system.sourceOrder?.orderNumber ?? 'No source order'}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground mb-1 text-xs uppercase">
                    Linked Warranties
                  </div>
                  <div className="font-medium">{system.linkedWarrantyCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {systems.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground p-8 text-center text-sm">
              No service systems match the current filters.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
