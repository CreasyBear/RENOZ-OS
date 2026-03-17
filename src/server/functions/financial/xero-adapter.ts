import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { refreshOAuthTokens } from "@/lib/oauth/token-refresh";
import { decryptOAuthToken } from "@/lib/oauth/token-encryption";
import { ServerError } from "@/lib/server/errors";
import { oauthConnections } from "../../../../drizzle/schema/oauth";
import type { XeroInvoicePayload } from "@/lib/schemas";

const XERO_API_BASE_URL = process.env.XERO_API_BASE_URL ?? "https://api.xero.com/api.xro/2.0";
const XERO_CONNECTION_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export interface XeroSyncReadiness {
  available: boolean;
  message?: string;
  connectionId?: string;
}

export type XeroErrorCode =
  | "configuration_unavailable"
  | "connection_missing"
  | "auth_failed"
  | "forbidden"
  | "rate_limited"
  | "validation_failed"
  | "transient_upstream_error"
  | "unexpected_response";

export class XeroAdapterError extends Error {
  constructor(
    public readonly code: XeroErrorCode,
    message: string,
    public readonly retryAfterSeconds?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "XeroAdapterError";
  }
}

interface XeroConnectionConfig {
  connectionId: string;
  accessToken: string;
  tenantId: string;
}

export interface XeroSyncConfig {
  accessToken: string;
  tenantId: string;
}

export interface XeroInvoiceSyncResponse {
  invoiceId: string;
  invoiceUrl?: string;
  rawResponse: unknown;
}

export interface XeroInvoiceLookupResult {
  invoiceId: string;
  invoiceUrl?: string;
  rawResponse: unknown;
}

export interface XeroManualJournalLine {
  lineAmount: number;
  accountCode: string;
  description: string;
}

export interface XeroManualJournalPayload {
  narration: string;
  reference?: string;
  date: string;
  status: "POSTED" | "DRAFT";
  lineAmountTypes: "NoTax";
  journalLines: XeroManualJournalLine[];
}

export interface XeroManualJournalSyncResponse {
  manualJournalId: string;
  rawResponse: unknown;
}

export interface XeroManualJournalLookupResult {
  manualJournalId: string;
  rawResponse: unknown;
}

export interface XeroContactSummary {
  id: string;
  name: string;
  email: string | null;
  contactNumber: string | null;
  phones: Array<{ type: string | null; number: string | null }>;
  updatedDateUtc: string | null;
}

export interface XeroPaymentDetails {
  paymentId: string;
  xeroInvoiceId: string;
  amountPaid: number;
  paymentDate: string;
  reference?: string;
}

export interface XeroCreateContactPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  legalName?: string | null;
}

interface XeroApiEnvelope {
  Message?: string;
  Elements?: Array<{ ValidationErrors?: Array<{ Message?: string }> }>;
}

interface XeroInvoiceApiResponse extends XeroApiEnvelope {
  Invoices?: Array<{ InvoiceID?: string; Reference?: string }>;
}

interface XeroManualJournalApiResponse extends XeroApiEnvelope {
  ManualJournals?: Array<{ ManualJournalID?: string; Reference?: string }>;
}

interface XeroContactApiResponse extends XeroApiEnvelope {
  Contacts?: Array<{
    ContactID?: string;
    Name?: string;
    EmailAddress?: string;
    ContactNumber?: string;
    UpdatedDateUTC?: string;
    Phones?: Array<{ PhoneType?: string; PhoneNumber?: string }>;
  }>;
}

interface XeroPaymentApiResponse extends XeroApiEnvelope {
  Payments?: Array<{
    PaymentID?: string;
    Date?: string;
    Amount?: number | string;
    Reference?: string;
    Invoice?: {
      InvoiceID?: string;
    };
  }>;
}

function isXeroConfigured(): boolean {
  return Boolean(
    process.env.XERO_CLIENT_ID &&
      process.env.XERO_CLIENT_SECRET &&
      process.env.XERO_REDIRECT_URI
  );
}

