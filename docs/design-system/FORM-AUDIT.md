# Form Audit: Bad Smells, Antipatterns & Debt

Comprehensive audit of all 57 TanStack forms against FORM-STANDARDS. Use this to prioritize cleanup and consistency work.

**Related:** [FORM-STANDARDS.md](./FORM-STANDARDS.md), [FORM-INVENTORY.md](./FORM-INVENTORY.md)

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Missing FormErrorSummary / submitError | ~35 forms | High |
| Raw Input/Select instead of shared fields | ~25 forms | Medium |
| Dialog forms not using FormDialog | ~40 forms | Medium |
| Duplicate implementations | 2 | Medium |
| Missing try/catch / server error handling | ~15 forms | High |
| Stale migration backlog in FORM-STANDARDS | 1 section | Low |

---

## 1. Server Error Handling (High Priority)

**Standard:** Parent onSubmit must catch mutation errors, toast, and pass `submitError` for inline display. Dialog must NOT close on failure.

### Forms with submitError / FormErrorSummary ✓

- `location-form.tsx` – Parent passes submitError
- `scheduled-report-form.tsx` – Parent passes submitError
- `target-form.tsx` – Parent passes submitError
- `order-edit-dialog.tsx` – Parent passes submitError
- `kb-category-form-dialog.tsx` – Parent passes submitError
- `inventory-item-edit-dialog.tsx` – Uses local submitError state
- `product-edit-dialog.tsx` – Uses local submitError state
- `forgot-password-form.tsx`, `reset-password-form.tsx` – Local submitError

### Forms likely missing submitError (dialogs with mutations)

| Form | Issue |
|------|-------|
| `attribute-definitions.tsx` | Try/catch in onSubmit ✓; no submitError prop for inline display |
| `attribute-value-editor.tsx` | Mutation in onSubmit; no submitError |
| `bundle-creator.tsx` | Try/catch ✓; no submitError |
| `customer-pricing.tsx` | Uses mutate() with onSuccess; no submitError on failure |
| `price-tiers.tsx` | Uses mutate() with onSuccess; no submitError |
| `stock-adjustment.tsx` | Try/catch ✓; no submitError |
| `alert-config-form.tsx` | Parent handles; no submitError prop |
| `project-completion-dialog.tsx` | Try/catch ✓; no submitError |
| `receiving-form.tsx` | Parent handles; no submitError |
| `communication-preferences.tsx` | Uses mutate with onError toast; no inline submitError |
| `template-editor.tsx` (both) | Mutations with onError toast; no submitError |
| `orders/template-editor.tsx` | onSubmit from parent; depends on parent |
| `call-outcome-dialog.tsx` | Uses mutate with onError; no submitError (form stays open ✓) |
| `schedule-call-dialog.tsx` | Similar pattern |
| `add-suppression-dialog.tsx` | Similar pattern |

**Antipattern:** Using `mutate()` with `onError` toasts but not passing `submitError` to the form. User gets a toast but no inline error in the form.

---

## 2. Raw Fields vs Shared Components (Medium Priority)

**Standard:** Use TextField, NumberField, SelectField, etc. from `@/components/shared/forms` for consistency and FormFieldDisplayProvider integration.

### Forms using shared fields ✓

- `product-form.tsx`, `customer-form.tsx`, `order-creation-wizard.tsx`
- `order-edit-dialog.tsx`, `ship-order-dialog.tsx`, `create-po-from-alert-dialog.tsx`
- `project-create-dialog.tsx`, `project-edit-dialog.tsx`, `task-dialogs.tsx`
- `kb-category-form-dialog.tsx`, `kb-article-form-dialog.tsx`
- `address-manager.tsx`, `contact-manager.tsx`
- `profile-form.tsx`, `won-lost-dialog.tsx`
- Auth forms (login, sign-up, etc.)

### Forms using raw Input/Select/Textarea (manual form.Field)

| Form | Debt |
|------|------|
| `attribute-definitions.tsx` | All raw Input, Select, Checkbox, Textarea |
| `attribute-value-editor.tsx` | Raw inputs |
| `bundle-creator.tsx` | Raw Input, Textarea, Switch |
| `customer-pricing.tsx` | Raw Input, Calendar |
| `price-tiers.tsx` | Raw Input, Switch |
| `stock-adjustment.tsx` | Raw inputs |
| `alert-config-form.tsx` | Raw inputs |
| `location-form.tsx` | Raw inputs |
| `receiving-form.tsx` | Raw inputs |
| `project-completion-dialog.tsx` | Raw inputs |
| `orders/template-editor.tsx` | Raw Input, Textarea, Select, Switch |
| `communications/template-editor.tsx` | Raw Input, Textarea, Select, Switch |
| `communication-preferences.tsx` | Raw Checkbox |
| `category-editor.tsx` | Mix of TextField and raw |
| `image-editor.tsx` | Mix |

**Bad smell:** Inconsistent UX (error display timing, styling) and more boilerplate per field.

---

## 3. Dialog Forms Not Using FormDialog (Medium Priority)

**Standard:** Use FormDialog for modal forms; it wraps FormFieldDisplayProvider and FormErrorSummary.

### Forms using FormDialog ✓

- `kb-category-form-dialog.tsx`, `kb-article-form-dialog.tsx`
- `warranty-policy-form-dialog.tsx`, `warranty-claim-form-dialog.tsx`
- `serialized-item-form-dialog.tsx`, `job-template-form-dialog.tsx`, `issue-template-form-dialog.tsx`
- `address-manager` (AddressFormDialog), `contact-manager` (ContactFormDialog)

