/**
 * Schedule Hub
 *
 * Domain landing for schedule at /schedule per DOMAIN-LANDING-STANDARDS v1.1.
 * Header + primary CTA + More dropdown (no nav grid).
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 * @see docs/pre_deployment_audit/2026-02-04-schedule.md
 */

import { Link } from '@tanstack/react-router';
import { Calendar, List, ChevronDown } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ScheduleHub() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            View and manage site visits across projects. Use the calendar for week-by-week scheduling or the timeline for a chronological list.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/schedule/calendar"
            preload="intent"
            className={cn(buttonVariants())}
          >
            <Calendar className="h-4 w-4 mr-2" aria-hidden />
            View Calendar
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                More <ChevronDown className="h-4 w-4 ml-2" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link
                  to="/schedule/timeline"
                  preload="intent"
                  className="flex w-full items-center"
                >
                  <List className="h-4 w-4 mr-2" aria-hidden />
                  Timeline (agenda list)
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
