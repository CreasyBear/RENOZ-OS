import type { ListFeedbackInput } from '@/lib/schemas/support/csat-responses';
import type { ListIssueTemplatesInput } from '@/lib/schemas/support/issue-templates';
import type { ListArticlesInput } from '@/lib/schemas/support/knowledge-base';
import type { ListRmasInput } from '@/lib/schemas/support/rma';

type KbArticleSortField = NonNullable<ListArticlesInput['sortBy']>;
type CsatSortField = NonNullable<ListFeedbackInput['sortBy']>;
type IssueTemplateSortField = NonNullable<ListIssueTemplatesInput['sortBy']>;
type RmaSortField = NonNullable<ListRmasInput['sortBy']>;

export interface RmaFilters {
  status?: string
  reason?: string
  customerId?: string
  orderId?: string
  issueId?: string
  resolution?: string
  executionStatus?: string
  linkedIssueOpenState?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: RmaSortField
  sortOrder?: 'asc' | 'desc'
}

export interface IssueFilters {
  status?: string | string[]
  priority?: string | string[]
  type?: string
  customerId?: string
  assignedToUserId?: string
  search?: string
  nextActionType?: string
  rmaState?: 'any' | 'ready' | 'blocked' | 'linked'
  serialState?: 'any' | 'present' | 'missing'
  warrantyState?: 'any' | 'present' | 'missing'
  orderState?: 'any' | 'present' | 'missing'
  serviceSystemState?: 'any' | 'present' | 'missing'
  limit?: number
  offset?: number
  includeSlaMetrics?: boolean
}

export interface KbCategoryFilters {
  parentId?: string | null
  isActive?: boolean
  includeArticleCount?: boolean
}

export interface KbArticleFilters {
  categoryId?: string
  status?: string
  search?: string
  tags?: string[]
  page?: number
  pageSize?: number
  sortBy?: KbArticleSortField
  sortOrder?: 'asc' | 'desc'
}

export interface CsatFilters {
  issueId?: string
  rating?: number
  minRating?: number
  maxRating?: number
  source?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
  sortBy?: CsatSortField
  sortOrder?: 'asc' | 'desc'
}

export interface IssueTemplateFilters {
  type?: string
  isActive?: boolean
  search?: string
  page?: number
  pageSize?: number
  sortBy?: IssueTemplateSortField
  sortOrder?: 'asc' | 'desc'
}

export interface SlaConfigurationFilters {
  domain?: 'support' | 'warranty' | 'jobs'
  isActive?: boolean
  includeDefaults?: boolean
}

const all = ['support'] as const;

const issuesList = () => [...all, 'issues', 'list'] as const;
const issuesListFiltered = (filters?: IssueFilters) =>
  [...issuesList(), filters ?? {}] as const;
const issueDetails = () => [...all, 'issues', 'detail'] as const;
const issueDetail = (id: string) => [...issueDetails(), id] as const;
const issueIntakePreview = (input?: Record<string, unknown>) =>
  [...all, 'issues', 'intake-preview', input ?? {}] as const;

const rmasList = () => [...all, 'rmas', 'list'] as const;
const rmasListFiltered = (filters?: RmaFilters) =>
  [...rmasList(), filters ?? {}] as const;
const rmaDetails = () => [...all, 'rmas', 'detail'] as const;
const rmaDetail = (id: string) => [...rmaDetails(), id] as const;

const kbCategories = () => [...all, 'kb', 'categories'] as const;
const kbCategoryList = (filters?: KbCategoryFilters) =>
  [...kbCategories(), 'list', filters ?? {}] as const;
const kbCategoryDetails = () => [...kbCategories(), 'detail'] as const;
const kbCategoryDetail = (id: string) =>
  [...kbCategoryDetails(), id] as const;

const kbArticles = () => [...all, 'kb', 'articles'] as const;
const kbArticleList = (filters?: KbArticleFilters) =>
  [...kbArticles(), 'list', filters ?? {}] as const;
const kbArticleDetails = () => [...kbArticles(), 'detail'] as const;
const kbArticleDetail = (id: string) =>
  [...kbArticleDetails(), id] as const;

