/**
 * FormFieldDisplayContext
 *
 * Provides showErrorsAfterSubmit to field components so they display validation
 * errors after submit attempt, regardless of touch state.
 *
 * Use form.Subscribe to react to submissionAttempts changes (direct form.state
 * does not trigger re-renders in TanStack Form).
 *
 * @see Form Error Display Hardened Pattern plan
 */
/* eslint-disable react-refresh/only-export-components -- Context + provider + hook colocated by design */
import { createContext, useContext, type ReactNode } from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface FormFieldDisplayContextValue {
  showErrorsAfterSubmit: boolean
}

const defaultValue: FormFieldDisplayContextValue = {
  showErrorsAfterSubmit: false,
}

export const FormFieldDisplayContext = createContext<FormFieldDisplayContextValue | undefined>(
  undefined
)

// ============================================================================
// HOOK
// ============================================================================

export function useFormFieldDisplay(): FormFieldDisplayContextValue {
  const ctx = useContext(FormFieldDisplayContext)
  return ctx ?? defaultValue
}

// ============================================================================
// PROVIDER
// ============================================================================

export interface FormFieldDisplayProviderProps {
  /** TanStack Form instance - must have Subscribe for reactivity */
  form: {
    Subscribe?: React.ComponentType<{
      selector: (state: { submissionAttempts: number }) => boolean
      children: (showErrorsAfterSubmit: boolean) => ReactNode
    }>
  }
  children: ReactNode
}

/** Minimal form type for FormDialog/FormSheet that may include Subscribe */
export type FormWithSubscribe = FormFieldDisplayProviderProps['form']

/**
 * Provides showErrorsAfterSubmit to descendant field components.
 * Uses form.Subscribe so the value updates when submissionAttempts changes.
 */
export function FormFieldDisplayProvider({ form, children }: FormFieldDisplayProviderProps) {
  const Subscribe = form.Subscribe

  if (!Subscribe) {
    return (
      <FormFieldDisplayContext.Provider value={defaultValue}>
        {children}
      </FormFieldDisplayContext.Provider>
    )
  }

  return (
    <Subscribe selector={(s) => (s.submissionAttempts ?? 0) > 0}>
      {(showErrorsAfterSubmit) => (
        <FormFieldDisplayContext.Provider value={{ showErrorsAfterSubmit }}>
          {children}
        </FormFieldDisplayContext.Provider>
      )}
    </Subscribe>
  )
}
