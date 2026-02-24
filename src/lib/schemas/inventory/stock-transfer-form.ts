/**
 * Stock Transfer Form Schema
 *
 * Zod schema for the stock transfer dialog.
 */

import { z } from "zod";

export const stockTransferFormSchema = z.object({
  toLocationId: z.string().min(1, "Destination location is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  reason: z.string().optional(),
});

export type StockTransferFormValues = z.infer<typeof stockTransferFormSchema>;
