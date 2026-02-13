/**
 * Users Column Definitions
 *
 * TanStack Table column definitions using shared cell components.
 */

import { Link } from '@tanstack/react-router';
import { Eye, UserCheck, UserX } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CheckboxCell,
  StatusCell,
  ActionsCell,
  DataTableColumnHeader,
  NameCell,
} from '@/components/shared/data-table';
import type { ActionItem } from '@/components/shared/data-table/cells/actions-cell';
import type { UserTableItem } from '@/lib/schemas/users';
import {
  USER_STATUS_CONFIG,
  ROLE_STATUS_CONFIG,
  type UserRole,
  type UserStatus,
} from './users-status-config';

export interface CreateUserColumnsOptions {
  onSelect: (id: string, checked: boolean) => void;
  onShiftClickRange: (rowIndex: number) => void;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelectAll: (checked: boolean) => void;
  isSelected: (id: string) => boolean;
  onViewUser: (userId: string) => void;
  onDeactivate: (userId: string) => void;
  onReactivate: (userId: string) => void;
  isLoading: boolean;
}

/**
 * Create column definitions for the users table.
 */
export function createUserColumns(
  options: CreateUserColumnsOptions
): ColumnDef<UserTableItem>[] {
  const {
    onSelect,
    onShiftClickRange,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    isSelected,
    onViewUser,
    onDeactivate,
    onReactivate,
    isLoading,
  } = options;

  return [
    // Checkbox column
    {
      id: 'select',
      header: () => (
        <CheckboxCell
          checked={isAllSelected}
          indeterminate={isPartiallySelected}
          onChange={onSelectAll}
          ariaLabel="Select all users"
        />
      ),
      cell: ({ row }) => (
        <CheckboxCell
          checked={isSelected(row.original.id)}
          onChange={(checked) => onSelect(row.original.id, checked)}
          onShiftClick={() => onShiftClickRange(row.index)}
          ariaLabel={`Select user ${row.original.name ?? row.original.email}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // Name column (Link to user detail – WORKFLOW-CONTINUITY)
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => (
        <Link
          to="/admin/users/$userId"
          params={{ userId: row.original.id }}
          search={{}}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <NameCell
            name={row.original.name ?? row.original.email}
            maxWidth={200}
          />
        </Link>
      ),
      enableSorting: true,
      size: 220,
    },

    // Email column
    {
      id: 'email',
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
          {row.original.email}
        </span>
      ),
      enableSorting: false,
      size: 200,
    },

    // Role column
    {
      id: 'role',
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => (
        <StatusCell
          status={row.original.role as UserRole}
          statusConfig={ROLE_STATUS_CONFIG}
          showIcon
        />
      ),
      enableSorting: true,
      size: 120,
    },

    // Status column
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <StatusCell
          status={row.original.status as UserStatus}
          statusConfig={USER_STATUS_CONFIG}
          showIcon
        />
      ),
      enableSorting: true,
      size: 120,
    },

    // Actions column
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const user = row.original;
        const actions: ActionItem[] = [
          { label: 'View', icon: Eye, onClick: () => onViewUser(user.id) },
          ...(user.status === 'deactivated'
            ? [{ label: 'Reactivate', icon: UserCheck, onClick: () => onReactivate(user.id), disabled: isLoading }]
            : user.role !== 'owner'
              ? [{ label: 'Deactivate', icon: UserX, onClick: () => onDeactivate(user.id), variant: 'destructive' as const, disabled: isLoading }]
              : []),
        ];

        return <ActionsCell actions={actions} />;
      },
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },
  ];
}
