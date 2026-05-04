/**
 * Communications Inbox Server Functions
 *
 * Thin ServerFn boundary for the canonical inbox read.
 */
import { createServerFn } from "@tanstack/react-start";
import { withAuth } from "@/lib/server/protected";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  inboxListQuerySchema,
  type InboxListResult,
} from "@/lib/schemas/communications/inbox";
import { readInboxItems } from "./_shared/inbox-read";

export const listInboxItems = createServerFn({ method: "GET" })
  .inputValidator(inboxListQuerySchema)
  .handler(async ({ data }): Promise<InboxListResult> => {
    const ctx = await withAuth({ permission: PERMISSIONS.email.read });

    return readInboxItems(data, { organizationId: ctx.organizationId });
  });
