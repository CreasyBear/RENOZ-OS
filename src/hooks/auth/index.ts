/**
 * Auth Hooks
 */
export * from './use-current-org';
export * from './use-current-user';
export * from './use-has-permission';
export * from './use-mfa';
export { formatLoginError, isUnsafeLoginMessage } from './login-error-messages';
export {
  formatPasswordChangeError,
  isUnsafePasswordChangeMessage,
} from './password-change-error-messages';
export {
  formatPasswordResetCompletionError,
  formatPasswordResetRequestError,
  isUnsafePasswordResetMessage,
} from './password-reset-error-messages';
export {
  formatResendConfirmationError,
  isUnsafeResendConfirmationMessage,
} from './resend-confirmation-error-messages';
export { formatSignUpError, isUnsafeSignUpMessage } from './sign-up-error-messages';
export { useRequestPasswordReset, type RequestPasswordResetInput } from './use-password-reset';
export { useResendConfirmationEmail } from './use-resend-confirmation';
export type { ResendConfirmationInput } from '@/lib/schemas/auth';
