import { beforeEach, describe, expect, it, vi } from "vitest";

const dbState = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => dbState.rows,
        }),
      }),
    }),
  },
}));

import {
  renderOutboundEmail,
  TemplateUnresolvedError,
} from "@/lib/server/outbound-email";

describe("renderOutboundEmail", () => {
  beforeEach(() => {
    dbState.rows = [];
  });

  it("renders a direct template with canonical subject, signature injection, and test prefixing", async () => {
    const result = await renderOutboundEmail({
      organizationId: "org_123",
      directTemplate: {
        id: "template_123",
        version: 4,
        subject: "Welcome {{first_name}}",
        bodyHtml: "<p>Hello {{first_name}}</p>",
      },
      templateData: {
        signatureContent: "<p>Regards,<br />Renoz Team</p>",
        previewText: "Preview copy",
        trackOpens: false,
        trackClicks: true,
      },
      subject: "Custom hello {{first_name}}",
      variables: {
        first_name: "Jo",
      },
      testPrefix: "[TEST] ",
    });

    expect(result).toEqual({
      subject: "[TEST] Custom hello Jo",
      bodyHtml:
        '<p>Hello Jo</p><div data-email-signature="true"><p>Regards,<br />Renoz Team</p></div>',
      bodyText: "Hello Jo\n\nRegards,\nRenoz Team",
      previewText: "Preview copy",
      replyTo: null,
      priority: null,
      templateId: "template_123",
      templateVersion: 4,
      trackOpens: false,
      trackClicks: true,
    });
  });

  it("fails closed when a saved template cannot be resolved", async () => {
    await expect(
      renderOutboundEmail({
        organizationId: "org_123",
        templateType: "custom",
        templateData: {
          templateId: "missing-template-id",
        },
      })
    ).rejects.toBeInstanceOf(TemplateUnresolvedError);
  });

  it("ignores invalid template data fields and falls back to safe defaults", async () => {
    const result = await renderOutboundEmail({
      organizationId: "org_123",
      directTemplate: {
        subject: "Hello {{first_name}}",
        bodyHtml: "<p>Hi {{first_name}}</p>",
      },
      variables: {
        first_name: "Jo",
      },
      templateData: {
        priority: "urgent",
        trackOpens: "yes",
        trackClicks: 1,
        replyToOverride: 42,
        previewText: "Safe preview",
      },
    });

    expect(result.previewText).toBe("Safe preview");
    expect(result.priority).toBeNull();
    expect(result.replyTo).toBeNull();
    expect(result.trackOpens).toBe(true);
    expect(result.trackClicks).toBe(true);
  });
});
