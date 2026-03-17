import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { calculateEffectiveSupplierPrice } from "@/lib/suppliers/price-utils";
import { ValidationError } from "@/lib/server/errors";
import { products } from "drizzle/schema";
import { priceLists, suppliers } from "drizzle/schema/suppliers";

export type PriceImportResolutionStatus =
  | "resolved"
  | "unresolved_supplier"
  | "unresolved_product"
  | "ambiguous_product"
  | "duplicate_target";

export interface PriceImportResolution {
  status: PriceImportResolutionStatus;
  supplierId?: string;
  supplierName?: string;
  productId?: string;
  productName?: string;
  productSku?: string | null;
  existingPriceListId?: string;
  message?: string;
}

export function calculateEffectivePrice(params: {
  basePrice: number;
  discountType?: string | null;
  discountValue?: number | null;
}): number {
  return calculateEffectiveSupplierPrice(params);
}

export async function resolveSupplierByCode(params: {
  organizationId: string;
  supplierCode: string;
}): Promise<PriceImportResolution> {
  const [supplier] = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      supplierCode: suppliers.supplierCode,
    })
    .from(suppliers)
    .where(
      and(
        eq(suppliers.organizationId, params.organizationId),
        eq(suppliers.supplierCode, params.supplierCode),
        isNull(suppliers.deletedAt)
      )
    )
    .limit(1);

  if (!supplier) {
    return {
      status: "unresolved_supplier",
      message: `Supplier code "${params.supplierCode}" was not found`,
    };
  }

  return {
    status: "resolved",
    supplierId: supplier.id,
    supplierName: supplier.name,
  };
}

export async function resolveProductIdentity(params: {
  organizationId: string;
  productId?: string | null;
  productSku?: string | null;
  productName: string;
}): Promise<PriceImportResolution> {
  if (params.productId) {
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
      })
      .from(products)
      .where(
        and(
          eq(products.organizationId, params.organizationId),
          eq(products.id, params.productId),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!product) {
      return {
        status: "unresolved_product",
        message: `Product "${params.productId}" was not found`,
      };
    }

    return {
      status: "resolved",
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
    };
  }

  if (params.productSku?.trim()) {
    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
      })
      .from(products)
      .where(
        and(
          eq(products.organizationId, params.organizationId),
          eq(products.sku, params.productSku.trim()),
          isNull(products.deletedAt)
        )
      )
      .limit(1);

    if (!product) {
      return {
        status: "unresolved_product",
        message: `Product SKU "${params.productSku}" was not found`,
      };
    }

    return {
      status: "resolved",
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
    };
  }

  const matches = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
    })
    .from(products)
    .where(
      and(
        eq(products.organizationId, params.organizationId),
        sql`lower(${products.name}) = lower(${params.productName.trim()})`,
        isNull(products.deletedAt)
      )
    )
    .limit(2);

  if (matches.length === 0) {
    return {
      status: "unresolved_product",
      message: `Product name "${params.productName}" was not found`,
    };
  }

  if (matches.length > 1) {
    return {
      status: "ambiguous_product",
      message: `Product name "${params.productName}" matched multiple products`,
    };
  }

  return {
    status: "resolved",
    productId: matches[0].id,
    productName: matches[0].name,
    productSku: matches[0].sku,
  };
}

export async function findExistingPriceList(params: {
  organizationId: string;
  supplierId: string;
  productId: string;
  effectiveDate: string;
}) {
  const [existing] = await db
    .select({
      id: priceLists.id,
    })
    .from(priceLists)
    .where(
      and(
        eq(priceLists.organizationId, params.organizationId),
        eq(priceLists.supplierId, params.supplierId),
        eq(priceLists.productId, params.productId),
        eq(priceLists.effectiveDate, params.effectiveDate),
        eq(priceLists.isActive, true)
      )
    )
    .limit(1);

  return existing ?? null;
}

export async function resolveImportRow(params: {
  organizationId: string;
  supplierCode: string;
  productSku?: string | null;
  productName: string;
  effectiveDate: string;
}): Promise<PriceImportResolution> {
  const supplierResolution = await resolveSupplierByCode({
    organizationId: params.organizationId,
    supplierCode: params.supplierCode,
  });

  if (supplierResolution.status !== "resolved" || !supplierResolution.supplierId) {
    return supplierResolution;
  }

  const productResolution = await resolveProductIdentity({
    organizationId: params.organizationId,
    productSku: params.productSku,
    productName: params.productName,
  });

  if (productResolution.status !== "resolved" || !productResolution.productId) {
    return productResolution;
  }

  const existing = await findExistingPriceList({
    organizationId: params.organizationId,
    supplierId: supplierResolution.supplierId,
    productId: productResolution.productId,
    effectiveDate: params.effectiveDate,
  });

  return {
    status: existing ? "duplicate_target" : "resolved",
    supplierId: supplierResolution.supplierId,
    supplierName: supplierResolution.supplierName,
    productId: productResolution.productId,
    productName: productResolution.productName,
    productSku: productResolution.productSku,
    existingPriceListId: existing?.id,
    message: existing
      ? "An active price already exists for this supplier, product, and effective date"
      : undefined,
  };
}

export function assertResolvedResolution(
  resolution: PriceImportResolution
): asserts resolution is PriceImportResolution & {
  status: "resolved" | "duplicate_target";
  supplierId: string;
  productId: string;
} {
  if (!resolution.supplierId || !resolution.productId) {
    throw new ValidationError(resolution.message ?? "Price import row could not be resolved");
  }
}
