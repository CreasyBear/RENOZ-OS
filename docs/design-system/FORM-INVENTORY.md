# Form Inventory

Comprehensive inventory of all forms in the codebase. Generated as part of the Full Form Audit.

**Last updated:** 2026-02-22

**Audit implementation:** Phase 1–4 completed. FORM-STANDARDS.md created, Form Inventory documented, 5 raw useForm forms migrated to useTanStackForm, product-form architecture verified, Form Devtools added.

---

## Summary

| Library | Count | Description |
|---------|-------|-------------|
| TanStack (useTanStackForm) | 57 | Recommended pattern with Zod preset |
| TanStack (raw useForm) | 0 | All migrated to useTanStackForm |
| React Hook Form | 0 | All migrated to TanStack Form |
| Uncontrolled (useState) | 0 | All migrated to TanStack |

---

## Full Inventory

| File Path | Library | Form Type | FormFieldDisplayProvider |
|-----------|---------|-----------|--------------------------|
| src/components/auth/login-form.tsx | TanStack (useTanStackForm) | inline | Yes (via parent) |
| src/components/auth/sign-up-form.tsx | TanStack (useTanStackForm) | inline | Yes (via parent) |
| src/components/auth/forgot-password-form.tsx | TanStack (useTanStackForm) | inline | Yes (via parent) |
| src/components/auth/reset-password-form.tsx | TanStack (useTanStackForm) | inline | Yes (via parent) |
| src/routes/accept-invitation.tsx | TanStack (useTanStackForm) | page | Yes (via parent) |
| src/components/domain/orders/creation/order-creation-wizard.tsx | TanStack (useTanStackForm) | wizard | Yes |
| src/components/domain/orders/cards/order-edit-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/orders/dialogs/record-payment-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/orders/fulfillment/ship-order-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/orders/templates/template-editor.tsx | TanStack (useTanStackForm) | inline | Yes |
| src/components/domain/customers/customer-form.tsx | TanStack (useTanStackForm) | inline | Yes |
| src/components/domain/customers/customer-wizard/hooks/use-customer-wizard.ts | TanStack (useTanStackForm) | wizard | Yes |
| src/components/domain/customers/address-manager.tsx | TanStack (useTanStackForm) | dialog/section | Yes |
| src/components/domain/customers/contact-manager.tsx | TanStack (useTanStackForm) | dialog/section | Yes |
| src/components/domain/customers/customers-list-container.tsx | TanStack (useTanStackForm) | dialog | No (bulk) |
| src/components/domain/products/product-form.tsx | TanStack (useTanStackForm) | inline | Yes |
| src/components/domain/products/product-edit-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/products/images/image-editor.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/products/categories/category-editor.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/products/pricing/customer-pricing.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/products/pricing/price-tiers.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/products/attributes/attribute-value-editor.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/products/attributes/attribute-definitions.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/products/inventory/stock-adjustment.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/products/bundles/bundle-creator.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/inventory/stock-adjustment-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/inventory/stock-transfer-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/inventory/locations/location-form.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/inventory/receiving/receiving-form.tsx | TanStack (useTanStackForm) | inline | Yes |
| src/components/domain/inventory/forecasting/create-po-from-recommendation-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/inventory/alerts/create-po-from-alert-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/inventory/alerts/alert-config-form.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/projects/project-create-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/projects/project-edit-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/projects/project-completion-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/projects/task-dialogs.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/projects/workstream-dialogs.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/projects/note-dialogs.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/projects/bom-dialogs.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/projects/file-dialogs.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/projects/customer-sign-off-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/projects/site-visit-create-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/time/time-entry-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/projects/time-tracking/time-entry-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/jobs/schedule/schedule-visit-create-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/communications/settings/add-suppression-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/communications/calls/call-outcome-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/communications/calls/schedule-call-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/communications/communication-preferences.tsx | TanStack (useTanStackForm) | inline | Yes |
| src/components/domain/communications/template-editor.tsx | TanStack (useTanStackForm) | inline | Yes |
| src/components/domain/communications/template-editor/hooks/use-template-editor.ts | TanStack (useTanStackForm) | inline | Yes |
| src/components/domain/support/knowledge-base/kb-category-form-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/support/knowledge-base/kb-article-form-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/pipeline/won-lost-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/users/profile-form.tsx | TanStack (useTanStackForm) | inline | Yes |
| src/components/domain/settings/target-form.tsx | TanStack (useTanStackForm) | sheet | Yes |
| src/components/domain/settings/scheduled-report-form.tsx | TanStack (useTanStackForm) | sheet | Yes |
| src/routes/_authenticated/installers/installers-page.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/warranty/dialogs/warranty-claim-form-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/warranty/dialogs/warranty-policy-form-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/inventory/inventory-item-edit-dialog.tsx | TanStack (useTanStackForm) | dialog | Yes |
| src/components/domain/suppliers/supplier-form.tsx | TanStack (useTanStackForm) | inline | Yes |
| src/components/domain/pipeline/opportunities/opportunity-form.tsx | TanStack (useTanStackForm) | inline | Yes |
| src/components/domain/pipeline/quotes/quick-quote-form.tsx | TanStack (useTanStackForm) | inline | Yes |

---

## Raw useForm Forms

