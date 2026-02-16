# Premortem: PDF Generation

**Scope:** PDF document generation across all entry points — quotes, invoices, packing slips, delivery notes, work orders, certificates, reports.

**Audit date:** 2026-02-14

---

## Entry Points

| Location | Document Type | Runtime | Notes |
|----------|---------------|---------|-------|
| Trigger.dev | Invoice, Quote, Packing Slip, Delivery Note, Work Order, Completion Certificate, Warranty Certificate | Trigger cloud workers | Background jobs; no `process.cwd()` |
| Vercel serverless | generate-documents-sync, generate-project-documents-sync, credit-notes, quote-versions, preview-document | Nitro/Vercel functions | `'use server'` |
| Vercel serverless | process-scheduled-reports | Trigger cloud workers | Reports with PDF attachments |

**Runtimes:** PDF generation runs in (1) Trigger.dev cloud workers, (2) Vercel serverless (Nitro). Both are headless Node environments with no guaranteed filesystem layout.

---

## Walkthrough

**Flow:** Fetch org + entity data → pre-fetch logo (fetchImageAsDataUrl) → pre-generate QR code → renderPdfToBuffer → upload to Supabase Storage.

**Key dependencies:**
- Fonts: `src/lib/documents/fonts.ts` — **FIXED** (was ENOENT `/assets/Inter-*.ttf`; now data URLs via `?arraybuffer`)
- Logo: `fetchOrganizationForDocument` → `fetchImageAsDataUrl(logoUrl)` — pre-fetches to data URL
- Logo fallback: `logoDataUrl ?? logoUrl` — if fetch fails, passes raw URL to react-pdf Image
- QR codes: `generateQRCode(url)` — in-memory data URL (no network)
- Customer signature: `customerSignatureUrl` (Completion Certificate) — passed directly to Image `src` (remote URL)

---

## Premortem

### Critical — Potential Failures

| ID | Failure Mode | Likelihood | Impact | Notes |
|----|--------------|------------|--------|-------|
| C1 | **customerSignatureUrl fails at render** | Medium | High | Completion certificate passes `job.signatureUrl` directly to `<Image src={...} />`. react-pdf fetches it at render time. If Supabase signed URL expired, or Trigger worker can't reach storage (network/CORS), PDF fails. |
| C2 | **logoUrl fallback fails** | Medium | Medium | When `fetchImageAsDataUrl` returns null (timeout, 404, CORS), templates use `logoUrl` as fallback. react-pdf Image fetches it. Same risks: expired signed URL, network failure in worker. |
| C3 | **APP_URL wrong in Trigger.dev** | Low | Medium | `getAppUrl()` uses `process.env.APP_URL || DEFAULT_APP_URL`. Trigger.dev workers may not have `APP_URL` set. QR codes and "View online" links would point to prod (app.renoz.com.au) even in staging. |
| C4 | **Buffer not available** | Low | High | `fonts.ts` uses `Buffer.from(buf).toString("base64")`. In edge runtimes or Deno, `Buffer` might be undefined. Currently Nitro/Trigger use Node, so OK. |
| C5 | **Large document OOM** | Low | High | `renderPdfToBuffer` without `useStream` loads full PDF in memory. 50+ line items could spike memory. `useStream` exists but may not be used everywhere. |

### User Debt — UX / Reliability

| ID | Failure Mode | Notes |
|----|--------------|-------|
| U1 | **Logo missing — no placeholder** | When both logoDataUrl and logoUrl fail, templates show org name. OK. But if logoUrl is used and fetch fails mid-render, react-pdf may throw. |
| U2 | **Signature missing — graceful** | Completion cert has `{data.customerSignatureUrl ? <Image ... /> : <View style={signatureLine} />}`. Good. But if URL is present and invalid, Image fails. |
| U3 | **No retry for image fetch** | `fetchImageAsDataUrl` has 10s timeout, returns null on failure. No retry. Transient network blips = missing logo. |

### Developer Debt — Maintainability

| ID | Failure Mode | Notes |
|----|--------------|-------|
| D1 | **Remote Image URLs in templates** | Logo fallback and customerSignatureUrl pass URLs to react-pdf. Prefer data URLs everywhere for serverless reliability. |
| D2 | **No APP_URL validation** | `getAppUrl()` silently falls back. Staging/preview could generate wrong QR links. |
| D3 | **generateStoragePath document types** | `completion-certificate` and `handover-pack` map to `project-documents`. `generateFilename` allows them. Verify `ALLOWED_DOCUMENT_TYPES` and `DOCUMENT_TYPE_FOLDERS` stay in sync. |

---

## Broken Paths List

| ID | Item | Priority |
|----|------|----------|
| 1 | Pre-fetch customerSignatureUrl to data URL before render (Completion Certificate) | P0 |
| 2 | Ensure logo fallback never passes raw URL — use placeholder or fail fast | P1 |
| 3 | Validate APP_URL in Trigger.dev config; document env requirements | P1 |
| 4 | Add retry (1–2) for fetchImageAsDataUrl on transient failures | P2 |
| 5 | Audit useStream usage for large documents (invoices, reports) | P2 |
| 6 | Add Buffer polyfill check or document Node-only requirement | P2 |

---

## Remediation Plan

### P0 — DONE (2026-02-14)
- [x] **Completion Certificate signature:** Pre-fetch `customerSignatureUrl` via `fetchImageAsDataUrl`; pass `customerSignatureDataUrl` to template. Fallback to signature line if fetch fails.
- [x] **QR + APP_URL removed:** Removed QR codes and view-online links from all PDFs. No `process.env.APP_URL` in PDF generation path.

### P1 — DONE
- [x] **Logo fallback:** Templates use only `logoDataUrl`; no raw `logoUrl` passed to Image. Org name placeholder when fetch fails.

### P2 — Medium
- [ ] **fetchImageAsDataUrl retry:** On fetch failure, retry once after 1s delay.
- [ ] **useStream audit:** Check invoice/quote/report jobs for documents with >50 line items; enable `useStream` where appropriate.
- [ ] **Buffer:** Add runtime check or document that PDF generation requires Node (not edge).

---

## Hardening

| Failure mode | Guard |
|--------------|-------|
| Font ENOENT | ✅ Use `?arraybuffer` + data URL (done) |
| Logo fetch failure | Pre-fetch to data URL; fallback to org name only |
| Signature URL invalid | Pre-fetch to data URL; fallback to signature line |
| Wrong APP_URL | Env validation; document Trigger.dev config |
| OOM on large PDF | useStream for documents >50 items |
| process.cwd / readFileSync | ✅ Audited; fonts + AI memory template fixed |

---

## References

- Font fix: `src/lib/documents/fonts.ts` — `?arraybuffer` + `toDataUrl()`
- AI memory template fix: `src/lib/ai/agents/factory.ts` — `?raw` import
- Logo pre-fetch: `organization-for-pdf.ts` → `fetchImageAsDataUrl`
- WORKFLOW-AUDIT-REMEDIATION-PROCESS.md
- PDF-DOCUMENT-STANDARDS.md (if exists)