### Forms using raw Dialog + manual form

Most dialog forms use `<Dialog>` + `<form>` + manual FormFieldDisplayProvider instead of FormDialog:

- `attribute-definitions`, `attribute-value-editor`, `bundle-creator`
- `customer-pricing`, `price-tiers`, `stock-adjustment`
- `alert-config-form`, `location-form`, `project-completion-dialog`
- `record-payment-dialog`, `ship-order-dialog`, `stock-adjustment-dialog`, `stock-transfer-dialog`
- `create-po-from-alert-dialog`, `create-po-from-recommendation-dialog`
- `call-outcome-dialog`, `schedule-call-dialog`, `add-suppression-dialog`
- `product-edit-dialog`, `inventory-item-edit-dialog`, `image-editor`
- `category-editor`, `order-edit-dialog`
- All job dialogs (task, note, workstream, bom, file, customer-sign-off, site-visit, project-create, project-edit)
- `won-lost-dialog`, `installers-page`

**Debt:** Each has duplicated structure (DialogContent, FormFieldDisplayProvider, form, submit/cancel buttons). FormDialog would reduce boilerplate and enforce consistency.

---

## 4. Duplicate Implementations (Medium Priority)

### Communications template editor – two implementations

| File | Used by | Notes |
|------|---------|------|
| `communications/template-editor.tsx` | `templates-list.tsx` (imports `./template-editor`) | Standalone, full implementation |
| `communications/template-editor/index.tsx` | Possibly dead or alternate entry | Uses `use-template-editor` hook, TemplateSettings |

**Resolution:** Module resolution `./template-editor` typically resolves to `template-editor.tsx` (file) before `template-editor/index.tsx` (folder). Verify which is actually used; consider consolidating or removing the unused one.

---

## 5. Pending Guards (Low–Medium Priority)

**Standard:** Use `createPendingDialogInteractionGuards(isSubmitting)` and `createPendingDialogOpenChangeHandler` so users cannot close the dialog while submitting.

### Forms with pending guards ✓

Many dialogs use these (see grep count ~70 usages). Spot-check: `attribute-definitions`, `bundle-creator`, `customer-pricing`, `price-tiers`, `call-outcome-dialog`, `location-form` all use them.

### Forms that may lack guards

- Inline forms (no dialog) – N/A
- Sheet forms – Check FormSheet / target-form, scheduled-report-form

---

## 6. Form Reset & Close Behavior

**Standard:** Reset only on success or cancel. Do NOT close dialog on mutation failure.

### Correct patterns ✓

- `call-outcome-dialog.tsx` – `handleOpenChange(false)` only in onSuccess; onError keeps form open
- `location-form` – Parent controls; try/catch keeps form open on failure

### Risk areas

- Forms using `mutate()` with `onSuccess` to close: ensure they do NOT close on `onError`
- `communication-preferences` – No dialog; toggles call onToggle; form is display-only (resets from preferences)

---

## 7. useEffect + form.reset (Low Priority)

**Pattern:** Some forms sync external data into the form via `useEffect` + `form.reset`.

| Form | Pattern | Risk |
|------|---------|------|
| `communication-preferences.tsx` | `useEffect(() => { if (preferences) form.reset(...) }, [preferences, form])` | `form` in deps – form is stable; could cause unnecessary resets if form reference changes (unlikely) |

**Recommendation:** Prefer `form.reset` when opening the dialog with new data, rather than useEffect sync, when possible.

---

## 8. Array Field Conventions

**Standard:** Use bracket notation `items[0].quantity` for array indices.

### Compliance

- `orders/template-editor.tsx` – Uses `items[${index}].description` ✓
- `attribute-definitions.tsx` – Uses `choices[${index}].value` ✓
- `receiving-form.tsx` – Uses array fields with superRefine ✓

---

## 9. Stale Documentation

**FORM-STANDARDS.md §13 React Hook Form Migration Backlog** – Lists forms as RHF to migrate, but all have been migrated. This section is obsolete and should be removed or replaced with "All forms migrated (2026-02-22)."

---

## 10. Checklist: Forms to Prioritize for Cleanup

| Priority | Form(s) | Action |
|----------|---------|--------|
| High | Dialogs with mutations | Add submitError prop + FormErrorSummary where missing |
| High | customer-pricing, price-tiers | Add submitError; ensure form stays open on mutation failure |
| Medium | Recently converted forms (attribute-*, bundle-creator, customer-pricing, price-tiers, template-editors) | Replace raw Input/Select with TextField, NumberField, SelectField |
| Medium | All dialog forms | Evaluate FormDialog migration for consistency |
| Low | communication-preferences | Consider removing form if it's purely display (checkboxes call onToggle, never submit) |
| Low | Duplicate template-editor | Consolidate or document which implementation is canonical |

---

## 11. Quick Reference: FORM-STANDARDS Checklist

For each form, verify:

- [ ] useTanStackForm with schema and defaultValues
- [ ] FormFieldDisplayProvider (or FormDialog/FormSheet)
- [ ] onSubmitInvalid if form-level validation feedback needed
- [ ] Shared field components (TextField, NumberField, etc.)
- [ ] form.handleSubmit() on submit
- [ ] form.reset() on cancel/close
- [ ] Server errors: parent try/catch + toast; pass submitError for inline display
- [ ] Pending-close guards on dialogs
- [ ] Dialog closes only on success; form stays open on failure
