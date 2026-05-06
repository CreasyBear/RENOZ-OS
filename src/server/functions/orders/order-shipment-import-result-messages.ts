interface ErrorSignal {
  code?: string;
  statusCode?: number;
  message?: string;
}

function extractErrorSignal(error: unknown): ErrorSignal {
  if (!(error instanceof Error)) {
    return {};
  }

  const candidate = error as Error & {
    code?: unknown;
    statusCode?: unknown;
    status?: unknown;
  };

  return {
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    statusCode:
      typeof candidate.statusCode === 'number'
        ? candidate.statusCode
        : typeof candidate.status === 'number'
          ? candidate.status
          : undefined,
    message: error.message,
  };
}

export function formatFulfillmentImportResultError(error: unknown): string {
  const signal = extractErrorSignal(error);
  const code = signal.code ?? '';
  const statusCode = signal.statusCode;
  const message = signal.message?.toLowerCase() ?? '';

  if (code === 'NOT_FOUND' || statusCode === 404 || message === 'shipment not found') {
    return 'Shipment could not be found for this import row.';
  }

  if (
    message.includes('serialized item record not found') ||
    message.includes('could not be resolved to a serialized item')
  ) {
    return 'Serialized inventory could not be resolved for this shipment.';
  }

  if (code === 'CONFLICT' || statusCode === 409) {
    return 'Shipment changed while the import was running. Refresh and try again.';
  }

  if (message === 'shipment already shipped') {
    return 'Shipment is no longer pending. Refresh fulfillment and review the shipment.';
  }

  if (code === 'VALIDATION_ERROR' || statusCode === 400) {
    return 'Shipment could not be imported because it failed validation.';
  }

  return 'Shipment could not be imported. Review the row and try again.';
}
