/**
 * ProjectMetaPanel Component
 *
 * Collapsible right panel with project metadata, customer info,
 * team members, and key dates.
 *
 * SPRINT-03: New component for project-centric jobs model
 * Enhanced with slide-in animation support via parent AnimatePresence
 */


import { format } from 'date-fns';
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Clock,
  ChevronRight,
  Mail,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ProgressCircle } from './progress-circle';
import { TimeCard } from './time-card';
import { BacklogCard } from './backlog-card';
import { QuickLinksCard } from './quick-links-card';

// ============================================================================
// TYPES
// ============================================================================

interface ProjectMetaPanelProps {
  project: {
    id: string;
    projectNumber: string;
    title: string;
    status: 'quoting' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    progressPercent: number;
    projectType: string;
    startDate: string | null;
    targetCompletionDate: string | null;
    actualCompletionDate: string | null;
    estimatedTotalValue: string | number | null;
    actualTotalCost: string | number | null;
    siteAddress: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    } | null;
    customer?: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      companyName?: string;
    } | null;
    members?: Array<{
      user: {
        id: string;
        name: string | null;
        email: string;
        avatarUrl?: string;
      };
      role: 'owner' | 'manager' | 'member';
    }>;
    // Additional data for rich cards
    workstreams?: Array<{
      id: string;
      title: string;
      description?: string | null;
      tasks?: Array<{ status: string }>;
    }>;
  };
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  quoting: { label: 'Quoting', color: 'text-gray-700', bg: 'bg-gray-100' },
  approved: { label: 'Approved', color: 'text-blue-700', bg: 'bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-teal-700', bg: 'bg-teal-100' },
  completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100' },
  on_hold: { label: 'On Hold', color: 'text-orange-700', bg: 'bg-orange-100' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-600' },
  high: { label: 'High', color: 'text-orange-600' },
  medium: { label: 'Medium', color: 'text-yellow-600' },
  low: { label: 'Low', color: 'text-green-600' },
};

// ============================================================================
// MAIN PANEL
// ============================================================================

