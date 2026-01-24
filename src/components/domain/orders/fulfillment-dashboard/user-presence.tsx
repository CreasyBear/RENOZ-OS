/**
 * User Presence Indicator
 *
 * Shows which users are currently active on the fulfillment board.
 * Tracks real user activity and displays live presence information.
 *
 * @see Jobs kanban user presence patterns
 */

import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';
import { useCurrentUser } from '@/hooks/auth';
import { cn } from '@/lib/utils';

export interface ActiveUser {
  id: string;
  name: string | null;
  avatar?: string;
  lastActive: Date;
  isCurrentUser?: boolean;
}

export interface UserPresenceProps {
  activeUsers?: ActiveUser[];
  maxVisible?: number;
  className?: string;
}

/**
 * User presence indicator component
 */
export function UserPresence({ activeUsers = [], maxVisible = 3, className }: UserPresenceProps) {
  useCurrentUser();
  // SSR-safe: initialize with null, set in useEffect to avoid hydration mismatch
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Set initial time and update every minute for "last active" calculations
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Filter out users who haven't been active in the last 5 minutes
  // Don't filter until currentTime is set (SSR safety)
  const recentUsers = currentTime
    ? activeUsers.filter((user) => {
        const minutesSinceActive =
          (currentTime.getTime() - user.lastActive.getTime()) / (1000 * 60);
        return minutesSinceActive < 5;
      })
    : [];

  const visibleUsers = recentUsers.slice(0, maxVisible);
  const overflowCount = recentUsers.length - maxVisible;

  if (recentUsers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <Avatar className="border-background h-6 w-6 border-2">
                  <AvatarImage src={user.avatar} alt={user.name || 'User'} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                    {user.name
                      ? user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <div className="font-medium">{user.name || 'Unknown User'}</div>
                  {user.isCurrentUser && <div className="text-muted-foreground text-xs">You</div>}
                  <div className="text-muted-foreground text-xs">
                    Active {getTimeAgo(user.lastActive, currentTime)}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {overflowCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted border-background flex h-6 w-6 items-center justify-center rounded-full border-2">
                  <span className="text-muted-foreground text-[10px] font-medium">
                    +{overflowCount}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <div className="font-medium">
                    {overflowCount} more user{overflowCount !== 1 ? 's' : ''}
                  </div>
                  <div className="text-muted-foreground text-xs">Currently active</div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs">
          <Users className="h-3 w-3" />
          {recentUsers.length}
        </Badge>
      </div>
    </TooltipProvider>
  );
}

// Activity tracking for user presence
class UserPresenceTracker {
  private static instance: UserPresenceTracker;
  private activeUsers = new Map<string, ActiveUser>();
  private listeners = new Set<(users: ActiveUser[]) => void>();
  private cleanupTimer?: NodeJS.Timeout;

  static getInstance(): UserPresenceTracker {
    if (!UserPresenceTracker.instance) {
      UserPresenceTracker.instance = new UserPresenceTracker();
    }
    return UserPresenceTracker.instance;
  }

  // Record user activity
  recordActivity(user: { id: string; name: string | null }) {
    const now = new Date();

    const activeUser: ActiveUser = {
      id: user.id,
      name: user.name,
      avatar: undefined, // Would come from user profile service
      lastActive: now,
      isCurrentUser: false, // Will be set by the hook
    };

    this.activeUsers.set(user.id, activeUser);
    this.notifyListeners();
    this.scheduleCleanup();
  }

  // Set current user (special handling)
  setCurrentUser(user: { id: string; name: string | null }) {
    const now = new Date();

    const activeUser: ActiveUser = {
      id: user.id,
      name: user.name,
      avatar: undefined,
      lastActive: now,
      isCurrentUser: true,
    };

    this.activeUsers.set(user.id, activeUser);
    this.notifyListeners();
  }

  // Get all active users (within last 5 minutes)
  getActiveUsers(): ActiveUser[] {
    const now = new Date();
    const fiveMinutesAgo = now.getTime() - 5 * 60 * 1000;

    // Filter out inactive users
    const activeUsers: ActiveUser[] = [];
    for (const [userId, user] of this.activeUsers) {
      if (user.lastActive.getTime() > fiveMinutesAgo) {
        activeUsers.push(user);
      } else {
        this.activeUsers.delete(userId);
      }
    }

    return activeUsers;
  }

  // Subscribe to presence updates
  subscribe(listener: (users: ActiveUser[]) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const activeUsers = this.getActiveUsers();
    this.listeners.forEach((listener) => listener(activeUsers));
  }

  private scheduleCleanup() {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }

    // Clean up inactive users every 5 minutes
    this.cleanupTimer = setTimeout(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  private cleanup() {
    const now = new Date();
    const fiveMinutesAgo = now.getTime() - 5 * 60 * 1000;

    for (const [userId, user] of this.activeUsers) {
      if (user.lastActive.getTime() <= fiveMinutesAgo) {
        this.activeUsers.delete(userId);
      }
    }

    this.notifyListeners();
  }
}

/**
 * Hook for managing user presence in the fulfillment board
 */
export function useFulfillmentPresence() {
  const { currentUser } = useCurrentUser();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const tracker = UserPresenceTracker.getInstance();

  // Set current user and track their activity
  useEffect(() => {
    if (currentUser) {
      tracker.setCurrentUser(currentUser);

      // Record initial activity
      tracker.recordActivity(currentUser);
    }
  }, [currentUser]);

  // Subscribe to presence updates
  useEffect(() => {
    const unsubscribe = tracker.subscribe((users) => {
      setActiveUsers(users);
    });

    // Get initial active users
    setActiveUsers(tracker.getActiveUsers());

    return unsubscribe;
  }, []);

  // Function to record user activity (call this on user interactions)
  const recordActivity = useCallback(() => {
    if (currentUser) {
      tracker.recordActivity(currentUser);
    }
  }, [currentUser]);

  return {
    activeUsers,
    recordActivity,
    totalActiveUsers: activeUsers.length,
  };
}

/**
 * Helper function to format relative time
 */
function getTimeAgo(date: Date, now: Date): string {
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else {
    const diffInHours = Math.floor(diffInMinutes / 60);
    return `${diffInHours}h ago`;
  }
}
