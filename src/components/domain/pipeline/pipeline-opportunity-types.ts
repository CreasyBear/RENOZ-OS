import type { Opportunity } from "@/lib/schemas/pipeline";

export type PipelineOpportunityItem = Pick<
  Opportunity,
  | "id"
  | "title"
  | "description"
  | "customerId"
  | "stage"
  | "value"
  | "probability"
  | "daysInStage"
> & {
  expectedCloseDate: Date | string | null;
  quoteExpiresAt: Date | string | null;
};
