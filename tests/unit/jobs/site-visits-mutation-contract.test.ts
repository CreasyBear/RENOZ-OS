import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatSiteVisitMutationError } from '@/hooks/jobs/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(source: string): string {
  return source.replace(/\s+/g, '');
}

describe('site visits mutation contract', () => {
  it('formats site visit mutation failures without leaking unsafe internals', () => {
    expect(
      formatSiteVisitMutationError(
        new Error('duplicate key violates site_visits_project_idx postgres stack'),
        'create'
      )
    ).toBe('Site visit scheduling is temporarily unavailable. Please refresh and try again.');

    expect(
      formatSiteVisitMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED', message: 'raw auth detail' },
        'cancel'
      )
    ).toBe('You do not have permission to manage site visits.');

    expect(
      formatSiteVisitMutationError(
        {
          statusCode: 400,
          errors: {
            scheduledDate: ['Scheduled date is required'],
          },
        },
        'reschedule'
      )
    ).toBe('Scheduled date is required');
  });

  it('keeps site visit mutations project-scoped, cache-safe, and operator-safe', () => {
    const schema = read('src/lib/schemas/jobs/site-visits.ts');
    const hooks = read('src/hooks/jobs/use-site-visits.ts');
    const installersHook = read('src/hooks/jobs/use-installers.ts');
    const jobsIndex = read('src/hooks/jobs/index.ts');
    const server = read('src/server/functions/site-visits.ts');
    const installerOptionHelper = read(
      'src/components/domain/jobs/site-visits/site-visit-installer-options.ts'
    );
    const createFormHelper = read(
      'src/components/domain/jobs/site-visits/site-visit-create-form.ts'
    );
    const projectCreateDialog = read(
      'src/components/domain/jobs/projects/site-visit-create-dialog.tsx'
    );
    const scheduleCreateDialog = read(
      'src/components/domain/jobs/schedule/schedule-visit-create-dialog.tsx'
    );
    const scheduleContainer = read(
      'src/components/domain/jobs/schedule/schedule-calendar-container.tsx'
    );
    const projectDetailContainer = read(
      'src/components/domain/jobs/projects/containers/project-detail-container.tsx'
    );
    const visitDetail = read('src/components/domain/jobs/site-visits/site-visit-detail.tsx');
    const signOffDialog = read(
      'src/components/domain/jobs/projects/customer-sign-off-dialog.tsx'
    );
    const visitRoute = read(
      'src/routes/_authenticated/projects/$projectId_.visits/site-visit-detail-page.tsx'
    );
    const myTasksPage = read('src/routes/_authenticated/my-tasks/my-tasks-page.tsx');
    const compactSchema = compact(schema);
    const compactHooks = compact(hooks);
    const compactServer = compact(server);
    const compactScheduleCreateDialog = compact(scheduleCreateDialog);
    const compactRoute = compact(visitRoute);
    const compactSchedule = compact(scheduleContainer);
    const compactProjectDetail = compact(projectDetailContainer);
    const compactMyTasks = compact(myTasksPage);

    expect(jobsIndex).toContain('formatSiteVisitMutationError');
    expect(schema).toContain('scopedSiteVisitIdSchema');
    expect(compactSchema).toContain(
      'exportconstscopedSiteVisitIdSchema=siteVisitIdSchema.extend({projectId:z.string().uuid().optional()'
    );
    expect(compactSchema).toContain(
      'exportconstupdateSiteVisitSchema=z.object({siteVisitId:z.string().uuid(),projectId:z.string().uuid().optional()'
    );
    expect(compactSchema).toContain(
      'exportconstrescheduleSiteVisitSchema=z.object({siteVisitId:z.string().uuid(),projectId:z.string().uuid().optional()'
    );
    expect(compactSchema).toContain(
      'exportconstcheckInSchema=z.object({siteVisitId:z.string().uuid(),projectId:z.string().uuid().optional()'
    );
    expect(compactSchema).toContain(
      'exportconstcheckOutSchema=z.object({siteVisitId:z.string().uuid(),projectId:z.string().uuid().optional()'
    );
    expect(compactSchema).toContain(
      'exportconstcustomerSignOffSchema=z.object({siteVisitId:z.string().uuid(),projectId:z.string().uuid().optional()'
    );
    expect(compactSchema).toContain(
      'exportconstprojectSiteVisitFormSchema=scheduleVisitFormSchema.omit({projectId:true,})'
    );

    expect(compactHooks).toContain(
      'data:{siteVisitId,...(projectId?{projectId}:{})}'
    );
    expect(hooks).toContain('invalidateSiteVisitMutationViews');
    expect(hooks).toContain('queryKeys.siteVisits.all');
    expect(compactHooks).toContain(
      "constdata=typeofinput==='string'?{siteVisitId:input}:input"
    );
    expect(compactHooks).toContain(
      'return{id:result.id,projectId:result.projectId,installerId:result.installerId}'
    );
    expect(installersHook).toContain('listAllActiveInstallers');
    expect(installersHook).toContain('normalizeReadQueryError(error, {');
    expect(installersHook).toContain(
      "'Installer directory is temporarily unavailable. Please refresh and try again.'"
    );

    expect(server).toContain('function siteVisitScope');
    expect(compactServer).toContain('conditions.push(eq(siteVisits.projectId,projectId))');
    expect(compactServer).toContain(
      'functionprojectScope(projectId:string,organizationId:string)'
    );
    expect(compactServer).toContain(
      'functionsiteVisitProjectJoin(organizationId:string)'
    );
    expect(compactServer).toContain(
      'leftJoin(projects,siteVisitProjectJoin(ctx.organizationId))'
    );
    expect(compactServer).toContain(
      'where:siteVisitScope(data.siteVisitId,ctx.organizationId,data.projectId)'
    );
    expect(compactServer).toContain(
      'where:projectScope(existingVisit.projectId,ctx.organizationId)'
    );
    expect(compactServer).toContain(
      'where(siteVisitScope(data.siteVisitId,ctx.organizationId,data.projectId))'
    );
    expect(compactServer).toContain(
      'returning({id:siteVisits.id,projectId:siteVisits.projectId,installerId:siteVisits.installerId,})'
    );
    expect(compactServer).not.toContain('.where(eq(siteVisits.id,data.siteVisitId))');
    expect(compactServer).not.toContain('where:eq(projects.id,existingVisit.projectId)');

    expect(projectCreateDialog).toContain("formatSiteVisitMutationError(err, 'create')");
    expect(scheduleCreateDialog).toContain("formatSiteVisitMutationError(err, 'create')");
    expect(scheduleContainer).toContain("formatSiteVisitMutationError(error, 'reschedule')");
    expect(projectDetailContainer).toContain(
      "formatSiteVisitMutationError(error, 'reschedule')"
    );
    expect(visitDetail).toContain("formatSiteVisitMutationError(error, 'cancel')");
    expect(signOffDialog).toContain('formatSiteVisitMutationError(error, "signOff")');
    expect(visitRoute).toContain("formatSiteVisitMutationError(error, 'checkIn')");
    expect(visitRoute).toContain("formatSiteVisitMutationError(error, 'checkOut')");
    expect(myTasksPage).toContain("formatSiteVisitMutationError(error, 'checkIn')");
    expect(myTasksPage).toContain("formatSiteVisitMutationError(error, 'checkOut')");

    expect(installerOptionHelper).toContain(
      "CURRENT_USER_INSTALLER_OPTION_VALUE = 'current-user'"
    );
    expect(installerOptionHelper).toContain("label: 'Assign to me'");
    expect(installerOptionHelper).toContain('const userId = installer.user?.id');
    expect(installerOptionHelper).toContain('value: userId');
    expect(installerOptionHelper).toContain('resolveSiteVisitInstallerId');
    expect(createFormHelper).toContain('createProjectSiteVisitFormDefaults');
    expect(createFormHelper).toContain('createScheduleSiteVisitFormDefaults');
    expect(createFormHelper).toContain('buildCreateSiteVisitInput');
    expect(createFormHelper).toContain("format(data.scheduledDate, 'yyyy-MM-dd')");
    expect(createFormHelper).toContain('resolveSiteVisitInstallerId(data.installerId)');
    expect(projectCreateDialog).toContain('useAllInstallers');
    expect(scheduleCreateDialog).toContain('useAllInstallers');
    expect(projectCreateDialog).toContain('projectSiteVisitFormSchema');
    expect(scheduleCreateDialog).toContain('scheduleVisitFormSchema');
    expect(projectCreateDialog).toContain('createProjectSiteVisitFormDefaults');
    expect(scheduleCreateDialog).toContain('createScheduleSiteVisitFormDefaults');
    expect(projectCreateDialog).toContain('buildCreateSiteVisitInput(projectId, data)');
    expect(compactScheduleCreateDialog).toContain(
      'buildCreateSiteVisitInput(resolvedProjectId,data)'
    );
    expect(projectCreateDialog).toContain('Installer directory unavailable');
    expect(scheduleCreateDialog).toContain('Installer directory unavailable');
    expect(projectCreateDialog).toContain('Showing cached installers');
    expect(scheduleCreateDialog).toContain('Showing cached installers');
    expect(projectCreateDialog).toContain('void refetchInstallers()');
    expect(scheduleCreateDialog).toContain('void refetchInstallers()');
    expect(projectCreateDialog).not.toContain('useUsers');
    expect(scheduleCreateDialog).not.toContain('useUsers');
    expect(projectCreateDialog).not.toContain('Unassigned');
    expect(scheduleCreateDialog).not.toContain('Unassigned');
    expect(projectCreateDialog).not.toContain("'unassigned'");
    expect(scheduleCreateDialog).not.toContain("'unassigned'");
    expect(projectCreateDialog).not.toContain('createSiteVisitFormSchema');
    expect(projectCreateDialog).not.toContain("z.enum(['assessment'");
    expect(projectCreateDialog).not.toContain("format(data.scheduledDate, 'yyyy-MM-dd')");
    expect(scheduleCreateDialog).not.toContain("format(data.scheduledDate, 'yyyy-MM-dd')");
    expect(projectCreateDialog).not.toContain('estimatedDuration: 120');
    expect(scheduleCreateDialog).not.toContain('estimatedDuration: 120');
    expect(projectCreateDialog).not.toContain('resolveSiteVisitInstallerId(data.installerId)');
    expect(scheduleCreateDialog).not.toContain('resolveSiteVisitInstallerId(data.installerId)');

    expect(compactRoute).toContain('useSiteVisit({siteVisitId:visitId,projectId})');
    expect(compactRoute).toContain('checkIn.mutateAsync({siteVisitId:visitId,projectId})');
    expect(compactRoute).toContain('checkOut.mutateAsync({siteVisitId:visitId,projectId})');
    expect(compactRoute).toContain('projectId={projectId}');
    expect(compactSchedule).toContain('rescheduleMutation.mutateAsync({');
    expect(compactSchedule).toContain('siteVisitId:visitId,projectId,scheduledDate:newDate');
    expect(compactProjectDetail).toContain(
      'rescheduleVisit.mutateAsync({siteVisitId:visitId,projectId,scheduledDate:dateStr})'
    );
    expect(compactMyTasks).toContain(
      '...(visitProjectId?{projectId:visitProjectId}:{})'
    );

    expect(projectCreateDialog).not.toContain(
      "err instanceof Error ? err.message : 'Failed to schedule site visit'"
    );
    expect(scheduleCreateDialog).not.toContain(
      "err instanceof Error ? err.message : 'Failed to schedule site visit'"
    );
    expect(signOffDialog).not.toContain('Failed to record sign-off:');
    expect(visitRoute).not.toContain("toast.error('Failed to check in')");
    expect(visitRoute).not.toContain("toast.error('Failed to check out')");
  });
});
