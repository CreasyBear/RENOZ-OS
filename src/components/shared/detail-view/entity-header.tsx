/**
 * Entity Header Component
 *
 * Standard header for detail views with avatar, title, status, and actions.
 * Based on Project Management and Midday reference patterns.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StatusBadge, type StatusConfig } from '@/components/shared/status-badge';
import { type SemanticColor } from '@/lib/status';
import { cn } from '@/lib/utils';

export interface EntityHeaderAction {
  /** Action label */
  label: string;
  /** Action click handler */
  onClick: () => void;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Is this a destructive action? */
  destructive?: boolean;
  /** Is this action disabled? */
  disabled?: boolean;
  /** When disabled, show this reason in a tooltip on hover */
  disabledReason?: string;
}

export interface EntityHeaderProps {
  /** Entity name/title */
  name: string;
  /** Optional subtitle */
  subtitle?: React.ReactNode;
  /** Avatar image URL */
  avatarUrl?: string | null;
  /** Avatar fallback (initials) */
  avatarFallback?: string;
  /** Status badge */
  status?: {
    value: string;
    variant?: SemanticColor;
    config?: StatusConfig;
  };
  /** Type badge */
  typeBadge?: React.ReactNode;
  /** Primary action button */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  };
  /** Secondary actions (dropdown) */
  secondaryActions?: EntityHeaderAction[];
  /** Edit action handler */
  onEdit?: () => void;
  /** Delete action handler */
  onDelete?: () => void;
  /** Trailing content (e.g. workflow buttons) rendered after primary/secondary actions */
  trailingContent?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Renders a standard entity header with avatar, name, status, and actions.
 *
 * @example
 * ```tsx
 * <EntityHeader
 *   name={customer.name}
 *   subtitle={customer.email}
 *   avatarUrl={customer.avatarUrl}
 *   status={{ value: customer.status, variant: 'success' }}
 *   onEdit={() => setEditing(true)}
 *   onDelete={handleDelete}
 *   secondaryActions={[
 *     { label: 'Duplicate', onClick: handleDuplicate },
 *     { label: 'Export', onClick: handleExport },
 *   ]}
 * />
 * ```
 */
export function EntityHeader({
  name,
  subtitle,
  avatarUrl,
  avatarFallback,
  status,
  typeBadge,
  primaryAction,
  secondaryActions = [],
  onEdit,
  onDelete,
  trailingContent,
  className,
}: EntityHeaderProps) {
  const initials = avatarFallback ?? getInitials(name);

  // Build dropdown actions
  const dropdownActions: EntityHeaderAction[] = [
    ...secondaryActions,
  ];

  if (onDelete) {
    dropdownActions.push({
      label: 'Delete',
      onClick: onDelete,
      icon: <Trash2 className="h-4 w-4" />,
      destructive: true,
    });
  }

  const hasDropdown = dropdownActions.length > 0;

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      {/* Left: Avatar + Info */}
      <div className="flex items-center gap-4 min-w-0">
        <Avatar className="h-12 w-12 flex-shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{name}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {status && (
              <StatusBadge
                status={status.value}
                variant={status.variant}
                statusConfig={status.config}
              />
            )}
            {typeBadge}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        {primaryAction && (
          <Button
            size="sm"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
          >
            {primaryAction.icon && (
              <span className="mr-2">{primaryAction.icon}</span>
            )}
            {primaryAction.label}
          </Button>
        )}
        {trailingContent}
        {hasDropdown && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dropdownActions.map((action, index) => {
                // Add separator before destructive actions
                const needsSeparator =
                  action.destructive &&
                  index > 0 &&
                  !dropdownActions[index - 1]?.destructive;

                const showTooltip = action.disabled && action.disabledReason;
                const item = (
                  <DropdownMenuItem
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={cn(action.destructive && 'text-destructive')}
                  >
                    {action.icon && (
                      <span className="mr-2">{action.icon}</span>
                    )}
                    {action.label}
                  </DropdownMenuItem>
                );

                return (
                  <div key={action.label}>
                    {needsSeparator && <DropdownMenuSeparator />}
                    {showTooltip ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block">
                              {item}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="max-w-[200px]">{action.disabledReason}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      item
                    )}
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/**
 * Renders only the action buttons from EntityHeader config.
 * Use when actions should appear in PageLayout.Header (detail page layout pattern).
 */
export interface EntityHeaderActionsProps {
  primaryAction?: EntityHeaderProps['primaryAction'];
  secondaryActions?: EntityHeaderAction[];
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EntityHeaderActions({
  primaryAction,
  secondaryActions = [],
  onEdit,
  onDelete,
}: EntityHeaderActionsProps) {
  const dropdownActions: EntityHeaderAction[] = [
    ...secondaryActions,
    ...(onDelete
      ? [
          {
            label: 'Delete',
            onClick: onDelete,
            icon: <Trash2 className="h-4 w-4" />,
            destructive: true,
          } as EntityHeaderAction,
        ]
      : []),
  ];

  const hasDropdown = dropdownActions.length > 0;

  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      )}
      {primaryAction && (
        <Button
          size="sm"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.icon && (
            <span className="mr-2">{primaryAction.icon}</span>
          )}
          {primaryAction.label}
        </Button>
      )}
      {hasDropdown && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {dropdownActions.map((action, index) => {
              const needsSeparator =
                action.destructive &&
                index > 0 &&
                !dropdownActions[index - 1]?.destructive;

              const showTooltip = action.disabled && action.disabledReason;
              const item = (
                <DropdownMenuItem
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(action.destructive && 'text-destructive')}
                >
                  {action.icon && (
                    <span className="mr-2">{action.icon}</span>
                  )}
                  {action.label}
                </DropdownMenuItem>
              );

              return (
                <div key={`${action.label}-${index}`}>
                  {needsSeparator && <DropdownMenuSeparator />}
                  {showTooltip ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block">{item}</span>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="max-w-[200px]">{action.disabledReason}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    item
                  )}
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export default EntityHeader;
