export interface ProjectTaskQuickAddSiteVisit {
  id: string;
}

export function getDefaultProjectTaskSiteVisitId(
  siteVisits: readonly ProjectTaskQuickAddSiteVisit[]
): string | undefined {
  return siteVisits.length === 1 ? siteVisits[0].id : siteVisits[0]?.id;
}