export async function getXeroSyncReadiness(
  organizationId: string
): Promise<XeroSyncReadiness> {
  if (!isXeroConfigured()) {
    return {
      available: false,
      message: "Xero OAuth is not configured for this environment.",
    };
  }

  const connection = await getActiveXeroConnection(organizationId);
  if (!connection) {
    return {
      available: false,
      message: "No active Xero accounting connection is configured for this organization.",
    };
  }

  return {
    available: true,
    connectionId: connection.id,
  };
}

export async function getXeroSyncConfig(
  organizationId: string
): Promise<XeroSyncConfig> {
  const config = await resolveXeroConnection(organizationId);
  return {
    accessToken: config.accessToken,
    tenantId: config.tenantId,
  };
}

export async function syncInvoiceWithXero(
  organizationId: string,
  payload: XeroInvoicePayload
): Promise<XeroInvoiceSyncResponse> {
  const body = await xeroRequest<XeroInvoiceApiResponse>(organizationId, "/Invoices", {
    method: "POST",
    body: JSON.stringify({ Invoices: [payload] }),
  });

  const invoiceId = body.Invoices?.[0]?.InvoiceID;
  if (!invoiceId) {
    throw new XeroAdapterError(
      "unexpected_response",
      "Xero sync succeeded but no invoice ID was returned",
      undefined,
      body
    );
  }

  return {
    invoiceId,
    invoiceUrl: `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${invoiceId}`,
    rawResponse: body,
  };
}

export async function findInvoiceByReference(
  organizationId: string,
  reference: string
): Promise<XeroInvoiceLookupResult | null> {
  const encodedWhere = encodeURIComponent(`Reference=="${reference.replace(/"/g, '\\"')}"`);
  const body = await xeroRequest<XeroInvoiceApiResponse>(
    organizationId,
    `/Invoices?where=${encodedWhere}`,
    { method: "GET" }
  );

  const invoiceId = body.Invoices?.[0]?.InvoiceID;
  if (!invoiceId) {
    return null;
  }

  return {
    invoiceId,
    invoiceUrl: `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${invoiceId}`,
    rawResponse: body,
  };
}

export async function syncManualJournalWithXero(
  organizationId: string,
  payload: XeroManualJournalPayload
): Promise<XeroManualJournalSyncResponse> {
  const body = await xeroRequest<XeroManualJournalApiResponse>(
    organizationId,
    "/ManualJournals",
    {
      method: "POST",
      body: JSON.stringify({
        ManualJournals: [
          {
            Narration: payload.narration,
            Reference: payload.reference,
            Date: payload.date,
            Status: payload.status,
            LineAmountTypes: payload.lineAmountTypes,
            JournalLines: payload.journalLines.map((line) => ({
              LineAmount: line.lineAmount,
              AccountCode: line.accountCode,
              Description: line.description,
            })),
          },
        ],
      }),
    }
  );

  const manualJournalId = body.ManualJournals?.[0]?.ManualJournalID;
  if (!manualJournalId) {
    throw new XeroAdapterError(
      "unexpected_response",
      "Xero manual journal sync succeeded but no manual journal ID was returned",
      undefined,
      body
    );
  }

  return {
    manualJournalId,
    rawResponse: body,
  };
}

export async function findManualJournalByReference(
  organizationId: string,
  reference: string
): Promise<XeroManualJournalLookupResult | null> {
  const encodedWhere = encodeURIComponent(`Reference=="${reference.replace(/"/g, '\\"')}"`);
  const body = await xeroRequest<XeroManualJournalApiResponse>(
    organizationId,
    `/ManualJournals?where=${encodedWhere}`,
    { method: "GET" }
  );

  const manualJournalId = body.ManualJournals?.[0]?.ManualJournalID;
  if (!manualJournalId) {
    return null;
  }

  return {
    manualJournalId,
    rawResponse: body,
  };
}

export async function searchXeroContacts(
  organizationId: string,
  query: string
): Promise<XeroContactSummary[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const whereClauses = [
    `Name!=null&&Name.Contains("${trimmedQuery.replace(/"/g, '\\"')}")`,
  ];

  if (trimmedQuery.includes("@")) {
    whereClauses.push(`EmailAddress!=null&&EmailAddress.Contains("${trimmedQuery.replace(/"/g, '\\"')}")`);
  }

  const encodedWhere = encodeURIComponent(whereClauses.join("||"));
  const body = await xeroRequest<XeroContactApiResponse>(
    organizationId,
    `/Contacts?where=${encodedWhere}`,
    { method: "GET" }
  );

  return (body.Contacts ?? []).map(mapXeroContactSummary).filter((contact) => Boolean(contact.id));
}

