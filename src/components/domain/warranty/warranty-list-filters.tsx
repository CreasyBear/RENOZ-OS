'use client';

/**
 * Warranty List Filters
 *
 * Pure UI component for search and filter controls.
 */

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WarrantyListStatus, WarrantyPolicyType } from './warranty-list-container';

const STATUS_OPTIONS: Array<{ value: WarrantyListStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'voided', label: 'Voided' },
  { value: 'transferred', label: 'Transferred' },
];

const POLICY_TYPE_OPTIONS: Array<{ value: WarrantyPolicyType; label: string }> = [
  { value: 'battery_performance', label: 'Battery Performance' },
  { value: 'inverter_manufacturer', label: 'Inverter Manufacturer' },
  { value: 'installation_workmanship', label: 'Installation Workmanship' },
];

export interface WarrantyListFiltersProps {
  search: string;
  status?: WarrantyListStatus;
  policyType?: WarrantyPolicyType;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: WarrantyListStatus | undefined) => void;
  onPolicyTypeChange: (value: WarrantyPolicyType | undefined) => void;
}

export function WarrantyListFilters({
  search,
  status,
  policyType,
  onSearchChange,
  onStatusChange,
  onPolicyTypeChange,
}: WarrantyListFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-xs">
        <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
        <Input
          value={search}
          placeholder="Search warranty number, customer, product..."
          className="pl-9"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <Select
        value={status ?? 'all'}
        onValueChange={(value) =>
          onStatusChange(value === 'all' ? undefined : (value as WarrantyListStatus))
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={policyType ?? 'all'}
        onValueChange={(value) =>
          onPolicyTypeChange(value === 'all' ? undefined : (value as WarrantyPolicyType))
        }
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Policy type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All policy types</SelectItem>
          {POLICY_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
