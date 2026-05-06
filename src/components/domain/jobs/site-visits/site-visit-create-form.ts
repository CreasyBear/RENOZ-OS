import { format } from 'date-fns';
import type {
  CreateSiteVisitInput,
  ProjectSiteVisitFormInput,
  ScheduleVisitFormInput,
} from '@/lib/schemas/jobs';
import {
  CURRENT_USER_INSTALLER_OPTION_VALUE,
  resolveSiteVisitInstallerId,
} from './site-visit-installer-options';

type SiteVisitCreateFormInput = ProjectSiteVisitFormInput | ScheduleVisitFormInput;

interface SiteVisitFormDefaultOptions {
  projectId?: string;
  scheduledDate?: Date;
  scheduledTime?: string;
}

export function createScheduleSiteVisitFormDefaults({
  projectId,
  scheduledDate,
  scheduledTime,
}: SiteVisitFormDefaultOptions = {}): ScheduleVisitFormInput {
  return {
    projectId: projectId ?? '',
    visitType: 'installation',
    scheduledDate: scheduledDate ?? new Date(),
    scheduledTime: scheduledTime ?? '',
    estimatedDuration: 120,
    installerId: CURRENT_USER_INSTALLER_OPTION_VALUE,
    notes: '',
  };
}

export function createProjectSiteVisitFormDefaults(): ProjectSiteVisitFormInput {
  const { projectId: _projectId, ...defaults } = createScheduleSiteVisitFormDefaults();
  return defaults;
}

export function buildCreateSiteVisitInput(
  projectId: string,
  data: SiteVisitCreateFormInput
): CreateSiteVisitInput {
  return {
    projectId,
    visitType: data.visitType,
    scheduledDate: format(data.scheduledDate, 'yyyy-MM-dd'),
    scheduledTime: data.scheduledTime || undefined,
    estimatedDuration: data.estimatedDuration ?? undefined,
    installerId: resolveSiteVisitInstallerId(data.installerId),
    notes: data.notes,
  };
}
