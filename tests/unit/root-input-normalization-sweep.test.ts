import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { listSuppliersSchema } from '@/lib/schemas/suppliers';
import {
  inventoryValuationQuerySchema,
  locationListQuerySchema,
} from '@/lib/schemas/inventory/inventory';
import {
  opportunityListQuerySchema,
  pipelineMetricsQuerySchema,
  forecastQuerySchema,
  revenueAttributionQuerySchema,
  velocityQuerySchema,
  listOpportunityActivitiesQuerySchema,
} from '@/lib/schemas/pipeline/pipeline';
import { productListQuerySchema } from '@/lib/schemas/products/products';
import {
  creditNoteListQuerySchema,
} from '@/lib/schemas/financial/credit-notes';
import {
  financialDashboardQuerySchema,
  revenueByPeriodQuerySchema,
  topCustomersQuerySchema,
  outstandingInvoicesQuerySchema,
} from '@/lib/schemas/financial/financial-dashboard';
import { listRmasSchema } from '@/lib/schemas/support/rma';
import { userListQuerySchema } from '@/lib/schemas/auth/auth';
import { listCustomReportsSchema } from '@/lib/schemas/reports/custom-reports';
import { projectListQuerySchema } from '@/lib/schemas/jobs/projects';
import {
  customerActivityFilterSchema,
  customerHealthMetricFilterSchema,
  customerMergeAuditFilterSchema,
} from '@/lib/schemas/customers/customers';
import { getScheduledEmailsSchema } from '@/lib/schemas/communications/scheduled-emails';
import { getScheduledCallsSchema } from '@/lib/schemas/communications/scheduled-calls';
import {
  getCampaignsSchema,
  getCampaignRecipientsSchema,
} from '@/lib/schemas/communications/email-campaigns';
import { listScheduledReportsSchema } from '@/lib/schemas/reports/scheduled-reports';
import { serializedItemListQuerySchema } from '@/lib/schemas/inventory/serialized-items';
import { NotificationListQuerySchema } from '@/lib/schemas/communications/notifications';
import { listReportFavoritesSchema } from '@/lib/schemas/reports/report-favorites';
import { suppressionListFiltersSchema } from '@/lib/schemas/communications/email-suppression';
import { listPendingApprovalsSchema } from '@/lib/schemas/approvals';
import { getIssuesSchema } from '@/lib/schemas/support/issues';
import {
  entityActivitiesQuerySchema,
  userActivitiesQuerySchema,
} from '@/lib/schemas/activities/activities';
import { siteVisitListQuerySchema } from '@/lib/schemas/jobs/site-visits';
import { listCategoriesSchema, listArticlesSchema } from '@/lib/schemas/support/knowledge-base';
import { listWarrantyClaimsSchema } from '@/lib/schemas/warranty/claims';
import { listWarrantyExtensionsSchema } from '@/lib/schemas/warranty/extensions';
import { warrantyAnalyticsFilterSchema } from '@/lib/schemas/warranty/analytics';
import { listInvoicesBySyncStatusSchema } from '@/lib/schemas/settings/xero-sync';
import { getSlaConfigurationsSchema } from '@/lib/schemas/support/sla';
import { listTargetsCursorSchema } from '@/lib/schemas/reports/targets';
import { listNotificationsInputSchema } from '@/lib/schemas/notifications/notification';
import { listCustomFieldsSchema } from '@/lib/schemas/settings/settings';
import { searchQuerySchema, listRecentItemsSchema } from '@/lib/schemas/search/search';
import { listJobTasksSchema } from '@/lib/schemas/jobs/job-tasks';
import { listRecentBulkOperationsSchema } from '@/lib/schemas/customers/rollback';
import { listAttachmentsQuerySchema } from '@/lib/schemas/files/files';
import { EmailHistoryFilterSchema } from '@/lib/schemas/communications/email-history';
import { listIssueTemplatesSchema } from '@/lib/schemas/support/issue-templates';
import { getWarrantyPoliciesSchema } from '@/lib/schemas/warranty/policies';
import {
  warrantyFiltersSchema,
  getExpiringWarrantiesSchema,
  getExpiringWarrantiesReportSchema,
} from '@/lib/schemas/warranty/warranties';
import {
  arAgingCustomerDetailQuerySchema,
  arAgingReportQuerySchema,
} from '@/lib/schemas/financial/ar-aging';
import { listChecklistTemplatesSchema } from '@/lib/schemas/jobs/checklists';
import { listPurchaseOrdersSchema } from '@/lib/schemas/purchase-orders';
import {
  idParamQuerySchema,
  paginationQuerySchema,
} from '@/lib/schemas/_shared/patterns';
import { cursorPaginationQuerySchema } from '@/lib/db/pagination';
import { customerDetailParamsSchema } from '@/lib/schemas/customers/customer-detail-extended';
import { getWarrantyClaimSchema } from '@/lib/schemas/warranty/claims';
import { orderParamsSchema } from '@/lib/schemas/orders/orders';
import { activityParamsSchema } from '@/lib/schemas/activities/activities';
import { customerParamsSchema } from '@/lib/schemas/customers/customers';
import { getPreferencesSchema } from '@/lib/schemas/users/users';
import { getCsatMetricsSchema } from '@/lib/schemas/support/csat-responses';

