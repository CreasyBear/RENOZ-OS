/**
 * Users Status Configuration
 *
 * Semantic color mapping for user status and role badges.
 * Used with StatusCell (DataTable) and EntityHeader.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 * @see order-status-config.ts for reference pattern
 */

import {
  Shield,
  ShieldCheck,
  Users,
  Briefcase,
  Wrench,
  Headphones,
  Eye,
  Mail,
  UserX,
  UserCheck,
} from 'lucide-react';
import type { SemanticStatusConfigItem } from '@/components/shared/data-table';
import type { StatusConfigItem } from '@/components/shared/status-badge';

// ============================================================================
// USER STATUS (active, invited, suspended, deactivated)
// ============================================================================

export type UserStatus = 'active' | 'invited' | 'suspended' | 'deactivated';

/** User status configuration for StatusCell (DataTable) */
export const USER_STATUS_CONFIG: Record<UserStatus, SemanticStatusConfigItem> = {
  active: {
    label: 'Active',
    color: 'success',
    icon: UserCheck,
  },
  invited: {
    label: 'Invited',
    color: 'info',
    icon: Mail,
  },
  suspended: {
    label: 'Suspended',
    color: 'error',
    icon: UserX,
  },
  deactivated: {
    label: 'Deactivated',
    color: 'inactive',
    icon: UserX,
  },
};

// ============================================================================
// USER ROLE (owner, admin, manager, sales, operations, support, viewer)
// ============================================================================

export type UserRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'sales'
  | 'operations'
  | 'support'
  | 'viewer';

/** User role configuration for StatusCell (DataTable) */
export const ROLE_STATUS_CONFIG: Record<UserRole, SemanticStatusConfigItem> = {
  owner: {
    label: 'Owner',
    color: 'progress',
    icon: ShieldCheck,
  },
  admin: {
    label: 'Admin',
    color: 'error',
    icon: Shield,
  },
  manager: {
    label: 'Manager',
    color: 'info',
    icon: Users,
  },
  sales: {
    label: 'Sales',
    color: 'success',
    icon: Briefcase,
  },
  operations: {
    label: 'Operations',
    color: 'warning',
    icon: Wrench,
  },
  support: {
    label: 'Support',
    color: 'pending',
    icon: Headphones,
  },
  viewer: {
    label: 'Viewer',
    color: 'neutral',
    icon: Eye,
  },
};

// ============================================================================
// ENTITY HEADER (StatusConfig for EntityHeader status prop)
// ============================================================================

/** Status config for EntityHeader - uses variant + label. Export as constant to avoid recreating each render. */
export const USER_STATUS_ENTITY_CONFIG: Record<UserStatus, StatusConfigItem> = {
  active: { variant: 'success', label: 'Active' },
  invited: { variant: 'info', label: 'Invited' },
  suspended: { variant: 'error', label: 'Suspended' },
  deactivated: { variant: 'inactive', label: 'Deactivated' },
};
