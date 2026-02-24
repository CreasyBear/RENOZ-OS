# Form Standards

Canonical form implementation patterns for the Renoz v3 codebase. All new forms and form migrations should follow these standards.

**Related:** [FORM-INVENTORY.md](./FORM-INVENTORY.md), [STANDARDS.md](../STANDARDS.md), [CLAUDE.md](../../CLAUDE.md)

---

## 1. Form Library

**Use TanStack Form** via `useTanStackForm` from `@/hooks/_shared/use-tanstack-form`.

- Do not use raw `useForm` from `@tanstack/react-form` directly.
- **No new React Hook Form.** Do not create new RHF forms; migrate existing RHF forms when touching them.

---

## 2. Validation

- **Zod schemas** for all form validation. Define schemas in `src/lib/schemas/{domain}/` or colocate when form-specific.
- Pass `schema` and `defaultValues` to `useTanStackForm`.
- Validation runs **on submit** by default. For real-time feedback, use per-field `validators`:

```tsx
<form.Field
  name="email"
  validators={{
    onChange: ({ value }) => (!value.includes('@') ? 'Invalid email' : undefined),
  }}
>
  {(field) => <TextField field={field} label="Email" />}
</form.Field>
```

- Use `validateOnChange` or `validateOnBlur` only when needed; prefer per-field validators for performance.

---

## 3. Error Display

- **FormFieldDisplayProvider** – Wrap form content so field components know when to show errors (after submit attempt).
- **onSubmitInvalid** – Provide when you need form-level feedback (e.g. toast, scroll to first error). `focusFirstInvalidField()` is called automatically.
- **FormErrorSummary** – Use for server/submit errors. Pass `submitError={mutation.error?.message}` when parent catches mutation failure.
- Use **shared field components** (TextField, NumberField, SelectField, etc.) from `@/components/shared/forms`; they integrate with FormFieldDisplayProvider.

```tsx
<FormFieldDisplayProvider form={form}>
  <FormErrorSummary form={form} submitError={submitError} />
  <form.Field name="name">
    {(field) => <TextField field={field} label="Name" required />}
  </form.Field>
</FormFieldDisplayProvider>
```

---

## 4. Server Error Handling (Avoid Form Frustration)

**Form frustration** = validation unclear, errors not surfaced, form closes on failure, no reset on cancel, stuck pending states.

### Parent onSubmit Must Catch Mutation Errors

```tsx
const handleFormSubmit = useCallback(
  async (data: CreateXInput) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
      // Do NOT close form – user can retry
    }
  },
  [editing, createMutation, updateMutation]
);
```

### Pass submitError for Inline Display

When the parent catches and toasts, also pass the error to the form for inline display:

```tsx
<XForm
  submitError={(createMutation.error ?? updateMutation.error)?.message ?? null}
  onSubmit={handleFormSubmit}
  ...
/>
```

### Antipatterns to Avoid

1. **No try/catch in parent onSubmit** – Mutation throws → unhandled rejection → no user feedback.
2. **Dialog closes before mutation settles** – Close only on success; keep form open on failure.
3. **Form reset on failure** – Reset only on success or cancel; keep form populated on failure so user can retry.
4. **Mutation without error handling** – User gets no feedback when mutation fails.

---

## 5. Dialog Forms

- Use **FormDialog** from `@/components/shared/forms/form-dialog` for modal forms.
- FormDialog wraps children with FormFieldDisplayProvider and FormErrorSummary.
- Pass `form` (from useTanStackForm), `submitLabel`, `cancelLabel`, and optionally `submitError` (from mutation).

```tsx
<FormDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Create Customer"
  description="Enter customer details below"
  form={form}
  submitLabel="Create"
  submitError={mutation.error?.message ?? null}
>
  <form.Field name="name">
    {(field) => <TextField field={field} label="Name" required />}
  </form.Field>
</FormDialog>
```

