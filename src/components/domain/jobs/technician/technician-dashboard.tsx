/**
 * Technician Dashboard - Enhanced Task Execution View
 *
 * Provides technicians with a focused, action-oriented view of their work:
 * - Daily stats (visits, hours, completion rate)
 * - Current job banner (when checked in)
 * - Today's visits with quick actions
 * - Upcoming visits
 * - Completed visits
 * - Task checklist preview
 *
 * SPRINT-03: Enhanced technician experience for field work
 * @see ui-ux-pro-max skill for design standards
 */

import { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, isPast, parseISO, intervalToDuration } from 'date-fns';
import {
  Briefcase,
  Clock,
  MapPin,
  CheckCircle2,
  Play,
  Calendar,
  ArrowRight,
  Timer,
  AlertCircle,
  TrendingUp,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

// Types
import type { SiteVisit } from 'drizzle/schema';

// ============================================================================
// TYPES
// ============================================================================

interface TechnicianVisit extends SiteVisit {
  projectTitle: string;
  projectNumber: string;
  siteAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  taskCount?: number;
  completedTasks?: number;
}

interface TechnicianDashboardProps {
  visits: TechnicianVisit[];
  isLoading: boolean;
  onVisitClick: (projectId: string, visitId: string) => void;
  onCheckIn: (visitId: string) => void;
  onCheckOut: (visitId: string) => void;
  checkingIn?: boolean;
  checkingOut?: boolean;
  installerName?: string;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<SiteVisit['status'], { 
  label: string; 
  color: string; 
  bg: string;
  icon: React.ElementType;
}> = {
  scheduled: { 
    label: 'Scheduled', 
    color: 'text-slate-600', 
    bg: 'bg-slate-100',
    icon: Clock,
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'text-blue-600', 
    bg: 'bg-blue-100',
    icon: Play,
  },
  completed: { 
    label: 'Completed', 
    color: 'text-green-600', 
    bg: 'bg-green-100',
    icon: CheckCircle2,
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'text-red-600', 
    bg: 'bg-red-100',
    icon: AlertCircle,
  },
  no_show: { 
    label: 'No Show', 
    color: 'text-orange-600', 
    bg: 'bg-orange-100',
    icon: AlertCircle,
  },
  rescheduled: { 
    label: 'Rescheduled', 
    color: 'text-purple-600', 
    bg: 'bg-purple-100',
    icon: Calendar,
  },
};

const VISIT_TYPE_CONFIG: Record<SiteVisit['visitType'], { 
  label: string; 
  color: string;
  bg: string;
}> = {
  assessment: { label: 'Assessment', color: 'text-blue-600', bg: 'bg-blue-50' },
  installation: { label: 'Installation', color: 'text-teal-600', bg: 'bg-teal-50' },
  commissioning: { label: 'Commissioning', color: 'text-purple-600', bg: 'bg-purple-50' },
  service: { label: 'Service', color: 'text-orange-600', bg: 'bg-orange-50' },
  warranty: { label: 'Warranty', color: 'text-red-600', bg: 'bg-red-50' },
  inspection: { label: 'Inspection', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  maintenance: { label: 'Maintenance', color: 'text-green-600', bg: 'bg-green-50' },
};

// ============================================================================
// DAILY STATS
// ============================================================================

function DailyStats({ visits }: { visits: TechnicianVisit[] }) {
  const stats = useMemo(() => {
    const todaysVisits = visits.filter(v => isToday(parseISO(v.scheduledDate)));
    const completedToday = todaysVisits.filter(v => v.status === 'completed').length;
    const inProgress = visits.filter(v => v.status === 'in_progress').length;
    
    // Calculate estimated hours
    const totalMinutes = todaysVisits.reduce((sum, v) => sum + (v.estimatedDuration || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    // Completion rate for the week
    const weekCompleted = visits.filter(v => v.status === 'completed').length;
    const completionRate = visits.length > 0 ? Math.round((weekCompleted / visits.length) * 100) : 0;

    return {
      todayCount: todaysVisits.length,
      completedToday,
      inProgress,
      hours,
      minutes,
      completionRate,
    };
  }, [visits]);

  const statCards = [
    {
      title: "Today's Visits",
      value: stats.todayCount,
      subtext: `${stats.completedToday} completed`,
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: Play,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
      alert: stats.inProgress > 0,
    },
    {
      title: 'Est. Hours Today',
      value: `${stats.hours}h ${stats.minutes}m`,
      icon: Timer,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      title: 'Week Completion',
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card) => (
        <Card key={card.title} className={cn(card.alert && 'ring-2 ring-teal-200')}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-semibold mt-1">{card.value}</p>
                {card.subtext && (
                  <p className="text-xs text-muted-foreground mt-1">{card.subtext}</p>
                )}
              </div>
              <div className={cn('p-2 rounded-lg', card.bg)}>
                <card.icon className={cn('h-5 w-5', card.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// CURRENT JOB BANNER
// ============================================================================

function CurrentJobBanner({ 
  visit, 
  onCheckOut 
}: { 
  visit: TechnicianVisit; 
  onCheckOut: () => void;
}) {
  const visitType = VISIT_TYPE_CONFIG[visit.visitType];
  const elapsed = useMemo(() => {
    if (!visit.actualStartTime) return null;
    const duration = intervalToDuration({
      start: new Date(visit.actualStartTime),
      end: new Date(),
    });
    return `${duration.hours || 0}h ${duration.minutes || 0}m`;
  }, [visit.actualStartTime]);

  const taskProgress = visit.taskCount && visit.taskCount > 0
    ? Math.round(((visit.completedTasks || 0) / visit.taskCount) * 100)
    : 0;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-xl p-6 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-white/20 text-white border-0">
              Currently Working
            </Badge>
            <span className="text-blue-100 text-sm">{elapsed} elapsed</span>
          </div>
          <h2 className="text-xl font-semibold mb-1">{visit.projectTitle}</h2>
          <p className="text-blue-100 text-sm mb-3">{visit.visitNumber}</p>
          
          <div className="flex items-center gap-4 text-sm">
            <span className={cn('px-2 py-1 rounded text-xs font-medium', visitType.bg, visitType.color)}>
              {visitType.label}
            </span>
            {visit.siteAddress && (
              <span className="flex items-center gap-1 text-blue-100">
                <MapPin className="h-4 w-4" />
                {visit.siteAddress.city}
              </span>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <Button 
            onClick={onCheckOut}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Complete Job
          </Button>
        </div>
      </div>
      
      {visit.taskCount && visit.taskCount > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-blue-100">Task Progress</span>
            <span className="font-medium">{visit.completedTasks || 0}/{visit.taskCount} tasks</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VISIT CARD
// ============================================================================

function VisitCard({
  visit,
  onClick,
  onCheckIn,
  onCheckOut,
  checkingIn,
  checkingOut,
}: {
  visit: TechnicianVisit;
  onClick: () => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  checkingIn?: boolean;
  checkingOut?: boolean;
}) {
  const status = STATUS_CONFIG[visit.status];
  const visitType = VISIT_TYPE_CONFIG[visit.visitType];
  const StatusIcon = status.icon;
  
  const isScheduled = visit.status === 'scheduled';
  const isInProgress = visit.status === 'in_progress';
  const visitIsToday = isToday(parseISO(visit.scheduledDate));
  const visitIsTomorrow = isTomorrow(parseISO(visit.scheduledDate));
  
  const dateLabel = visitIsToday 
    ? 'Today' 
    : visitIsTomorrow 
    ? 'Tomorrow' 
    : format(parseISO(visit.scheduledDate), 'EEE, MMM d');

  const taskProgress = visit.taskCount && visit.taskCount > 0
    ? Math.round(((visit.completedTasks || 0) / visit.taskCount) * 100)
    : 0;

  return (
    <Card 
      className={cn(
        'group cursor-pointer hover:shadow-md transition-all overflow-hidden',
        isInProgress && 'ring-2 ring-blue-500',
        isScheduled && visitIsToday && 'border-l-4 border-l-orange-400'
      )}
      onClick={onClick}
    >
      {/* Status stripe for in-progress */}
      {isInProgress && <div className="h-1 bg-gradient-to-r from-blue-500 to-teal-500" />}
      
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Time Column */}
          <div className="text-center min-w-[60px]">
            <p className="text-lg font-semibold">
              {visit.scheduledTime ? format(parseISO(`2000-01-01T${visit.scheduledTime}`), 'h:mm') : '--:--'}
            </p>
            <p className="text-xs text-muted-foreground">
              {visit.scheduledTime ? format(parseISO(`2000-01-01T${visit.scheduledTime}`), 'a') : ''}
            </p>
            <Badge variant="outline" className="mt-2 text-[10px]">
              {dateLabel}
            </Badge>
          </div>

          {/* Divider */}
          <div className="w-px bg-border self-stretch mx-2" />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{visit.projectTitle}</h3>
                  <Badge className={cn('text-[10px] h-5', status.bg, status.color)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{visit.visitNumber}</p>
                
                {/* Visit Type & Duration */}
                <div className="flex items-center gap-3 mt-2">
                  <span className={cn('text-xs px-2 py-0.5 rounded', visitType.bg, visitType.color)}>
                    {visitType.label}
                  </span>
                  {visit.estimatedDuration && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {visit.estimatedDuration} min
                    </span>
                  )}
                </div>

                {/* Address */}
                {visit.siteAddress && (
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {visit.siteAddress.street}, {visit.siteAddress.city}
                  </p>
                )}

                {/* Task Progress */}
                {visit.taskCount && visit.taskCount > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <ClipboardList className="h-3 w-3" />
                        Tasks
                      </span>
                      <span>{visit.completedTasks || 0}/{visit.taskCount}</span>
                    </div>
                    <Progress value={taskProgress} className="h-1.5" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {isScheduled && onCheckIn && (
                  <Button 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
                    disabled={checkingIn}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="mr-1 h-4 w-4" />
                    Start
                  </Button>
                )}
                {isInProgress && onCheckOut && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={(e) => { e.stopPropagation(); onCheckOut(); }}
                    disabled={checkingOut}
                    className="bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Complete
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="self-end">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="text-center py-16">
      <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TechnicianDashboard({
  visits,
  isLoading,
  onVisitClick,
  onCheckIn,
  onCheckOut,
  checkingIn,
  checkingOut: _checkingOut,
  installerName,
}: TechnicianDashboardProps) {
  const [activeTab, setActiveTab] = useState('today');

  // Group visits
  const { todayVisits, upcomingVisits, completedVisits, inProgressVisit } = useMemo(() => {
    const inProgress = visits.find(v => v.status === 'in_progress');
    const todays = visits.filter(v => 
      isToday(parseISO(v.scheduledDate)) && v.status !== 'completed' && v.status !== 'in_progress'
    );
    const upcoming = visits.filter(v => {
      const date = parseISO(v.scheduledDate);
      return !isToday(date) && !isPast(date) && v.status !== 'completed';
    });
    const completed = visits.filter(v => v.status === 'completed');
    
    return {
      todayVisits: todays,
      upcomingVisits: upcoming,
      completedVisits: completed,
      inProgressVisit: inProgress,
    };
  }, [visits]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-semibold">Good {getGreeting()}, {installerName || 'Technician'}</h2>
        <p className="text-muted-foreground">Here&apos;s your schedule for today</p>
      </div>

      {/* Daily Stats */}
      <DailyStats visits={visits} />

      {/* Current Job Banner */}
      {inProgressVisit && (
        <CurrentJobBanner 
          visit={inProgressVisit} 
          onCheckOut={() => onCheckOut(inProgressVisit.id)}
        />
      )}

      {/* Visits Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="today">
            Today ({todayVisits.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingVisits.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedVisits.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 mt-6">
          {todayVisits.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No visits scheduled for today"
              description="Enjoy your day off or check upcoming visits"
            />
          ) : (
            <div className="space-y-4">
              {todayVisits.map(visit => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  onClick={() => onVisitClick(visit.projectId, visit.id)}
                  onCheckIn={() => onCheckIn(visit.id)}
                  checkingIn={checkingIn}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {upcomingVisits.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming visits"
              description="Check back later for new assignments"
            />
          ) : (
            <div className="space-y-4">
              {upcomingVisits.map(visit => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  onClick={() => onVisitClick(visit.projectId, visit.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {completedVisits.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No completed visits yet"
              description="Start working on today's visits"
            />
          ) : (
            <div className="space-y-4">
              {completedVisits.map(visit => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  onClick={() => onVisitClick(visit.projectId, visit.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// UTILITY
// ============================================================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export default TechnicianDashboard;
