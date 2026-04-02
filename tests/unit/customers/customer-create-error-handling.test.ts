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
    })
  })

  it('routes nested contact validation failures back to the contacts step', () => {
    const submissionState = getCustomerCreateSubmissionState({
      message: 'Validation failed',
      details: {
        validationErrors: {
          'contacts.0.email': ['Enter a valid email address'],
        },
      },
    })

    expect(submissionState).toEqual({
      submitError: 'Validation failed',
      fieldErrors: {},
      targetStepIndex: 1,
    })
  })

  it('routes nested address validation failures back to the addresses step', () => {
    const submissionState = getCustomerCreateSubmissionState({
      message: 'Validation failed',
      details: {
        validationErrors: {
          'addresses.0.street1': ['Street address is required'],
        },
      },
    })

    expect(submissionState).toEqual({
      submitError: 'Validation failed',
      fieldErrors: {},
      targetStepIndex: 2,
    })
  })
})
