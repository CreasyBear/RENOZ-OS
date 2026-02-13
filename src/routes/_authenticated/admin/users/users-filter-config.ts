/**
 * Users Filter Configuration
 *
 * Config-driven filter definition for users admin domain.
 * Used with DomainFilterBar component.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { Users, UserCheck, Mail, UserX } from 'lucide-react';
import type { FilterBarConfig, FilterOption } from '@/components/shared/filters';
import type { UserRole, UserStatus } from './users-status-config';

// Re-export for consumers that need filter types
export type { UserRole, UserStatus } from './users-status-config';

// ============================================================================
// FILTER STATE TYPES
// ============================================================================

export interface UsersFiltersState extends Record<string, unknown> {
  search: string;
  role: UserRole | null;
  status: UserStatus | null;
}

export const DEFAULT_USERS_FILTERS: UsersFiltersState = {
  search: '',
  role: null,
  status: null,
};

// ============================================================================
// OPTIONS
// ============================================================================

export const USER_ROLE_OPTIONS: FilterOption<UserRole>[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'support', label: 'Support' },
  { value: 'viewer', label: 'Viewer' },
];

export const USER_STATUS_OPTIONS: FilterOption<UserStatus>[] = [
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deactivated', label: 'Deactivated' },
];

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export const USERS_FILTER_CONFIG: FilterBarConfig<UsersFiltersState> = {
  search: {
    placeholder: 'Search by name or email...',
    fields: ['name', 'email'],
  },
  filters: [
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      options: USER_ROLE_OPTIONS,
      primary: true,
      allLabel: 'All Roles',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: USER_STATUS_OPTIONS,
      primary: true,
      allLabel: 'All Status',
    },
  ],
  presets: [
    {
      id: 'active',
      label: 'Active Users',
      icon: UserCheck,
      filters: { status: 'active' },
    },
    {
      id: 'invited',
      label: 'Pending Invites',
      icon: Mail,
      filters: { status: 'invited' },
    },
    {
      id: 'deactivated',
      label: 'Deactivated',
      icon: UserX,
      filters: { status: 'deactivated' },
    },
    {
      id: 'admins',
      label: 'Admins',
      icon: Users,
      filters: { role: 'admin' },
    },
  ],
  labels: {
    role: 'Role',
    status: 'Status',
  },
};
