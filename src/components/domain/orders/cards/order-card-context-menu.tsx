/**
 * OrderCardContextMenu Component
 *
 * Context menu for order actions on kanban cards.
 * Provides quick access to common order operations.
 *
 * @see src/components/domain/jobs/jobs-card-context-menu.tsx for reference
 */

import { MoreHorizontal, Eye, Copy, Trash2, Package, Flag, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { FulfillmentOrder } from '../fulfillment/fulfillment-dashboard/fulfillment-card';

export interface OrderCardContextMenuProps {
  order: FulfillmentOrder;
  onView: (orderId: string) => void;
  onEdit: (orderId: string) => void;
  onDuplicate?: (orderId: string) => void;
  onDelete?: (orderId: string) => void;
  onChangePriority?: (orderId: string, priority: string) => void;
  onAssign?: (orderId: string, assigneeId: string) => void;
  onMoveToStage?: (orderId: string, stage: string) => void;
  availableAssignees?: Array<{ id: string; name: string }>;
  availableStages?: Array<{ id: string; name: string }>;
}

export function OrderCardContextMenu({
  order,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onChangePriority,
  onAssign,
  onMoveToStage,
  availableAssignees = [],
  availableStages = [
    { id: 'to_allocate', name: 'To Allocate' },
    { id: 'to_pick', name: 'To Pick' },
    { id: 'picking', name: 'Picking' },
    { id: 'to_ship', name: 'To Ship' },
    { id: 'shipped_today', name: 'Shipped Today' },
  ],
}: OrderCardContextMenuProps) {
  const priorityOptions = [
    { id: 'normal', name: 'Normal Priority', icon: Flag, color: 'text-slate-600' },
    { id: 'high', name: 'High Priority', icon: Flag, color: 'text-amber-600' },
    { id: 'urgent', name: 'Urgent Priority', icon: Flag, color: 'text-red-600' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 min-h-[44px] w-6 min-w-[44px] md:h-6 md:min-h-0 md:w-6 md:min-w-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onView(order.id)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onEdit(order.id)}>
          <MoreHorizontal className="mr-2 h-4 w-4" />
          Quick Edit
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Priority Submenu */}
        {onChangePriority && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Flag className="mr-2 h-4 w-4" />
              Change Priority
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {priorityOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <DropdownMenuItem
                    key={option.id}
                    onClick={() => onChangePriority(order.id, option.id)}
                    className={order.priority === option.id ? 'bg-muted' : ''}
                  >
                    <IconComponent className={`mr-2 h-4 w-4 ${option.color}`} />
                    {option.name}
                    {order.priority === option.id && ' ✓'}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Move to Stage Submenu */}
        {onMoveToStage && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Package className="mr-2 h-4 w-4" />
              Move to Stage
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {availableStages
                .filter((stage) => stage.id !== order.status)
                .map((stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => onMoveToStage(order.id, stage.id)}
                  >
                    {stage.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Assignee Submenu */}
        {onAssign && availableAssignees.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <User className="mr-2 h-4 w-4" />
              Assign To
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => onAssign(order.id, '')}
                className={!order.assignedTo ? 'bg-muted' : ''}
              >
                Unassigned
                {!order.assignedTo && ' ✓'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {availableAssignees.map((assignee) => (
                <DropdownMenuItem
                  key={assignee.id}
                  onClick={() => onAssign(order.id, assignee.id)}
                  className={order.assignedTo?.id === assignee.id ? 'bg-muted' : ''}
                >
                  {assignee.name}
                  {order.assignedTo?.id === assignee.id && ' ✓'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator />

        {/* Duplicate */}
        {onDuplicate && (
          <DropdownMenuItem onClick={() => onDuplicate(order.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Order
          </DropdownMenuItem>
        )}

        {/* Delete */}
        {onDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(order.id)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Order
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
