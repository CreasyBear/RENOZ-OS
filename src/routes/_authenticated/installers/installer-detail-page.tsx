/**
 * Installer Detail Page
 *
 * Tabbed installer detail view with:
 * - Profile: certifications, skills, territories
 * - Schedule: availability calendar, blockout dates
 * - Performance: jobs completed, metrics
 * - Workload: current assignments, capacity
 *
 * SPRINT-03: Story 020 - Installer management routes
 *
 * @source hooks   src/hooks/jobs/use-installers.ts
 * @source schemas src/lib/schemas/jobs/installers.ts
 * @source server  src/server/functions/installers.ts
 * @source config  src/components/domain/jobs/installers/installer-status-config.ts
 */

import { useNavigate, useParams, Link } from '@tanstack/react-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { PageLayout } from '@/components/layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  User,
  Calendar,
  Award,
  Briefcase,
  Mail,
  Phone,
  AlertTriangle,
  X,
  ExternalLink,
  Link2,
  PanelRight,
} from 'lucide-react';
import { useInstaller, useInstallerWorkload, useUpdateInstallerProfile } from '@/hooks/jobs';
import { useTrackView } from '@/hooks/search';
import { toastError, toastSuccess } from '@/hooks';
import { useAlertDismissals, generateAlertId } from '@/hooks/_shared/use-alert-dismissals';
import { useReducedMotion } from '@/hooks/_shared/use-reduced-motion';
import { INSTALLER_STATUS_CONFIG } from '@/components/domain/jobs/installers';
import { MobileSidebarSheet } from '@/components/shared/mobile-sidebar-sheet';
import { ProfileTab } from './profile-tab';
import { ScheduleTab } from './schedule-tab';
import { PerformanceTab } from './performance-tab';
import { WorkloadTab } from './workload-tab';
import { cn } from '@/lib/utils';

type InstallerTab = 'profile' | 'schedule' | 'performance' | 'workload';

interface InstallerDetailPageProps {
  search: { tab: InstallerTab };
}