function expectNoRootObjectError(result: z.ZodSafeParseResult<unknown>) {
  if (result.success) {
    throw new Error('Expected schema parse to fail');
  }

  expect(result.error.issues.some((issue) => issue.path.length === 0)).toBe(false);
}

describe('root input normalization sweep', () => {
  it('defaults omitted financial dashboard input', () => {
    expect(financialDashboardQuerySchema.parse(undefined)).toEqual({
      includePreviousPeriod: false,
    });
  });

  it('defaults omitted top customers input', () => {
    expect(topCustomersQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
      commercialOnly: false,
      basis: 'invoiced',
    });
  });

  it('defaults omitted outstanding invoices input', () => {
    expect(outstandingInvoicesQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
      overdueOnly: false,
      customerType: 'all',
    });
  });

  it('defaults omitted supplier list input', () => {
    expect(listSuppliersSchema.parse(undefined)).toEqual({
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      pageSize: 20,
    });
  });

  it('defaults omitted inventory location list input', () => {
    expect(locationListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted inventory valuation input', () => {
    expect(inventoryValuationQuerySchema.parse(undefined)).toEqual({
      valuationMethod: 'fifo',
    });
  });

  it('defaults omitted opportunity list input', () => {
    expect(opportunityListQuerySchema.parse(undefined)).toEqual({
      includeWonLost: false,
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted shared pagination input', () => {
    expect(paginationQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted shared cursor pagination input', () => {
    expect(cursorPaginationQuerySchema.parse(undefined)).toEqual({
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted pipeline metrics input', () => {
    expect(pipelineMetricsQuerySchema.parse(undefined)).toEqual({});
  });

  it('defaults omitted customer activity filter input', () => {
    expect(customerActivityFilterSchema.parse(undefined)).toEqual({});
  });

  it('defaults omitted customer merge audit filter input', () => {
    expect(customerMergeAuditFilterSchema.parse(undefined)).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it('defaults omitted product list input', () => {
    expect(productListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted credit note list input', () => {
    expect(creditNoteListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted RMA list input', () => {
    expect(listRmasSchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted user list input', () => {
    expect(userListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
    });
  });

  it('defaults omitted user preferences filter input', () => {
    expect(getPreferencesSchema.parse(undefined)).toEqual({});
  });

  it('defaults omitted CSAT metrics filter input', () => {
    expect(getCsatMetricsSchema.parse(undefined)).toEqual({});
  });

  it('does not fail at the root for shared id params', () => {
    expectNoRootObjectError(idParamQuerySchema.safeParse(undefined));
  });

  it('does not fail at the root for customer detail params', () => {
    expectNoRootObjectError(customerDetailParamsSchema.safeParse(undefined));
  });

  it('does not fail at the root for customer params aliases', () => {
    expectNoRootObjectError(customerParamsSchema.safeParse(undefined));
  });

  it('does not fail at the root for activity params aliases', () => {
    expectNoRootObjectError(activityParamsSchema.safeParse(undefined));
  });

  it('does not fail at the root for order params', () => {
    expectNoRootObjectError(orderParamsSchema.safeParse(undefined));
  });

  it('does not fail at the root for warranty claim params', () => {
    expectNoRootObjectError(getWarrantyClaimSchema.safeParse(undefined));
  });

  it('defaults omitted custom report list input', () => {
    expect(listCustomReportsSchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it('defaults omitted project list input', () => {
    expect(projectListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted scheduled email list input', () => {
    expect(getScheduledEmailsSchema.parse(undefined)).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it('defaults omitted scheduled call list input', () => {
    expect(getScheduledCallsSchema.parse(undefined)).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it('defaults omitted campaign list input', () => {
    expect(getCampaignsSchema.parse(undefined)).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it('defaults omitted scheduled report list input', () => {
    expect(listScheduledReportsSchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted serialized item list input', () => {
    expect(serializedItemListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted notification list input', () => {
    expect(NotificationListQuerySchema.parse(undefined)).toEqual({
      pageSize: 20,
    });
  });

  it('defaults omitted report favorites list input', () => {
    expect(listReportFavoritesSchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 50,
    });
  });

  it('defaults omitted suppression list input', () => {
    expect(suppressionListFiltersSchema.parse(undefined)).toEqual({
      includeDeleted: false,
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted pending approvals list input', () => {
    expect(listPendingApprovalsSchema.parse(undefined)).toEqual({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      pageSize: 20,
    });
  });

  it('defaults omitted issue list input', () => {
    expect(getIssuesSchema.parse(undefined)).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it('defaults omitted KB category list input', () => {
    expect(listCategoriesSchema.parse(undefined)).toEqual({
      includeArticleCount: false,
    });
  });

  it('defaults omitted KB article list input', () => {
    expect(listArticlesSchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted warranty claim list input', () => {
    expect(listWarrantyClaimsSchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'submittedAt',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted Xero sync list input', () => {
    expect(listInvoicesBySyncStatusSchema.parse(undefined)).toEqual({
      errorsOnly: false,
      page: 1,
      pageSize: 20,
    });
  });

  it('defaults omitted SLA configuration list input', () => {
    expect(getSlaConfigurationsSchema.parse(undefined)).toEqual({
      includeDefaults: true,
    });
  });

  it('defaults omitted targets cursor input', () => {
    expect(listTargetsCursorSchema.parse(undefined)).toEqual({
      pageSize: 20,
      sortOrder: 'desc',
    });
  });

  it('defaults omitted notification list input in notifications domain', () => {
    expect(listNotificationsInputSchema.parse(undefined)).toEqual({
      limit: 20,
    });
  });

  it('defaults omitted recent bulk operations input', () => {
    expect(listRecentBulkOperationsSchema.parse(undefined)).toEqual({
      limit: 10,
      hours: 24,
    });
  });

  it('defaults omitted attachment list input', () => {
    expect(listAttachmentsQuerySchema.parse(undefined)).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it('defaults omitted email history filter input', () => {
    expect(EmailHistoryFilterSchema.parse(undefined)).toEqual({});
  });

  it('defaults omitted warranty analytics input', () => {
    expect(warrantyAnalyticsFilterSchema.parse(undefined)).toEqual({
      warrantyType: 'all',
      claimType: 'all',
    });
  });

  it('defaults omitted recent items input', () => {
    expect(listRecentItemsSchema.parse(undefined)).toEqual({
      limit: 20,
    });
  });

  it('defaults omitted site visit list input', () => {
    expect(siteVisitListQuerySchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'scheduledDate',
      sortOrder: 'asc',
    });
  });

  it('does not fail at the root for revenue by period input', () => {
    expectNoRootObjectError(revenueByPeriodQuerySchema.safeParse(undefined));
  });

  it('does not fail at the root for customer health metric input', () => {
    expectNoRootObjectError(customerHealthMetricFilterSchema.safeParse(undefined));
  });

  it('does not fail at the root for campaign recipients input', () => {
    expectNoRootObjectError(getCampaignRecipientsSchema.safeParse(undefined));
  });

  it('does not fail at the root for forecast input', () => {
    expectNoRootObjectError(forecastQuerySchema.safeParse(undefined));
  });

  it('does not fail at the root for revenue attribution input', () => {
    expectNoRootObjectError(revenueAttributionQuerySchema.safeParse(undefined));
  });

  it('does not fail at the root for entity activities input', () => {
    expectNoRootObjectError(entityActivitiesQuerySchema.safeParse(undefined));
  });

  it('does not fail at the root for user activities input', () => {
    expectNoRootObjectError(userActivitiesQuerySchema.safeParse(undefined));
  });

  it('does not fail at the root for custom fields input', () => {
    expectNoRootObjectError(listCustomFieldsSchema.safeParse(undefined));
  });

  it('does not fail at the root for search input', () => {
    expectNoRootObjectError(searchQuerySchema.safeParse(undefined));
  });

  it('does not fail at the root for job tasks input', () => {
    expectNoRootObjectError(listJobTasksSchema.safeParse(undefined));
  });

  it('does not fail at the root for warranty extensions input', () => {
    expectNoRootObjectError(listWarrantyExtensionsSchema.safeParse(undefined));
  });

  // Plan: schema root-input cleanup (explicit spec batches A–E)
  it('defaults omitted issue template list input', () => {
    expect(listIssueTemplatesSchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'usageCount',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted warranty policies list input', () => {
    expect(getWarrantyPoliciesSchema.parse(undefined)).toEqual({
      includeDefaults: true,
    });
  });

  it('defaults omitted warranty filters input', () => {
    expect(warrantyFiltersSchema.parse(undefined)).toEqual({
      limit: 50,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('defaults omitted expiring warranties input', () => {
    expect(getExpiringWarrantiesSchema.parse(undefined)).toEqual({
      days: 30,
      limit: 10,
      sortOrder: 'asc',
    });
  });

  it('defaults omitted expiring warranties report input', () => {
    expect(getExpiringWarrantiesReportSchema.parse(undefined)).toEqual({
      days: 30,
      status: 'active',
      sortBy: 'expiry_asc',
      page: 1,
      limit: 20,
    });
  });

  it('normalizes omitted AR aging report input like empty object', () => {
    expect(arAgingReportQuerySchema.parse(undefined)).toEqual(arAgingReportQuerySchema.parse({}));
  });

  it('does not fail at the root for AR aging customer detail input', () => {
    expectNoRootObjectError(arAgingCustomerDetailQuerySchema.safeParse(undefined));
  });

  it('defaults omitted checklist templates list input', () => {
    expect(listChecklistTemplatesSchema.parse(undefined)).toEqual({
      includeInactive: false,
    });
  });

  it('defaults omitted lib purchase order list input', () => {
    expect(listPurchaseOrdersSchema.parse(undefined)).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('normalizes omitted pipeline velocity input like empty object', () => {
    expect(velocityQuerySchema.parse(undefined)).toEqual(velocityQuerySchema.parse({}));
  });

  it('normalizes omitted opportunity activities list input like empty object', () => {
    expect(listOpportunityActivitiesQuerySchema.parse(undefined)).toEqual(
      listOpportunityActivitiesQuerySchema.parse({})
    );
  });
});
