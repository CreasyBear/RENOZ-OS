/**
 * Support Landing Page
 *
 * Domain landing per DOMAIN-LANDING-STANDARDS: Header + Command Bar + Content.
 * No nav grid; workflow links in More dropdown; filter chips navigate to issues list.
 * Metrics belong on /support/dashboard.
 *
 * @see src/routes/_authenticated/support/index.tsx - Route definition
 * @see src/routes/_authenticated/support/dashboard.tsx - Detailed metrics view
 */

import { Link, useNavigate } from '@tanstack/react-router';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupportMetrics } from '@/hooks/support';
import { useAuth } from '@/lib/auth/hooks';
import {
  LayoutDashboard,
  Ticket,
  Shield,
  Package,
  FileCheck,
  BookOpen,
  AlertCircle,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

const moreLinks = [
  { title: 'Issues', href: '/support/issues', icon: Ticket },
  { title: 'RMAs', href: '/support/rmas', icon: Package },
  { title: 'Warranties', href: '/support/warranties', icon: Shield },
  { title: 'Claims', href: '/support/claims', icon: FileCheck },
  { title: 'Knowledge Base', href: '/support/knowledge-base', icon: BookOpen },
  { title: 'Dashboard', href: '/support/dashboard', icon: LayoutDashboard },
] as const;

export default function SupportLandingPage() {
  const navigate = useNavigate();
  const { data: metrics, error, refetch } = useSupportMetrics();
  const { user } = useAuth();

  const triage = metrics?.triage ?? { overdueSla: 0, escalated: 0, myIssues: 0 };

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Support"
        description="Customer support, warranties, and claims management"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/support/issues/new"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Issue
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  More <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {moreLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.href} className="p-0">
                      <Link
                        to={item.href}
                        className="flex w-full items-center px-2 py-1.5"
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.title}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <PageLayout.Content className="space-y-6">
        {/* Zone 2: Command bar with filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/support/issues' })}
            className="min-h-[44px] min-w-[44px]"
          >
            All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/support/issues', search: { slaStatus: 'breached' } })}
            className="min-h-[44px] min-w-[44px]"
          >
            Overdue SLA
            {triage.overdueSla > 0 && (
              <Badge variant="destructive" className="ml-2">
                {triage.overdueSla}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/support/issues', search: { escalated: 'true' } })}
            className="min-h-[44px] min-w-[44px]"
          >
            Escalated
            {triage.escalated > 0 && (
              <Badge variant="secondary" className="ml-2">
                {triage.escalated}
              </Badge>
            )}
          </Button>
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate({ to: '/support/issues', search: { assignedToUserId: user.id } })
              }
              className="min-h-[44px] min-w-[44px]"
            >
              My Issues
              {triage.myIssues > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {triage.myIssues}
                </Badge>
              )}
            </Button>
          )}
        </div>

        {/* Secondary: link to dashboard for metrics */}
        <Link
          to="/support/dashboard"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "inline-flex items-center gap-2"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          View full dashboard
        </Link>

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="text-destructive h-8 w-8" />
              <div>
                <p className="font-medium">Failed to load metrics</p>
                <p className="text-muted-foreground text-sm">
                  {error instanceof Error ? error.message : 'Unknown error'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}
      </PageLayout.Content>
    </PageLayout>
  );
}
