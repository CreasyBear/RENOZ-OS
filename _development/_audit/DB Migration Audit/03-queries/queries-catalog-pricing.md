# Queries — Catalog & Pricing (Products, Suppliers)

## Products
- Product list by category/status/type with search and tags.
- Product detail: images, attributes, relations, bundles.
- Price history and tiered pricing by product.

## Suppliers & Procurement
- Supplier list by status/type/rating with tags.
- Purchase orders by status/supplier/date.
- PO detail: items, receipts, approvals, amendments, costs.
- Supplier price lists by product/supplier with effective date filters.

## Notes on query patterns
- Heavy use of `organizationId` plus `productId` or `supplierId`.
- Pricing data requires effective date ordering and active flags.