export async function getXeroContactById(
  organizationId: string,
  contactId: string
): Promise<XeroContactSummary | null> {
  const body = await xeroRequest<XeroContactApiResponse>(
    organizationId,
    `/Contacts/${encodeURIComponent(contactId)}`,
    { method: "GET" }
  );

  const contact = body.Contacts?.[0];
  return contact?.ContactID ? mapXeroContactSummary(contact) : null;
}

export async function createXeroContact(
  organizationId: string,
  payload: XeroCreateContactPayload
): Promise<XeroContactSummary> {
  const body = await xeroRequest<XeroContactApiResponse>(organizationId, "/Contacts", {
    method: "POST",
    body: JSON.stringify({
      Contacts: [
        {
          Name: payload.name,
          EmailAddress: payload.email ?? undefined,
          FirstName: payload.name,
          Phones: payload.phone
            ? [
                {
                  PhoneType: "DEFAULT",
                  PhoneNumber: payload.phone,
                },
              ]
            : [],
          ContactNumber: payload.legalName ?? undefined,
        },
      ],
    }),
  });

  const contact = body.Contacts?.[0];
  if (!contact?.ContactID) {
    throw new XeroAdapterError(
      "unexpected_response",
      "Xero contact creation succeeded but no contact ID was returned",
      undefined,
      body
    );
  }

  return mapXeroContactSummary(contact);
}

export async function getXeroPaymentById(
  organizationId: string,
  paymentId: string
): Promise<XeroPaymentDetails | null> {
  const body = await xeroRequest<XeroPaymentApiResponse>(
    organizationId,
    `/Payments/${encodeURIComponent(paymentId)}`,
    { method: "GET" }
  );

  const payment = body.Payments?.[0];
  if (!payment?.PaymentID || !payment.Invoice?.InvoiceID || payment.Amount == null || !payment.Date) {
    return null;
  }

  const amountPaid =
    typeof payment.Amount === "number" ? payment.Amount : Number.parseFloat(payment.Amount);

  if (!Number.isFinite(amountPaid)) {
    return null;
  }

  return {
    paymentId: payment.PaymentID,
    xeroInvoiceId: payment.Invoice.InvoiceID,
    amountPaid,
    paymentDate: payment.Date,
    reference: payment.Reference ?? undefined,
  };
}

