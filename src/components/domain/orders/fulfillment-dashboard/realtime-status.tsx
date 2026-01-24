/**
 * Realtime Status Indicator
 *
 * Shows the connection status of real-time updates for the fulfillment board.
 * Displays live update status with reconnection capabilities.
 *
 * @see useOrdersRealtime hook for status information
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConnectionStatus } from '@/hooks/realtime/use-realtime';

export interface RealtimeStatusProps {
  status: ConnectionStatus;
  reconnectAttempts?: number;
  onReconnect?: () => void;
  className?: string;
}

const statusConfig = {
  connecting: {
    icon: RefreshCw,
    label: 'Connecting',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    description: 'Establishing connection to live updates',
  },
  connected: {
    icon: Wifi,
    label: 'Live',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Receiving real-time updates',
  },
  disconnected: {
    icon: WifiOff,
    label: 'Offline',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    description: 'Connection lost, updates paused',
  },
  error: {
    icon: AlertTriangle,
    label: 'Error',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Connection failed, unable to receive updates',
  },
} as const;

export function RealtimeStatus({
  status,
  reconnectAttempts = 0,
  onReconnect,
  className,
}: RealtimeStatusProps) {
  const config = statusConfig[status];
  const IconComponent = config.icon;

  const showReconnect = (status === 'disconnected' || status === 'error') && onReconnect;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            <Badge
              variant="secondary"
              className={cn('gap-1.5 px-2 py-1 text-xs font-medium', config.bgColor, config.color)}
            >
              <IconComponent className={cn('h-3 w-3', status === 'connecting' && 'animate-spin')} />
              {config.label}
              {reconnectAttempts > 0 && (
                <span className="text-xs opacity-75">({reconnectAttempts})</span>
              )}
            </Badge>

            {showReconnect && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReconnect}
                className="h-6 gap-1 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs text-sm">
            <div className="font-medium">{config.description}</div>
            {reconnectAttempts > 0 && (
              <div className="text-muted-foreground mt-1 text-xs">
                Reconnect attempts: {reconnectAttempts}
              </div>
            )}
            {status === 'connected' && (
              <div className="text-muted-foreground mt-1 text-xs">
                Order changes appear instantly across all users
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Combined status indicator showing both user presence and realtime status
 */
export interface CollaborationStatusProps {
  realtimeStatus: ConnectionStatus;
  activeUserCount?: number;
  reconnectAttempts?: number;
  onReconnect?: () => void;
  className?: string;
}

/**
 * Combined status indicator for real-time collaboration features
 */
export function CollaborationStatus({
  realtimeStatus,
  activeUserCount = 1,
  reconnectAttempts,
  onReconnect,
  className,
}: CollaborationStatusProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <RealtimeStatus
        status={realtimeStatus}
        reconnectAttempts={reconnectAttempts}
        onReconnect={onReconnect}
      />

      {activeUserCount > 1 && (
        <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs">
          <Wifi className="h-3 w-3" />
          {activeUserCount} active
        </Badge>
      )}
    </div>
  );
}
