/**
 * Email suppression ServerFn facade.
 *
 * Public ServerFns own auth and schema validation only. Shared helpers own
 * suppression reads, mutations, and bounce policy so jobs and provider flows
 * never depend on ServerFn modules.
 */

import { createServerFn } from "@tanstack/react-start";
import { normalizeObjectInput } from "@/lib/schemas/_shared/patterns";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { withAuth } from "@/lib/server/protected";
import {
  addSuppressionSchema,
  checkSuppressionBatchSchema,
  checkSuppressionSchema,
  removeSuppressionSchema,
  suppressionListCursorSchema,
  suppressionListFiltersSchema,
  type CheckSuppressionBatchResult,
  type CheckSuppressionResult,
  type SuppressionListResult,
  type SuppressionRecord,
} from "@/lib/schemas/communications/email-suppression";
import {
  checkSuppressionBatchDirect,
  isEmailSuppressedDirect,
  readEmailSuppressionStatus,
  readSuppressionBatchStatus,
  readSuppressionList,
  readSuppressionListCursor,
} from "./_shared/suppression-read";
import {
  addSuppressionDirect,
  addSuppressionRecord,
  removeSuppressionRecord,
} from "./_shared/suppression-mutations";
import { trackSoftBounce } from "./_shared/suppression-policy";

export const getSuppressionList = createServerFn({ method: "GET" })
  .inputValidator(suppressionListFiltersSchema)
  .handler(async ({ data }): Promise<SuppressionListResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.read });
    return readSuppressionList(ctx.organizationId, data);
  });

export const getSuppressionListCursor = createServerFn({ method: "GET" })
  .inputValidator(suppressionListCursorSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.read });
    return readSuppressionListCursor(ctx.organizationId, data);
  });

export const isEmailSuppressed = createServerFn({ method: "GET" })
  .inputValidator(normalizeObjectInput(checkSuppressionSchema))
  .handler(async ({ data }): Promise<CheckSuppressionResult> => {
    const ctx = await withAuth();
    return readEmailSuppressionStatus(ctx.organizationId, data);
  });

export const checkSuppressionBatch = createServerFn({ method: "POST" })
  .inputValidator(checkSuppressionBatchSchema)
  .handler(async ({ data }): Promise<CheckSuppressionBatchResult> => {
    const ctx = await withAuth();
    return readSuppressionBatchStatus(ctx.organizationId, data);
  });

export const addSuppression = createServerFn({ method: "POST" })
  .inputValidator(addSuppressionSchema)
  .handler(async ({ data }): Promise<SuppressionRecord> => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });
    return addSuppressionRecord({ organizationId: ctx.organizationId, data });
  });

export const removeSuppression = createServerFn({ method: "POST" })
  .inputValidator(removeSuppressionSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const ctx = await withAuth({ permission: PERMISSIONS.settings.update });
    return removeSuppressionRecord({
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      data,
    });
  });

export {
  addSuppressionDirect,
  checkSuppressionBatchDirect,
  isEmailSuppressedDirect,
  trackSoftBounce,
};
