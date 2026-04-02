import type { CustomerWizardValues } from './types'

const WIZARD_STEP_COUNT = 4

export const GENERIC_CUSTOMER_CREATE_ERROR_MESSAGE =
  'Customer couldn’t be created right now. Your entries are still here, so you can try again.'

export interface CustomerWizardSubmissionState {
  submitError: string
  fieldErrors: Partial<Record<keyof CustomerWizardValues, string>>
  targetStepIndex: number
}

export function getCustomerCreateSubmissionState(error: unknown): CustomerWizardSubmissionState {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown })?.message === 'string'
        ? (error as { message: string }).message
        : ''

  const message =
    rawMessage.trim().length > 0 ? rawMessage : GENERIC_CUSTOMER_CREATE_ERROR_MESSAGE

  const validationErrors = (
    error as {
      details?: {
        validationErrors?: Record<string, string[]>
      }
    }
  )?.details?.validationErrors

  const fieldErrors: Partial<Record<keyof CustomerWizardValues, string>> = {}

  let targetStepIndex = WIZARD_STEP_COUNT - 1

  if (validationErrors) {
    const knownFieldNames: Array<keyof CustomerWizardValues> = [
      'name',
      'legalName',
      'email',
      'phone',
      'website',
      'status',
      'type',
      'size',
      'industry',
      'taxId',
      'registrationNumber',
      'creditHoldReason',
      'tags',
    ]

    for (const fieldName of knownFieldNames) {
      const fieldMessages = validationErrors[fieldName]
      if (Array.isArray(fieldMessages) && fieldMessages[0]) {
        fieldErrors[fieldName] = fieldMessages[0]
      }
    }

    const validationKeys = Object.keys(validationErrors)
    if (validationKeys.some((key) => key.startsWith('contacts') || key === 'contacts')) {
      targetStepIndex = 1
    } else if (validationKeys.some((key) => key.startsWith('addresses') || key === 'addresses')) {
      targetStepIndex = 2
    } else if (Object.keys(fieldErrors).length > 0) {
      targetStepIndex = 0
    }
  } else if ((error as { statusCode?: number })?.statusCode === 409) {
    targetStepIndex = 0
  }

  return {
    submitError: message,
    fieldErrors,
    targetStepIndex,
  }
}