export function ProjectMetaPanel({
  project,
  onToggle,
  className,
}: ProjectMetaPanelProps) {
  const status = STATUS_CONFIG[project.status];
  const priority = PRIORITY_CONFIG[project.priority];

  const formatCurrency = (value: string | number | null) => {
    if (!value) return null;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const estimatedValue = formatCurrency(project.estimatedTotalValue);
  const actualCost = formatCurrency(project.actualTotalCost);

  // Calculate task stats from workstreams
  const taskStats = project.workstreams
    ? {
        total: project.workstreams.reduce((acc, w) => acc + (w.tasks?.length || 0), 0),
        completed: project.workstreams.reduce(
          (acc, w) => acc + (w.tasks?.filter(t => t.status === 'completed').length || 0),
          0
        ),
        inProgress: project.workstreams.reduce(
          (acc, w) => acc + (w.tasks?.filter(t => t.status === 'in_progress').length || 0),
          0
        ),
        pending: project.workstreams.reduce(
          (acc, w) => acc + (w.tasks?.filter(t => t.status === 'pending' || t.status === 'todo').length || 0),
          0
        ),
      }
    : null;

  // Generate quick links from project data
  const quickLinks = [
    ...(project.customer?.email
      ? [{ label: 'Email Customer', href: `mailto:${project.customer.email}`, icon: 'mail' as const }]
      : []),
    ...(project.siteAddress
      ? [{
          label: 'View on Maps',
          href: `https://maps.google.com/?q=${encodeURIComponent(
            `${project.siteAddress.street}, ${project.siteAddress.city}, ${project.siteAddress.state} ${project.siteAddress.postalCode}`
          )}`,
          icon: 'map' as const,
        }]
      : []),
  ];

  return (
    <div
      className={cn(
        'w-80 bg-background flex flex-col h-full overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Project Info</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggle}
          title="Collapse panel"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Progress Section */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <ProgressCircle
              progress={project.progressPercent}
              size={48}
              strokeWidth={4}
              color={status.bg.replace('bg-', '') === 'bg-gray-100' ? '#6b7280' : '#10b981'}
              showLabel
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={cn(status.bg, status.color, 'border-0')}>
                  {status.label}
                </Badge>
              </div>
              <p className={cn('text-xs', priority.color)}>
                {priority.label} Priority
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{project.progressPercent}%</span>
            </div>
            <Progress value={project.progressPercent} className="h-2" />
          </div>
        </div>

        <Separator />

        {/* Time Card */}
        <div className="p-4">
          <TimeCard
            startDate={project.startDate}
            targetCompletionDate={project.targetCompletionDate}
            actualCompletionDate={project.actualCompletionDate}
            progressPercent={project.progressPercent}
          />
        </div>

        {/* Backlog Card - only show if we have workstreams data */}
        {taskStats && taskStats.total > 0 && (
          <>
            <Separator />
            <div className="p-4">
              <BacklogCard
                workstreamCount={project.workstreams?.length || 0}
                taskStats={taskStats}
              />
            </div>
          </>
        )}

        {/* Quick Links */}
        {quickLinks.length > 0 && (
          <>
            <Separator />
            <div className="p-4">
              <QuickLinksCard links={quickLinks} />
            </div>
          </>
        )}

        {/* Customer Section */}
        {project.customer && (
          <>
            <Separator />
            <div className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building2 className="h-3 w-3" />
                Customer
              </h4>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {project.customer.name?.charAt(0).toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {project.customer.name}
                    </p>
                    {project.customer.companyName && (
                      <p className="text-xs text-muted-foreground">
                        {project.customer.companyName}
                      </p>
                    )}
                  </div>
                </div>

                {project.customer.email && (
                  <a
                    href={`mailto:${project.customer.email}`}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{project.customer.email}</span>
                  </a>
                )}

                {project.customer.phone && (
                  <a
                    href={`tel:${project.customer.phone}`}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="h-3 w-3" />
                    <span>{project.customer.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </>
        )}

        {/* Site Address */}
        {project.siteAddress && (
          <>
            <Separator />
            <div className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                Site Address
              </h4>
              <div className="text-sm space-y-0.5">
                <p>{project.siteAddress.street}</p>
                <p>
                  {project.siteAddress.city}, {project.siteAddress.state}{' '}
                  {project.siteAddress.postalCode}
                </p>
                <p className="text-muted-foreground">{project.siteAddress.country}</p>
              </div>
            </div>
          </>
        )}

        {/* Key Dates */}
        <Separator />
        <div className="p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            Key Dates
          </h4>
          <div className="space-y-2">
            {project.startDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Start Date</span>
                <span>{format(new Date(project.startDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            {project.targetCompletionDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Target Completion</span>
                <span>{format(new Date(project.targetCompletionDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            {project.actualCompletionDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span>{format(new Date(project.actualCompletionDate), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Budget */}
        {(estimatedValue || actualCost) && (
          <>
            <Separator />
            <div className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <DollarSign className="h-3 w-3" />
                Budget
              </h4>
              <div className="space-y-2">
                {estimatedValue && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Value</span>
                    <span className="font-medium">{estimatedValue}</span>
                  </div>
                )}
                {actualCost && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Actual Cost</span>
                    <span className="font-medium">{actualCost}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Team Members */}
        {project.members && project.members.length > 0 && (
          <>
            <Separator />
            <div className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="h-3 w-3" />
                Team
                <Badge variant="secondary" className="ml-auto">
                  {project.members.length}
                </Badge>
              </h4>
              <div className="space-y-2">
                {project.members.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user.avatarUrl} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {member.user.name?.charAt(0).toUpperCase() ||
                          member.user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Project Type */}
        <Separator />
        <div className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Project Type:</span>
            <Badge variant="outline" className="capitalize">
              {project.projectType.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ProjectMetaPanelProps };