- For **Sheet** forms (slide-out panels), use **FormSheet** or add `FormErrorSummary` + `submitError` manually.

---

## 6. Multi-Step Forms (Wizards)

- Use **FormWizard** from `@/components/shared/forms/form-wizard`.
- Parent form's `onSubmit` handles submit; steps use `form.Field` for fields.
- For step-level validation and navigation on invalid submit, use `getStepFromValidationError` (or equivalent) to map Zod errors to steps and navigate.

---

## 7. Field Naming

- Use **bracket notation** for array indices: `lineItems[0].quantity`, not `lineItems.0.quantity`.
- TanStack Form expects this format for nested array errors from Zod.

---

## 8. Submission

- Call `form.handleSubmit()` on form submit. Do not call `onSubmit` directly.
- Use `form.state.isSubmitting` and `form.state.canSubmit` for button disabled/loading states when the form owns submit.
- For external submit state (e.g. mutation), pass `isSubmitting` as a prop and use it for guards.

---

## 9. Reset and Close

- Use `form.reset()` when closing/canceling to clear form state.
- FormDialog resets on close when `resetOnClose={true}` (default).
- **Pending-close guards** – Use `createPendingDialogInteractionGuards(isSubmitting)` and `createPendingDialogOpenChangeHandler` so users cannot close the dialog while submitting.

---

## 10. Optional TanStack Features

- **form.Subscribe** – For reactive UI that depends on form state (e.g. derived totals, conditional sections).
- **form.useWatch** – For watching specific field values (via useTanStackForm's `useWatch`).
- **listeners** – For side effects when a field changes (e.g. reset dependent field when country changes).
- **onChangeListenTo** – For cross-field validation (e.g. password/confirm).
- **onSubmitMeta** – For multiple submit actions (e.g. "Place order" vs "Save draft").

---

## 11. Form Devtools

TanStack Form Devtools are enabled in development. Use the TanStack Devtools panel (bottom-right in dev) and select the "Form" plugin to inspect form state, fields, and validation.

---

## 12. Reference Implementations

Forms that follow all checklist items:

| Form | Notes |
|------|-------|
| `product-form.tsx` | useTanStackForm, FormFieldDisplayProvider, onSubmitInvalid, shared fields |
| `product-edit-dialog.tsx` | FormDialog, submitError, onSubmitInvalid |
| `order-edit-dialog.tsx` | FormDialog, submitError, onSubmitInvalid |
| `record-payment-dialog.tsx` | FormDialog, onSubmitInvalid |
| `stock-adjustment-dialog.tsx` | FormDialog, onSubmitInvalid |
| `stock-transfer-dialog.tsx` | FormDialog, onSubmitInvalid |
| `kb-category-form-dialog.tsx` | FormDialog, submitError, onSubmitInvalid |
| `customer-form.tsx` | FormFieldDisplayProvider, onSubmitInvalid, shared fields |
| `project-create-dialog.tsx`, `project-edit-dialog.tsx` | FormDialog, onSubmitInvalid |
| `target-form.tsx`, `scheduled-report-form.tsx` | Sheet + FormErrorSummary, submitError |
| `inventory-item-edit-dialog.tsx` | useTanStackForm, FormFieldDisplayProvider, pending guards |

---

## 13. Migration Status

All forms use TanStack Form (migration completed 2026-02-22). No React Hook Form forms remain.

---

## 14. Checklist for New Forms

- [ ] useTanStackForm with schema and defaultValues
- [ ] FormFieldDisplayProvider (or FormDialog/FormSheet which includes it)
- [ ] onSubmitInvalid if form-level validation feedback needed
- [ ] Shared field components (TextField, NumberField, etc.)
- [ ] form.handleSubmit() on submit
- [ ] form.reset() on cancel/close
- [ ] Server errors: parent try/catch + toast; pass submitError for inline display
- [ ] Pending-close guards on dialogs
- [ ] Dialog closes only on success; form stays open on failure
