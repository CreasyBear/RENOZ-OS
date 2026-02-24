/**
 * Stock Adjustment Form Schema
 *
 * Zod schema for the stock adjustment dialog.
 * Uses a factory to validate quantity against item.quantityOnHand for decreases.
 */

import { z } from "zod";

export interface StockAdjustmentItem {
  isSerialized?: boolean;
  quantityOnHand: number;
}

export const createStockAdjustmentFormSchema = (item: StockAdjustmentItem) =>
  z
    .object({
      adjustmentType: z.enum(["increase", "decrease"]),
      quantity: z.number().positive("Quantity must be greater than 0"),
      reason: z.string().min(1, "Reason is required"),
      notes: z.string().optional(),
    })
    .refine(
      (v) => {
        if (v.adjustmentType !== "decrease") return true;
        const qty = item.isSerialized ? 1 : v.quantity;
        return qty <= item.quantityOnHand;
      },
      {
        message: `Cannot decrease by more than current stock (${item.quantityOnHand} units)`,
        path: ["quantity"],
      }
    );

export type StockAdjustmentFormValues = z.infer<
  ReturnType<typeof createStockAdjustmentFormSchema>
>;
