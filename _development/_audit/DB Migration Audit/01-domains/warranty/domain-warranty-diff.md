# Domain: Warranty — Diff (PRD vs Drizzle)

## warranty_policies
- PRD expects `products.warrantyPolicyId` and `categories.defaultWarrantyPolicyId`; Drizzle warranty schema does not include those cross-domain fields.
- Drizzle adds `terms` JSONB and active/default flags; PRD aligns with SLA FK usage.

## warranties
- Drizzle adds `expiryAlertOptOut`, `lastExpiryAlertSent`, `certificateUrl`, `assignedUserId`, and transfer tracking fields beyond PRD.
- PRD expects warranty number generation; Drizzle stores number but generation logic not enforced at schema level.

## warranty_claims
- PRD expects `issueId` linkage; Drizzle warranty_claims does not include `issueId`.
- PRD defines resolution type `warranty_extension`; Drizzle includes this in enum and adds `slaTrackingId` for unified SLA.

## warranty_extensions
- PRD schema is minimal (months, reason, approvedBy); Drizzle adds extension types, price, and expiry tracking fields.

## Open Questions
- Should we add `issueId` to `warranty_claims` to align with support workflow linkage?
- Where should product/category warranty policy FKs live in Drizzle (`products`, `categories`)?