function InstallerDetailPage({ search }: InstallerDetailPageProps) {
  const { installerId } = useParams({ from: '/_authenticated/installers/$installerId' });
  const navigate = useNavigate();
  const activeTab = search.tab || 'profile';
  const prefersReducedMotion = useReducedMotion();

  const { data: installer, isLoading } = useInstaller(installerId);
  const { data: workload } = useInstallerWorkload(installerId);
  const updateInstallerProfile = useUpdateInstallerProfile();
  useTrackView(
    'installer',
    installer?.id,
    installer?.user?.name ?? installer?.user?.email,
    installer?.user?.email ?? undefined,
    `/installers/${installerId}`
  );
  const { dismiss, isAlertDismissed } = useAlertDismissals();
  const [showMetaPanel, setShowMetaPanel] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    status: 'active',
    yearsExperience: '0',
    maxJobsPerDay: '2',
    maxTravelKm: '',
    vehicleType: 'none',
    vehicleReg: '',
    notes: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  });

  const handleBack = useCallback(() => {
    navigate({ to: '/installers' });
  }, [navigate]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toastSuccess('Link copied to clipboard');
  }, []);

  const handleToggleMetaPanel = useCallback(() => {
    setShowMetaPanel((prev) => !prev);
  }, []);

  const handleOpenEditDialog = useCallback(() => {
    if (!installer) return;
    setEditForm({
      status: installer.status,
      yearsExperience: String(installer.yearsExperience ?? 0),
      maxJobsPerDay: String(installer.maxJobsPerDay ?? 2),
      maxTravelKm: installer.maxTravelKm != null ? String(installer.maxTravelKm) : '',
      vehicleType: installer.vehicleType ?? 'none',
      vehicleReg: installer.vehicleReg ?? '',
      notes: installer.notes ?? '',
      emergencyContactName: installer.emergencyContactName ?? '',
      emergencyContactPhone: installer.emergencyContactPhone ?? '',
      emergencyContactRelationship: installer.emergencyContactRelationship ?? '',
    });
    setEditDialogOpen(true);
  }, [installer]);

  const handleSaveEditProfile = useCallback(async () => {
    if (!installer) return;
    const yearsExperience = Number(editForm.yearsExperience);
    const maxJobsPerDay = Number(editForm.maxJobsPerDay);
    const maxTravelKm = editForm.maxTravelKm.trim() ? Number(editForm.maxTravelKm) : null;

    if (!Number.isFinite(yearsExperience) || yearsExperience < 0) {
      toastError('Years of experience must be 0 or greater');
      return;
    }
    if (!Number.isFinite(maxJobsPerDay) || maxJobsPerDay < 1) {
      toastError('Max jobs per day must be at least 1');
      return;
    }
    if (maxTravelKm !== null && (!Number.isFinite(maxTravelKm) || maxTravelKm < 1)) {
      toastError('Max travel distance must be at least 1 km');
      return;
    }

    try {
      await updateInstallerProfile.mutateAsync({
        data: {
          id: installer.id,
          status: editForm.status as 'active' | 'busy' | 'away' | 'suspended' | 'inactive',
          yearsExperience,
          maxJobsPerDay,
          maxTravelKm,
          vehicleType: editForm.vehicleType as 'none' | 'ute' | 'van' | 'truck' | 'trailer',
          vehicleReg: emptyToUndefined(editForm.vehicleReg),
          notes: emptyToUndefined(editForm.notes),
          emergencyContactName: emptyToUndefined(editForm.emergencyContactName),
          emergencyContactPhone: emptyToUndefined(editForm.emergencyContactPhone),
          emergencyContactRelationship: emptyToUndefined(editForm.emergencyContactRelationship),
        },
      });
      toastSuccess('Installer profile updated');
      setEditDialogOpen(false);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to update installer profile');
    }
  }, [installer, editForm, updateInstallerProfile]);

  // Compute alerts
  const alerts = useMemo(() => {
    if (!installer) return [];

    const items: Array<{
      id: string;
      type: 'expired_certifications' | 'expiring_certifications' | 'at_capacity' | 'near_capacity';
      tone: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      actionLabel?: string;
      onAction?: () => void;
    }> = [];

    const now = new Date();
    const CERTIFICATION_EXPIRY_WARNING_DAYS = 30;
    const thirtyDaysFromNow = addDays(now, CERTIFICATION_EXPIRY_WARNING_DAYS);

    // Check for expired certifications
    const expiredCerts = installer.certifications?.filter((cert) => {
      if (!cert.expiryDate) return false;
      return new Date(cert.expiryDate) < now;
    }) ?? [];

    if (expiredCerts.length > 0) {
      items.push({
        id: generateAlertId('installer', installerId, 'expired_certifications'),
        type: 'expired_certifications',
        tone: 'critical',
        title: `${expiredCerts.length} certification${expiredCerts.length > 1 ? 's' : ''} expired`,
        description: `${expiredCerts.map((c) => c.certificationType.replace('_', ' ')).join(', ')} ${expiredCerts.length > 1 ? 'have' : 'has'} expired and needs renewal.`,
        actionLabel: 'View Profile',
        onAction: () => navigate({ to: '/installers/$installerId', params: { installerId }, search: { tab: 'profile' } }),
      });
    }

    // Check for expiring certifications (< 30 days)
    const expiringCerts = installer.certifications?.filter((cert) => {
      if (!cert.expiryDate) return false;
      const expiryDate = new Date(cert.expiryDate);
      return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
    }) ?? [];

    if (expiringCerts.length > 0) {
      items.push({
        id: generateAlertId('installer', installerId, 'expiring_certifications'),
        type: 'expiring_certifications',
        tone: 'warning',
        title: `${expiringCerts.length} certification${expiringCerts.length > 1 ? 's' : ''} expiring soon`,
        description: `${expiringCerts.map((c) => c.certificationType.replace('_', ' ')).join(', ')} ${expiringCerts.length > 1 ? 'expire' : 'expires'} within 30 days.`,
        actionLabel: 'View Profile',
        onAction: () => navigate({ to: '/installers/$installerId', params: { installerId }, search: { tab: 'profile' } }),
      });
    }

    // Check capacity warnings
    if (workload && installer.maxJobsPerDay > 0) {
      const capacityUsed = workload.activeProjects / installer.maxJobsPerDay;
      if (capacityUsed >= 1.0) {
        items.push({
          id: generateAlertId('installer', installerId, 'at_capacity'),
          type: 'at_capacity',
          tone: 'warning',
          title: 'At capacity',
          description: `Currently assigned to ${workload.activeProjects} active project${workload.activeProjects > 1 ? 's' : ''} (max: ${installer.maxJobsPerDay} jobs/day).`,
          actionLabel: 'View Workload',
          onAction: () => navigate({ to: '/installers/$installerId', params: { installerId }, search: { tab: 'workload' } }),
        });
      } else if (capacityUsed >= 0.8) {
        items.push({
          id: generateAlertId('installer', installerId, 'near_capacity'),
          type: 'near_capacity',
          tone: 'info',
          title: 'Near capacity',
          description: `${Math.round(capacityUsed * 100)}% capacity utilized (${workload.activeProjects}/${installer.maxJobsPerDay} jobs/day).`,
          actionLabel: 'View Workload',
          onAction: () => navigate({ to: '/installers/$installerId', params: { installerId }, search: { tab: 'workload' } }),
        });
      }
    }

    return items;
  }, [installer, installerId, workload, navigate]);

  // Filter dismissed alerts
  const visibleAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const alertId = generateAlertId('installer', installerId, alert.type);
      return !isAlertDismissed(alertId);
    }).slice(0, 3);
  }, [alerts, installerId, isAlertDismissed]);

  // Handle alert dismissal
  const handleDismissAlert = useCallback(
    (alertId: string) => {
      const alert = alerts.find((a) => a.id === alertId);
      if (alert) {
        const persistentId = generateAlertId('installer', installerId, alert.type);
        dismiss(persistentId);
      }
    },
    [alerts, installerId, dismiss]
  );

  // Sidebar content (extracted for reuse, memoized) - must be before early return
  const sidebarContent = useMemo(() => {
    if (!installer) return null;
    
    return (
      <div className="space-y-4">
        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {installer.user?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${installer.user.email}`}
                  className="text-primary hover:underline"
                >
                  {installer.user.email}
                </a>
              </div>
            )}
            {installer.user && (installer.user as { phone?: string }).phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${(installer.user as { phone?: string }).phone}`}
                  className="text-primary hover:underline"
                >
                  {(installer.user as { phone?: string }).phone}
                </a>
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
                  <a
                    href={`tel:${installer.emergencyContactPhone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {installer.emergencyContactPhone}
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              to="/projects"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'w-full justify-start'
              )}
            >
              View All Projects
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Link>
            {workload && workload.activeProjects > 0 && (
              <Link
                to="/projects"
                search={{ installerId }}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'w-full justify-start'
                )}
              >
                Active Projects ({workload.activeProjects})
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Link>
            )}
            <Link
              to="/schedule"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'w-full justify-start'
              )}
            >
              View Schedule
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Link>
          </CardContent>
        </Card>

        {/* Record Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <StatusBadge
                status={installer.status}
                statusConfig={INSTALLER_STATUS_CONFIG}
                className="text-xs"
              />
            </div>
            {installer.createdAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{format(new Date(installer.createdAt), 'PP')}</span>
              </div>
            )}
            {installer.updatedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last updated:</span>
                <span>{format(new Date(installer.updatedAt), 'PP')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }, [installer, workload, installerId]);

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

  const initials = (installer.user?.name || installer.user?.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Header metrics
  const activeProjects = workload?.activeProjects ?? 0;
  const thisWeekVisits = workload?.thisWeekVisits ?? 0;

  // Tab counts
  const certificationsCount = installer.certifications?.length ?? 0;
  const skillsCount = installer.skills?.length ?? 0;

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back to installers">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={(installer.user as { avatarUrl?: string })?.avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold">
                    {installer.user?.name || installer.user?.email}
                  </span>
                  <StatusBadge
                    status={installer.status}
                    statusConfig={INSTALLER_STATUS_CONFIG}
                  />
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-muted-foreground">
                    {installer.yearsExperience ?? 0} years experience • {installer.maxJobsPerDay} jobs/day max
                  </p>
                  {/* Header Metrics */}
                  {workload && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{activeProjects}</span> active projects
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{thisWeekVisits}</span> visits this week
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleOpenEditDialog}>
              Edit Profile
            </Button>
            {/* Utility buttons */}
            <div className="hidden lg:flex items-center gap-2 border-l pl-2 ml-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCopyLink}
                      aria-label="Copy link to clipboard"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy link</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-8 w-8', showMetaPanel && 'bg-muted')}
                      onClick={handleToggleMetaPanel}
                      aria-label="Toggle details panel"
                    >
                      <PanelRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{showMetaPanel ? 'Hide' : 'Show'} details panel</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        }
      />

      <PageLayout.Content className="p-0">
        {/* Alerts Section */}
        {visibleAlerts.length > 0 && (
          <div className="px-6 pt-6 pb-0">
            <div className="space-y-2">
              {visibleAlerts.map((alert) => (
                <Alert
                  key={alert.id}
                  variant={alert.tone === 'critical' ? 'destructive' : 'default'}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{alert.title}</div>
                      <div className="text-sm text-muted-foreground">{alert.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alert.actionLabel && alert.onAction && (
                        <Button variant="outline" size="sm" onClick={alert.onAction}>
                          {alert.actionLabel}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Dismiss alert"
                        onClick={() => handleDismissAlert(alert.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        <div
          className={cn(
            'grid gap-6 px-6 pt-6',
            showMetaPanel ? 'lg:grid-cols-[1fr,320px]' : 'grid-cols-1'
          )}
        >
          {/* Main Content */}
          <div className="min-w-0">
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                navigate({
                  to: '/installers/$installerId',
                  params: { installerId },
                  search: { tab: value as InstallerTab },
                })
              }
              className="flex flex-col h-full"
            >
              <div className="border-b mb-6">
                <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-1">
                  <TabsTrigger value="profile" className="gap-2">
                    <User className="h-4 w-4" />
                    Profile{certificationsCount > 0 || skillsCount > 0 ? ` (${certificationsCount + skillsCount})` : ''}
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
                    Workload{workload && workload.activeProjects > 0 ? ` (${workload.activeProjects})` : ''}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1">
                {activeTab === 'profile' && (
                  <TabsContent value="profile" className="mt-0">
                    <ProfileTab installer={installer as unknown as import('@/lib/schemas/jobs/installers').InstallerDetail} />
                  </TabsContent>
                )}

                {activeTab === 'schedule' && (
                  <TabsContent value="schedule" className="mt-0">
                    <ScheduleTab installer={installer as unknown as import('@/lib/schemas/jobs/installers').InstallerDetail} />
                  </TabsContent>
                )}

                {activeTab === 'performance' && (
                  <TabsContent value="performance" className="mt-0">
                    <PerformanceTab installerId={installerId} />
                  </TabsContent>
                )}

                {activeTab === 'workload' && (
                  <TabsContent value="workload" className="mt-0">
                    <WorkloadTab installerId={installerId} />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>

          {/* Sidebar - Desktop (toggleable) */}
          <AnimatePresence initial={false}>
            {showMetaPanel && (
              <motion.aside
                initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: prefersReducedMotion ? 0 : 20 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                className="hidden lg:block"
              >
                {sidebarContent}
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

          {/* Mobile Sidebar Sheet */}
        {sidebarContent && (
          <MobileSidebarSheet title="Installer Details" ariaLabel="Show installer details">
            {sidebarContent}
          </MobileSidebarSheet>
        )}
      </PageLayout.Content>

      <Dialog open={editDialogOpen} onOpenChange={createPendingDialogOpenChangeHandler(updateInstallerProfile.isPending, setEditDialogOpen)}>
        <DialogContent
          className="max-w-2xl"
          onEscapeKeyDown={createPendingDialogInteractionGuards(updateInstallerProfile.isPending).onEscapeKeyDown}
          onInteractOutside={createPendingDialogInteractionGuards(updateInstallerProfile.isPending).onInteractOutside}
        >
          <DialogHeader>
            <DialogTitle>Edit Installer Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <Select
                  value={editForm.vehicleType}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, vehicleType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="ute">Ute</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="trailer">Trailer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Years Experience</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.yearsExperience}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, yearsExperience: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Jobs/Day</Label>
                <Input
                  type="number"
                  min={1}
                  value={editForm.maxJobsPerDay}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, maxJobsPerDay: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Travel (km)</Label>
                <Input
                  type="number"
                  min={1}
                  value={editForm.maxTravelKm}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, maxTravelKm: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vehicle Registration</Label>
              <Input
                value={editForm.vehicleReg}
                onChange={(e) => setEditForm((prev) => ({ ...prev, vehicleReg: e.target.value }))}
                placeholder="Optional vehicle reg"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Emergency Contact Name</Label>
                <Input
                  value={editForm.emergencyContactName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Phone</Label>
                <Input
                  value={editForm.emergencyContactPhone}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input
                  value={editForm.emergencyContactRelationship}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, emergencyContactRelationship: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updateInstallerProfile.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditProfile} disabled={updateInstallerProfile.isPending}>
              {updateInstallerProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export default memo(InstallerDetailPage);
