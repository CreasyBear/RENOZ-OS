export type DocumentServerRecord = Record<string, unknown>;

export async function unwrapDocumentServerFnResult(
  value: unknown,
  context: string
): Promise<unknown> {
  if (value instanceof Response) {
    const contentType = value.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return unwrapDocumentServerFnResult(await value.json(), context);
    }
    throw new Error(`${context} returned a non-JSON response`);
  }

  if (!value || typeof value !== 'object') return value;

  const record = value as DocumentServerRecord;
  if ('result' in record && record.result !== value) {
    return unwrapDocumentServerFnResult(record.result, context);
  }
  if ('data' in record && record.data !== value) {
    return unwrapDocumentServerFnResult(record.data, context);
  }

  return value;
}

export async function unwrapDocumentServerRecord(
  value: unknown,
  context: string
): Promise<DocumentServerRecord> {
  const candidate = await unwrapDocumentServerFnResult(value, context);
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`${context} returned an invalid response`);
  }

  return candidate as DocumentServerRecord;
}
