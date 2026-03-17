import { describe, expect, it } from "vitest";
import { generateReportResponseSchema } from "@/lib/schemas/reports/scheduled-reports";

describe("generateReportResponseSchema", () => {
  it("requires completed report metadata", () => {
    const parsed = generateReportResponseSchema.parse({
      status: "completed",
      reportUrl: "https://example.com/report.pdf",
      filename: "report.pdf",
      expiresAt: new Date().toISOString(),
      format: "pdf",
      generatedAt: new Date().toISOString(),
    });

    expect(parsed.status).toBe("completed");
    expect(parsed.filename).toBe("report.pdf");
  });
});
