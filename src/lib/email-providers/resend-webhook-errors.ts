export type ResendWebhookSignatureFailure =
  | 'invalid_signature'
  | 'verification_failed'
  | 'non_error_failure';

export function getResendWebhookSignatureFailureLogContext(error: unknown): {
  verificationFailure: ResendWebhookSignatureFailure;
} {
  if (!(error instanceof Error)) {
    return { verificationFailure: 'non_error_failure' };
  }

  const message = error.message.toLowerCase();
  if (
    message.includes('signature') ||
    message.includes('svix') ||
    message.includes('timestamp') ||
    message.includes('webhook')
  ) {
    return { verificationFailure: 'invalid_signature' };
  }

  return { verificationFailure: 'verification_failed' };
}
