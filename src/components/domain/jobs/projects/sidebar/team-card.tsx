/**
 * Team Card - Project Sidebar
 *
 * Displays project team members with avatar stack.
 * Pure presenter component - receives all data via props.
 *
 * @see docs/design-system/PROJECTS-DOMAIN-PHILOSOPHY.md Part 4.1 Zone 5B
 */

import { Link } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamMember {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

export interface TeamCardProps {
  members: TeamMember[];
  /** Maximum avatars to show before "+X more" */
  maxVisible?: number;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TeamCard({ members, maxVisible = 4, className }: TeamCardProps) {
  const visibleMembers = members.slice(0, maxVisible);
  const remainingCount = members.length - maxVisible;

  if (members.length === 0) {
    return (
      <Card className={cn('shadow-none', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">No team members assigned</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Team
          <span className="text-muted-foreground font-normal">({members.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Avatar Stack */}
        <TooltipProvider>
          <div className="flex -space-x-2">
            {visibleMembers.map((member) => (
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  {/* Wrap in span to avoid TooltipTrigger asChild + Radix Avatar SSR issues */}
                  <span className="inline-flex">
                    <Avatar className="h-8 w-8 border-2 border-background cursor-default">
                      {member.avatarUrl && (
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                      )}
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{member.name}</p>
                  {member.role && (
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
            {remainingCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Wrap in span to avoid TooltipTrigger asChild + Radix Avatar SSR issues */}
                  <span className="inline-flex">
                    <Avatar className="h-8 w-8 border-2 border-background cursor-default">
                      <AvatarFallback className="text-xs bg-muted">
                        +{remainingCount}
                      </AvatarFallback>
                    </Avatar>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{remainingCount} more team member{remainingCount === 1 ? '' : 's'}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>

        {/* Member List - links to user profiles (WORKFLOW-CONTINUITY P3) */}
        <ul className="space-y-1.5">
          {members.slice(0, 5).map((member) => (
            <li key={member.id} className="flex items-center gap-2 text-sm">
              <Link
                to="/admin/users/$userId"
                params={{ userId: member.id }}
                className="truncate flex-1 hover:underline"
              >
                {member.name}
              </Link>
              {member.role && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {member.role}
                </span>
              )}
            </li>
          ))}
          {members.length > 5 && (
            <li className="text-xs text-muted-foreground">
              +{members.length - 5} more
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
