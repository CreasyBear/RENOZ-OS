/**
 * Installer Detail Route
 *
 * Tabbed installer detail view with:
 * - Profile: certifications, skills, territories
 * - Schedule: availability calendar, blockout dates
 * - Performance: jobs completed, metrics
 * - Workload: current assignments, capacity
 *
 * SPRINT-03: Story 020 - Installer management routes
 */

import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import {
  ArrowLeft,
  User,
  Calendar,
  Award,
  Briefcase,
  MapPin,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Car,
} from 'lucide-react';
import { useInstaller, useInstallerWorkload, useSiteVisitsByInstaller } from '@/hooks/jobs';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/installers/$installerId')({
  component: InstallerDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/installers" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header title="Installer" description="Loading..." />
      <PageLayout.Content>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: 'Active', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  busy: { label: 'Busy', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  away: { label: 'Away', color: 'text-blue-700', bg: 'bg-blue-100', dot: 'bg-blue-500' },
  suspended: { label: 'Suspended', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
  inactive: { label: 'Inactive', color: 'text-gray-700', bg: 'bg-gray-100', dot: 'bg-gray-500' },
};

// ============================================================================
// PROFILE TAB
// ============================================================================

function ProfileTab({ installer }: { installer: InstallerDetail }) {
  return (
    <div className="space-y-6">
      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {installer.user?.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{installer.user.email}</span>
            </div>
          )}
          {installer.user?.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{installer.user.phone}</span>
            </div>
          )}
          {installer.emergencyContactName && (
            <div className="pt-3 border-t">
              <p className="text-sm font-medium mb-1">Emergency Contact</p>
              <p className="text-sm text-muted-foreground">
                {installer.emergencyContactName}
                {installer.emergencyContactRelationship &&
                  ` (${installer.emergencyContactRelationship})`}
              </p>
              {installer.emergencyContactPhone && (
                <p className="text-sm text-muted-foreground">
                  {installer.emergencyContactPhone}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle & Equipment */}
      {(installer.vehicleType !== 'none' || (installer.equipment && installer.equipment.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehicle & Equipment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {installer.vehicleType !== 'none' && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="capitalize font-medium">{installer.vehicleType}</span>
                {installer.vehicleReg && (
                  <Badge variant="outline">{installer.vehicleReg}</Badge>
                )}
              </div>
            )}
            {installer.equipment && installer.equipment.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {installer.equipment.map((item, i) => (
                  <Badge key={i} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4" />
            Certifications
            <Badge variant="secondary" className="ml-auto">
              {installer.certifications?.length || 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!installer.certifications || installer.certifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No certifications recorded</p>
          ) : (
            <div className="space-y-3">
              {installer.certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{cert.certificationType.replace('_', ' ')}</p>
                    {cert.licenseNumber && (
                      <p className="text-xs text-muted-foreground">
                        License: {cert.licenseNumber}
                      </p>
                    )}
                    {cert.expiryDate && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {cert.isVerified ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" />
            Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!installer.skills || installer.skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills recorded</p>
          ) : (
            <div className="space-y-3">
              {installer.skills.map((skill) => (
                <div key={skill.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{skill.skill.replace('_', ' ')}</span>
                    <span className="text-muted-foreground">
                      {skill.yearsExperience} years
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={skill.proficiencyLevel * 20} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-8">
                      {skill.proficiencyLevel}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Territories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Service Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!installer.territories || installer.territories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No territories assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {installer.territories.map((territory) => (
                <Badge key={territory.id} variant="outline">
                  {territory.postcode}
                  {territory.suburb && ` - ${territory.suburb}`}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SCHEDULE TAB
// ============================================================================

function ScheduleTab({ installer }: { installer: InstallerDetail }) {
  return (
    <div className="space-y-6">
      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Working Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {installer.workingHours &&
              Object.entries(installer.workingHours).map(([day, schedule]) => (
                <div
                  key={day}
                  className={`flex justify-between p-3 rounded-lg ${
                    schedule.working ? 'bg-muted/50' : 'bg-muted/20'
                  }`}
                >
                  <span className="font-medium capitalize">{day}</span>
                  {schedule.working ? (
                    <span className="text-sm text-muted-foreground">
                      {schedule.start} - {schedule.end}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Off</span>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Blockouts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Blockouts</CardTitle>
        </CardHeader>
        <CardContent>
          {!installer.blockouts || installer.blockouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming blockouts</p>
          ) : (
            <div className="space-y-2">
              {installer.blockouts.map((blockout) => (
                <div
                  key={blockout.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(blockout.startDate).toLocaleDateString()} -{' '}
                      {new Date(blockout.endDate).toLocaleDateString()}
                    </p>
                    {blockout.reason && (
                      <p className="text-xs text-muted-foreground">{blockout.reason}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-amber-700">
                    {blockout.blockoutType || 'Blockout'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// PERFORMANCE TAB
// ============================================================================

function PerformanceTab({ installerId }: { installerId: string }) {
  const { data: siteVisitsData, isLoading } = useSiteVisitsByInstaller(installerId);
  const siteVisits = siteVisitsData?.items ?? [];
  
  // Calculate metrics from real data
  const completedVisits = siteVisits.filter((v: any) => v.status === 'completed');
  const totalCompleted = completedVisits.length;
  
  // Calculate on-time rate (visits completed on or before scheduled date)
  const onTimeVisits = completedVisits.filter((v: any) => {
    if (!v.actualEndTime || !v.scheduledDate) return false;
    const scheduled = new Date(v.scheduledDate);
    const actual = new Date(v.actualEndTime);
    return actual <= scheduled;
  });
  const onTimeRate = totalCompleted > 0 ? Math.round((onTimeVisits.length / totalCompleted) * 100) : 0;
  
  // Calculate average rating from completed visits with ratings
  const visitsWithRatings = completedVisits.filter((v: any) => v.customerRating);
  const avgRating = visitsWithRatings.length > 0
    ? (visitsWithRatings.reduce((sum: number, v: any) => sum + (v.customerRating || 0), 0) / visitsWithRatings.length).toFixed(1)
    : 'N/A';

  // Group completed visits by month for trend
  const visitsByMonth = completedVisits.reduce((acc: Record<string, number>, v: any) => {
    const date = new Date(v.scheduledDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[monthKey] = (acc[monthKey] || 0) + 1;
    return acc;
  }, {});
  
  const sortedMonths = Object.entries(visitsByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6); // Last 6 months

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <div className="h-10 animate-pulse bg-muted rounded mx-auto w-16" />
              ) : (
                <p className="text-3xl font-bold">{totalCompleted}</p>
              )}
              <p className="text-sm text-muted-foreground">Visits Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <div className="h-10 animate-pulse bg-muted rounded mx-auto w-16" />
              ) : (
                <p className="text-3xl font-bold">{avgRating}</p>
              )}
              <p className="text-sm text-muted-foreground">Avg Customer Rating</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              {isLoading ? (
                <div className="h-10 animate-pulse bg-muted rounded mx-auto w-16" />
              ) : (
                <p className="text-3xl font-bold">{onTimeRate}%</p>
              )}
              <p className="text-sm text-muted-foreground">On-Time Completion</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Visits by Month</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[200px] animate-pulse bg-muted rounded" />
          ) : sortedMonths.length > 0 ? (
            <div className="h-[200px] flex items-end gap-4">
              {sortedMonths.map(([month, count]) => {
                const maxCount = Math.max(...sortedMonths.map(([, c]) => c));
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const [year, monthNum] = month.split('-');
                const monthLabel = new Date(Number(year), Number(monthNum) - 1).toLocaleDateString('en-US', { month: 'short' });
                
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full relative" style={{ height: '160px' }}>
                      <div
                        className="absolute bottom-0 w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                        style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{monthLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">No completed visits yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// WORKLOAD TAB
// ============================================================================

function WorkloadTab({ installerId }: { installerId: string }) {
  const { data: workload, isLoading: isLoadingWorkload } = useInstallerWorkload(installerId);
  const { data: siteVisitsData, isLoading: isLoadingVisits } = useSiteVisitsByInstaller(installerId);
  
  const siteVisits = siteVisitsData?.items ?? [];
  const upcomingVisits = siteVisits
    .filter((v: any) => v.status === 'scheduled' || v.status === 'in_progress')
    .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);

  const isLoading = isLoadingWorkload || isLoadingVisits;

  return (
    <div className="space-y-6">
      {/* Current Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Workload</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingWorkload ? (
            <div className="h-20 animate-pulse bg-muted rounded" />
          ) : workload ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{workload.activeProjects}</p>
                <p className="text-sm text-muted-foreground">Active Projects</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{workload.upcomingVisits}</p>
                <p className="text-sm text-muted-foreground">Upcoming Visits</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{workload.thisWeekVisits}</p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Failed to load workload data</p>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingVisits ? (
            <div className="h-32 animate-pulse bg-muted rounded" />
          ) : upcomingVisits.length > 0 ? (
            <div className="space-y-3">
              {upcomingVisits.map((visit: any) => (
                <div key={visit.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{visit.project?.name ?? 'Unknown Project'}</p>
                    <p className="text-sm text-muted-foreground">
                      {visit.visitType} • {visit.scheduledDate}
                    </p>
                  </div>
                  <Badge variant={visit.status === 'in_progress' ? 'default' : 'secondary'}>
                    {visit.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming visits scheduled</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// TYPES
// ============================================================================

interface InstallerDetail {
  id: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string;
    phone?: string;
  };
  status: string;
  yearsExperience: number;
  maxJobsPerDay: number;
  vehicleType: string;
  vehicleReg: string | null;
  equipment: string[];
  workingHours: Record<string, { start: string; end: string; working: boolean }>;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  notes: string | null;
  certifications: Array<{
    id: string;
    certificationType: string;
    licenseNumber: string | null;
    expiryDate: string | null;
    isVerified: boolean;
  }>;
  skills: Array<{
    id: string;
    skill: string;
    proficiencyLevel: number;
    yearsExperience: number;
  }>;
  territories: Array<{
    id: string;
    postcode: string;
    suburb: string | null;
  }>;
  blockouts: Array<{
    id: string;
    startDate: string;
    endDate: string;
    reason: string | null;
    blockoutType: string | null;
  }>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function InstallerDetailPage() {
  const { installerId } = useParams({ from: '/_authenticated/installers/$installerId' });
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  // Data fetching
  const { data: rawInstaller, isLoading } = useInstaller(installerId);
  const installer = rawInstaller as InstallerDetail | undefined;

  const handleBack = useCallback(() => {
    navigate({ to: '/installers' });
  }, [navigate]);

  if (isLoading || !installer) {
    return (
      <PageLayout variant="full-width">
        <PageLayout.Header title="Installer" description="Loading..." />
        <PageLayout.Content>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </PageLayout.Content>
      </PageLayout>
    );
  }

  const status = STATUS_CONFIG[installer.status] || STATUS_CONFIG.inactive;
  const initials = (installer.user?.name || installer.user?.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={installer.user?.avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold">
                    {installer.user?.name || installer.user?.email}
                  </span>
                  <Badge className={status.bg}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`} />
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {installer.yearsExperience} years experience • {installer.maxJobsPerDay} jobs/day max
                </p>
              </div>
            </div>
          </div>
        }
        actions={
          <Button variant="outline">Edit Profile</Button>
        }
      />

      <PageLayout.Content className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="border-b px-6">
            <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-1">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-2">
                <Award className="h-4 w-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="workload" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Workload
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="profile" className="mt-0">
              <ProfileTab installer={installer} />
            </TabsContent>

            <TabsContent value="schedule" className="mt-0">
              <ScheduleTab installer={installer} />
            </TabsContent>

            <TabsContent value="performance" className="mt-0">
              <PerformanceTab installerId={installerId} />
            </TabsContent>

            <TabsContent value="workload" className="mt-0">
              <WorkloadTab installerId={installerId} />
            </TabsContent>
          </div>
        </Tabs>
      </PageLayout.Content>
    </PageLayout>
  );
}
