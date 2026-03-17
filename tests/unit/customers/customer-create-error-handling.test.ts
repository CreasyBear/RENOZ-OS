import { describe, expect, it } from 'vitest'
import { getCustomerCreateSubmissionState } from '@/components/domain/customers/customer-wizard/submission-state'

const DUPLICATE_CUSTOMER_EMAIL_MESSAGE =
  'A customer with this email already exists. Use a different email or edit the existing customer.'
const DUPLICATE_CUSTOMER_EMAIL_FIELD_MESSAGE =
  'This email is already used by another customer.'

describe('customer create error handling', () => {
  it('maps structured duplicate email errors back to the details step', () => {
    const submissionState = getCustomerCreateSubmissionState({
      message: DUPLICATE_CUSTOMER_EMAIL_MESSAGE,
      details: {
        validationErrors: {
          email: [DUPLICATE_CUSTOMER_EMAIL_FIELD_MESSAGE],
          code: ['duplicate_email'],
        },
      },
    })

    expect(submissionState).toEqual({
      submitError: DUPLICATE_CUSTOMER_EMAIL_MESSAGE,
      fieldErrors: {
        email: DUPLICATE_CUSTOMER_EMAIL_FIELD_MESSAGE,
      },
      targetStepIndex: 0,
      preserveDraft: false,
      skipUiRecovery: false,
    })
  })

  it('preserves the draft when related records partially fail after customer creation', () => {
    const submissionState = getCustomerCreateSubmissionState({
      message: 'Customer was created, but some related records still need attention.',
      code: 'PARTIAL_RELATED_CREATE_FAILURE',
      details: {
        customerId: 'customer-1',
        redirectingToEdit: true,
        relatedCreateFailures: [
          {
            scope: 'contact',
            label: 'Ada Lovelace',
            reason: 'Timed out',
          },
        ],
      },
    })

    expect(submissionState).toEqual({
      submitError: 'Customer was created, but some related records still need attention.',
      fieldErrors: {},
      targetStepIndex: 3,
      preserveDraft: true,
      skipUiRecovery: true,
    })
  })
})