async function xeroRequest<T extends XeroApiEnvelope>(
  organizationId: string,
  path: string,
  init: globalThis.RequestInit,
  allowRefreshRetry = true
): Promise<T> {
  const config = await resolveXeroConnection(organizationId);
  const response = await fetch(`${XERO_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Xero-tenant-id": config.tenantId,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 401 && allowRefreshRetry) {
    await refreshXeroConnection(config.connectionId, organizationId);
    return xeroRequest<T>(organizationId, path, init, false);
  }

  const body = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    throw classifyXeroResponseError(response, body);
  }

  if (!body) {
    throw new XeroAdapterError(
      "unexpected_response",
      "Xero returned an empty or invalid response body"
    );
  }

  return body;
}

function classifyXeroResponseError(
  response: Response,
  body: XeroApiEnvelope | null
): XeroAdapterError {
  const validationMessage = body?.Elements?.flatMap((element) =>
    (element.ValidationErrors ?? []).map((error) => error.Message).filter(Boolean)
  )[0];
  const fallbackMessage = validationMessage ?? body?.Message ?? response.statusText;

  if (response.status === 401) {
    return new XeroAdapterError(
      "auth_failed",
      fallbackMessage || "Xero authentication failed",
      undefined,
      body
    );
  }

  if (response.status === 403) {
    return new XeroAdapterError(
      "forbidden",
      fallbackMessage || "Xero connection is missing required tenant access or scopes",
      undefined,
      body
    );
  }

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined;
    return new XeroAdapterError(
      "rate_limited",
      fallbackMessage || "Xero rate limit exceeded",
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      body
    );
  }

  if (response.status >= 500) {
    return new XeroAdapterError(
      "transient_upstream_error",
      fallbackMessage || "Xero is temporarily unavailable",
      undefined,
      body
    );
  }

  return new XeroAdapterError(
    "validation_failed",
    fallbackMessage || "Xero rejected the request",
    undefined,
    body
  );
}

async function resolveXeroConnection(
  organizationId: string
): Promise<XeroConnectionConfig> {
  if (!isXeroConfigured()) {
    throw new XeroAdapterError(
      "configuration_unavailable",
      "Xero OAuth is not configured for this environment."
    );
  }

  let connection = await getActiveXeroConnection(organizationId);

  if (!connection) {
    throw new XeroAdapterError(
      "connection_missing",
      "No active Xero accounting connection is configured for this organization."
    );
  }

  if (needsRefresh(connection.tokenExpiresAt) && connection.refreshToken) {
    await refreshXeroConnection(connection.id, organizationId);
    connection = await getActiveXeroConnection(organizationId);
  }

  if (!connection) {
    throw new XeroAdapterError(
      "connection_missing",
      "No active Xero accounting connection is configured for this organization."
    );
  }

  if (!connection.externalAccountId) {
    throw new XeroAdapterError(
      "configuration_unavailable",
      "The active Xero connection is missing a tenant ID."
    );
  }

  try {
    return {
      connectionId: connection.id,
      accessToken: decryptOAuthToken(connection.accessToken, organizationId),
      tenantId: connection.externalAccountId,
    };
  } catch (error) {
    throw new XeroAdapterError(
      "auth_failed",
      error instanceof Error ? error.message : "Failed to decrypt Xero access token"
    );
  }
}

async function refreshXeroConnection(connectionId: string, organizationId: string) {
  const result = await refreshOAuthTokens(db, connectionId, organizationId);
  if (!result.success) {
    throw new XeroAdapterError(
      "auth_failed",
      result.errorMessage ?? "Failed to refresh Xero access token"
    );
  }
}

function needsRefresh(tokenExpiresAt: Date | null): boolean {
  if (!tokenExpiresAt) {
    return false;
  }

  return new Date(tokenExpiresAt).getTime() - Date.now() <= XERO_CONNECTION_REFRESH_BUFFER_MS;
}

async function getActiveXeroConnection(organizationId: string) {
  const [connection] = await db
    .select({
      id: oauthConnections.id,
      accessToken: oauthConnections.accessToken,
      refreshToken: oauthConnections.refreshToken,
      tokenExpiresAt: oauthConnections.tokenExpiresAt,
      externalAccountId: oauthConnections.externalAccountId,
    })
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.organizationId, organizationId),
        eq(oauthConnections.provider, "xero"),
        eq(oauthConnections.serviceType, "accounting"),
        eq(oauthConnections.isActive, true)
      )
    )
    .orderBy(desc(oauthConnections.updatedAt))
    .limit(1);

  return connection;
}

function mapXeroContactSummary(contact: {
  ContactID?: string;
  Name?: string;
  EmailAddress?: string;
  ContactNumber?: string;
  UpdatedDateUTC?: string;
  Phones?: Array<{ PhoneType?: string; PhoneNumber?: string }>;
}): XeroContactSummary {
  return {
    id: contact.ContactID ?? "",
    name: contact.Name ?? "Unnamed contact",
    email: contact.EmailAddress ?? null,
    contactNumber: contact.ContactNumber ?? null,
    updatedDateUtc: contact.UpdatedDateUTC ?? null,
    phones: (contact.Phones ?? []).map((phone) => ({
      type: phone.PhoneType ?? null,
      number: phone.PhoneNumber ?? null,
    })),
  };
}

export function getXeroErrorMessage(error: unknown): string {
  if (error instanceof XeroAdapterError) {
    return error.message;
  }

  if (error instanceof ServerError) {
    return error.message;
  }

  return error instanceof Error ? error.message : "Unknown Xero error";
}