const csatList = () => [...all, 'csat', 'list'] as const;
const csatListFiltered = (filters?: CsatFilters) =>
  [...csatList(), filters ?? {}] as const;
const csatDetails = () => [...all, 'csat', 'detail'] as const;
const csatDetail = (issueId: string) =>
  [...csatDetails(), issueId] as const;
const csatMetrics = (filters?: { startDate?: string; endDate?: string }) =>
  [...all, 'csat', 'metrics', filters ?? {}] as const;

const supportMetrics = () => [...all, 'metrics'] as const;
const supportMetricsWithDates = (startDate?: string, endDate?: string) =>
  [...supportMetrics(), { startDate, endDate }] as const;

const issueTemplatesList = () =>
  [...all, 'issueTemplates', 'list'] as const;
const issueTemplatesListFiltered = (filters?: IssueTemplateFilters) =>
  [...issueTemplatesList(), filters ?? {}] as const;
const issueTemplateDetails = () =>
  [...all, 'issueTemplates', 'detail'] as const;
const issueTemplateDetail = (id: string) =>
  [...issueTemplateDetails(), id] as const;
const popularTemplates = (limit?: number) =>
  [...all, 'issueTemplates', 'popular', limit ?? 5] as const;

const escalationRules = () => [...all, 'escalationRules'] as const;

const slaConfigurations = () => [...all, 'sla', 'configurations'] as const;
const slaConfigurationsList = (filters?: SlaConfigurationFilters) =>
  [...slaConfigurations(), 'list', filters ?? {}] as const;
const slaConfigurationDetail = (id: string) =>
  [...slaConfigurations(), 'detail', id] as const;
const slaConfigurationDefault = (domain: string) =>
  [...slaConfigurations(), 'default', domain] as const;
const slaHasConfigurations = (domain?: string) =>
  [...slaConfigurations(), 'has', domain ?? 'all'] as const;

const slaTracking = () => [...all, 'sla', 'tracking'] as const;
const slaTrackingDetail = (id: string) =>
  [...slaTracking(), 'detail', id] as const;
const slaTrackingState = (id: string) =>
  [...slaTracking(), 'state', id] as const;
const slaTrackingEvents = (id: string) =>
  [...slaTracking(), 'events', id] as const;

const slaMetrics = (filters?: { domain?: string; startDate?: string; endDate?: string }) =>
  [...all, 'sla', 'metrics', filters ?? {}] as const;
const slaReportByIssueType = (filters?: { startDate?: string; endDate?: string }) =>
  [...all, 'sla', 'report', 'issueType', filters ?? {}] as const;

const csatMetricsWithFilters = (filters?: Record<string, unknown>) =>
  [...all, 'csat', 'metrics', filters ?? {}] as const;
const csatToken = (token: string) =>
  [...all, 'csat', 'token', token] as const;

const issueTemplatesPopular = (limit?: number) =>
  [...all, 'issueTemplates', 'popular', limit ?? 5] as const;

export const supportQueryKeys = {
  all,
  issuesList,
  issuesListFiltered,
  issueDetails,
  issueDetail,
  issueIntakePreview,
  rmasList,
  rmasListFiltered,
  rmaDetails,
  rmaDetail,
  kbCategories,
  kbCategoryList,
  kbCategoryDetails,
  kbCategoryDetail,
  kbArticles,
  kbArticleList,
  kbArticleDetails,
  kbArticleDetail,
  csatList,
  csatListFiltered,
  csatDetails,
  csatDetail,
  csatMetrics,
  supportMetrics,
  supportMetricsWithDates,
  issueTemplatesList,
  issueTemplatesListFiltered,
  issueTemplateDetails,
  issueTemplateDetail,
  popularTemplates,
  escalationRules,
  slaConfigurations,
  slaConfigurationsList,
  slaConfigurationDetail,
  slaConfigurationDefault,
  slaHasConfigurations,
  slaTracking,
  slaTrackingDetail,
  slaTrackingState,
  slaTrackingEvents,
  slaMetrics,
  slaReportByIssueType,
  csatMetricsWithFilters,
  csatToken,
  issueTemplatesPopular,
};