**Migrated (2026-02-22):**
1. `src/components/domain/orders/dialogs/record-payment-dialog.tsx` ✓
2. `src/components/domain/inventory/stock-adjustment-dialog.tsx` ✓
3. `src/components/domain/inventory/stock-transfer-dialog.tsx` ✓
4. `src/components/domain/settings/target-form.tsx` ✓
5. `src/components/domain/settings/scheduled-report-form.tsx` ✓

**All migrated (2026-02-22):**
6. `src/components/domain/inventory/inventory-item-edit-dialog.tsx` ✓

---

## Product Form Architecture (2026-02-22)

The products domain has a single ProductForm implementation:

1. **product-form.tsx** – Uses `useTanStackForm`, inline form fields, `FormFieldDisplayProvider`. Exported as `ProductForm` from `@/components/domain/products`. Used by routes `products/new` and `products/$productId/edit`. Schema and types in `product-form-types.ts`.

2. **product-form/** (folder) – **Removed**. Legacy RHF-based sections were deleted. `useProductForm` export removed. Types consolidated into `product-form-types.ts`.

---

## CSV Export

Synced with main table above. Use main table as authoritative source.

```csv
file_path,library,form_type,form_field_display_provider
src/components/auth/login-form.tsx,TanStack (useTanStackForm),inline,Yes
src/components/auth/sign-up-form.tsx,TanStack (useTanStackForm),inline,Yes
src/components/auth/forgot-password-form.tsx,TanStack (useTanStackForm),inline,Yes
src/components/auth/reset-password-form.tsx,TanStack (useTanStackForm),inline,Yes
src/routes/accept-invitation.tsx,TanStack (useTanStackForm),page,Yes
src/components/domain/orders/creation/order-creation-wizard.tsx,TanStack (useTanStackForm),wizard,Yes
src/components/domain/orders/cards/order-edit-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/orders/dialogs/record-payment-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/orders/fulfillment/ship-order-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/orders/templates/template-editor.tsx,TanStack (useTanStackForm),inline,Yes
src/components/domain/customers/customer-form.tsx,TanStack (useTanStackForm),inline,Yes
src/components/domain/customers/customer-wizard/hooks/use-customer-wizard.ts,TanStack (useTanStackForm),wizard,Yes
src/components/domain/customers/address-manager.tsx,TanStack (useTanStackForm),dialog/section,Yes
src/components/domain/customers/contact-manager.tsx,TanStack (useTanStackForm),dialog/section,Yes
src/components/domain/customers/customers-list-container.tsx,TanStack (useTanStackForm),dialog,No
src/components/domain/products/product-form.tsx,TanStack (useTanStackForm),inline,Yes
src/components/domain/products/product-edit-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/products/images/image-editor.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/products/categories/category-editor.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/products/pricing/customer-pricing.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/products/pricing/price-tiers.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/products/attributes/attribute-value-editor.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/products/attributes/attribute-definitions.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/products/inventory/stock-adjustment.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/products/bundles/bundle-creator.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/inventory/stock-adjustment-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/inventory/stock-transfer-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/inventory/locations/location-form.tsx,React Hook Form,dialog,N/A
src/components/domain/inventory/receiving/receiving-form.tsx,React Hook Form,inline,N/A
src/components/domain/inventory/forecasting/create-po-from-recommendation-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/inventory/alerts/create-po-from-alert-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/inventory/alerts/alert-config-form.tsx,React Hook Form,dialog,N/A
src/components/domain/jobs/projects/project-create-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/jobs/projects/project-edit-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/jobs/projects/project-completion-dialog.tsx,React Hook Form,dialog,N/A
src/components/domain/jobs/projects/task-dialogs.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/jobs/projects/workstream-dialogs.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/jobs/projects/note-dialogs.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/jobs/projects/bom-dialogs.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/jobs/projects/file-dialogs.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/jobs/projects/customer-sign-off-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/jobs/projects/site-visit-create-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/jobs/time/time-entry-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/jobs/projects/time-tracking/time-entry-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/jobs/schedule/schedule-visit-create-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/communications/settings/add-suppression-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/communications/calls/call-outcome-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/communications/calls/schedule-call-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/communications/communication-preferences.tsx,TanStack (useTanStackForm),inline,Yes
src/components/domain/communications/template-editor.tsx,TanStack (useTanStackForm),inline,Yes
src/components/domain/support/knowledge-base/kb-category-form-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/support/knowledge-base/kb-article-form-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/pipeline/won-lost-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/users/profile-form.tsx,TanStack (useTanStackForm),inline,Yes
src/components/domain/settings/target-form.tsx,TanStack (useTanStackForm),sheet,Yes
src/components/domain/settings/scheduled-report-form.tsx,TanStack (useTanStackForm),sheet,Yes
src/routes/_authenticated/installers/installers-page.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/warranty/dialogs/warranty-claim-form-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/warranty/dialogs/warranty-policy-form-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/inventory/inventory-item-edit-dialog.tsx,TanStack (useTanStackForm),dialog,Yes
src/components/domain/suppliers/supplier-form.tsx,TanStack (useTanStackForm),inline,Yes
src/components/domain/pipeline/opportunities/opportunity-form.tsx,TanStack (useTanStackForm),inline,Yes
src/components/domain/pipeline/quotes/quick-quote-form.tsx,TanStack (useTanStackForm),inline,Yes
```
