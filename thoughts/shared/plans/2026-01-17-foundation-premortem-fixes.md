# Foundation Pre-Mortem Fix Plan

**Created:** 2026-01-17
**Source:** Pre-mortem analysis of foundation phase (92 completed stories)
**Status:** PENDING

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 3 | Security issues - fix before production |
| P1 | 2 | Resource leaks - fix within sprint |
| P2 | 3 | Performance - optimize before scale |
| P3 | 3 | Resilience - before production traffic |

---

## P0: Security (Fix Before Production)

### FIX-001: MIME Type Validation - Block Executable Content

**Risk:** Pattern `/^text\/.+$/` allows `text/javascript`, `text/html` which can execute code
**Location:** `src/lib/schemas/files.ts:47-53`
**Severity:** HIGH

**Current Code:**
```typescript
export const ALLOWED_MIME_PATTERNS = [
  /^image\/.+$/,
  /^text\/.+$/,  // ❌ Allows text/javascript, text/html
  /^application\/pdf$/,
  /^application\/msword$/,
  /^application\/vnd\.openxmlformats-.+$/,
] as const;
```

**Fix:**
```typescript
export const ALLOWED_MIME_PATTERNS = [
  /^image\/(jpeg|png|gif|webp|svg\+xml)$/,  // Explicit image types
  /^text\/(plain|csv|markdown)$/,  // Explicit safe text types - NO javascript/html
  /^application\/pdf$/,
  /^application\/msword$/,
  /^application\/vnd\.openxmlformats-.+$/,
] as const;

// Or add explicit blocklist check:
const BLOCKED_MIME_TYPES = ['text/javascript', 'text/html', 'application/javascript'];
```

**Files to modify:**
- `src/lib/schemas/files.ts`

**Acceptance criteria:**
- [x] `text/javascript` rejected by validation
- [x] `text/html` rejected by validation
- [x] `text/plain`, `text/csv`, `text/markdown` still allowed
- [x] TypeScript passes

---

### FIX-002: Server-Side MIME Verification

**Risk:** Server trusts client-provided MIME type without verification
**Location:** `src/lib/server/files.ts:131-180` (confirmUpload)
**Severity:** HIGH

**Current Code:**
```typescript
// confirmUpload handler
const fileInfo = await headObject({ key: attachment.storageKey });
if (!fileInfo) {
  throw new NotFoundError("File not found in storage");
}
// ❌ No content-type verification against claimed mimeType
```

**Fix:**
```typescript
// In confirmUpload handler, after headObject:
const fileInfo = await headObject({ key: attachment.storageKey });
if (!fileInfo) {
  throw new NotFoundError("File not found in storage");
}

// ✅ Verify content type matches claimed type
if (fileInfo.contentType && fileInfo.contentType !== attachment.mimeType) {
  // Log for security monitoring
  console.warn(`MIME type mismatch: claimed=${attachment.mimeType}, actual=${fileInfo.contentType}`);

  // Re-validate actual content type
  if (!isAllowedMimeType(fileInfo.contentType)) {
    // Delete the file from R2
    await deleteObject({ key: attachment.storageKey });
    // Remove the pending record
    await db.delete(attachments).where(eq(attachments.id, data.attachmentId));
    throw new BadRequestError("Uploaded file type not allowed");
  }

  // Update record with actual MIME type
  await db.update(attachments)
    .set({ mimeType: fileInfo.contentType })
    .where(eq(attachments.id, data.attachmentId));
}
```

**Files to modify:**
- `src/lib/server/files.ts`
- `src/lib/storage/head.ts` (ensure contentType is returned)

**Acceptance criteria:**
- [x] headObject returns contentType
- [x] Mismatch detected and logged
- [x] Invalid content types rejected and cleaned up
- [x] Record updated with actual MIME type

---

### FIX-003: Upload Confirmation Race Condition

**Risk:** No validation that `deletedAt` is NOT NULL (pending state) - allows double confirmation
**Location:** `src/lib/server/files.ts:131-150`
**Severity:** HIGH

**Current Code:**
```typescript
const [attachment] = await db
  .select()
  .from(attachments)
  .where(
    and(
      eq(attachments.id, data.attachmentId),
      eq(attachments.organizationId, ctx.organizationId)
      // ❌ No check that deletedAt is NOT NULL (pending state)
    )
  )
  .limit(1);
```

**Fix:**
```typescript
import { isNotNull } from "drizzle-orm";

const [attachment] = await db
  .select()
  .from(attachments)
  .where(
    and(
      eq(attachments.id, data.attachmentId),
      eq(attachments.organizationId, ctx.organizationId),
      isNotNull(attachments.deletedAt)  // ✅ Only pending uploads have deletedAt set
    )
  )
  .limit(1);

if (!attachment) {
  throw new NotFoundError("Upload not found or already confirmed");
}
```

**Files to modify:**
- `src/lib/server/files.ts`

**Acceptance criteria:**
- [x] Already-confirmed uploads return 404
- [x] Deleted uploads cannot be "confirmed"
- [x] Only pending uploads (deletedAt NOT NULL) can be confirmed
- [x] TypeScript passes

---

## P1: Resource Leaks (Fix Within Sprint)

### FIX-004: Pending Upload Cleanup Job

**Risk:** Failed/abandoned uploads leave garbage records in database
**Location:** `src/lib/server/files.ts` (new)
**Severity:** HIGH

**Solution Options:**

**Option A: Background job (recommended for production)**
```typescript
// src/lib/jobs/cleanup-pending-uploads.ts
export async function cleanupPendingUploads() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  // Find pending uploads older than cutoff
  const staleUploads = await db
    .select()
    .from(attachments)
    .where(
      and(
        isNotNull(attachments.deletedAt),  // Pending = deletedAt is set
        lt(attachments.createdAt, cutoff)  // Older than 24h
      )
    );

  for (const upload of staleUploads) {
    // Delete from R2 (may already be gone)
    try {
      await deleteObject({ key: upload.storageKey });
    } catch { /* ignore */ }

    // Delete record
    await db.delete(attachments).where(eq(attachments.id, upload.id));
  }

  return { cleaned: staleUploads.length };
}
```

**Option B: Database trigger/scheduled function**
```sql
-- Postgres scheduled job via pg_cron
SELECT cron.schedule('cleanup-pending-uploads', '0 * * * *', $$
  DELETE FROM attachments
  WHERE deleted_at IS NOT NULL
  AND created_at < NOW() - INTERVAL '24 hours'
$$);
```

**Files to create:**
- `src/lib/jobs/cleanup-pending-uploads.ts`
- Registration in job system (depends on infrastructure)

**Acceptance criteria:**
- [x] Pending uploads older than 24h are deleted
- [x] R2 objects are cleaned up
- [x] Job runs hourly or on schedule
- [x] Logging for cleanup operations

---

### FIX-005: Soft-Deleted File Cleanup Job

**Risk:** Soft-deleted attachments accumulate R2 storage costs forever
**Location:** `src/lib/jobs/` (new)
**Severity:** HIGH

**Solution:**
```typescript
// src/lib/jobs/cleanup-deleted-files.ts
export async function cleanupDeletedFiles(retentionDays: number = 30) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  // Find soft-deleted files older than retention period
  const toDelete = await db
    .select()
    .from(attachments)
    .where(
      and(
        isNotNull(attachments.deletedAt),
        lt(attachments.deletedAt, cutoff)
      )
    );

  for (const file of toDelete) {
    // Delete from R2
    try {
      await deleteObject({ key: file.storageKey });
    } catch (err) {
      console.error(`Failed to delete R2 object ${file.storageKey}:`, err);
      continue; // Don't delete DB record if R2 delete failed
    }

    // Hard delete record
    await db.delete(attachments).where(eq(attachments.id, file.id));
  }

  return { cleaned: toDelete.length };
}
```

**Files to create:**
- `src/lib/jobs/cleanup-deleted-files.ts`

**Acceptance criteria:**
- [x] Files soft-deleted >7 days ago are hard deleted (using 7 days, configurable via code)
- [x] R2 objects are removed
- [x] DB records are removed
- [x] Failed R2 deletes logged (continues processing, object may not exist)
- [x] Daily cron job at 3 AM

---

## P2: Performance (Optimize Before Scale)

### FIX-006: Batch Download URL Endpoint

**Risk:** N+1 API calls - each AttachmentItem fetches URL independently
**Location:** `src/lib/server/files.ts` (new endpoint)
**Severity:** MEDIUM (HIGH at scale)

**Solution:**
```typescript
// src/lib/server/files.ts
export const getPresignedDownloadUrls = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    attachmentIds: z.array(z.string().uuid()).min(1).max(50),
  }))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    const ctx = await withAuth();

    // Fetch all attachments in one query
    const attachmentList = await db
      .select()
      .from(attachments)
      .where(
        and(
          inArray(attachments.id, data.attachmentIds),
          eq(attachments.organizationId, ctx.organizationId),
          isNull(attachments.deletedAt)
        )
      );

    // Generate URLs in parallel
    const results: Record<string, string> = {};
    await Promise.all(
      attachmentList.map(async (att) => {
        const { downloadUrl } = await generatePresignedDownloadUrl({
          key: att.storageKey,
        });
        results[att.id] = downloadUrl;
      })
    );

    return results;
  });
```

**Hook update:**
```typescript
// src/hooks/use-files.ts
export function useDownloadUrls(attachmentIds: string[]) {
  return useQuery({
    queryKey: fileKeys.downloads(attachmentIds),
    queryFn: () => getPresignedDownloadUrls({ data: { attachmentIds } }),
    enabled: attachmentIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Files to modify:**
- `src/lib/server/files.ts`
- `src/lib/schemas/files.ts`
- `src/hooks/use-files.ts`
- `src/components/files/attachment-list.tsx`

**Acceptance criteria:**
- [x] Single API call fetches all URLs for a list
- [x] Max 50 IDs per request
- [x] Results cached with same 5-min staleTime
- [ ] AttachmentList uses batch hook (optional - current impl works, optimize later)

---

### FIX-007: Share Download URL Between Components

**Risk:** FilePreview and AttachmentItem both call useDownloadUrl for same attachment
**Location:** `src/components/files/attachment-list.tsx`, `file-preview.tsx`
**Severity:** MEDIUM

**Solution:**
```typescript
// attachment-list.tsx - pass URL to FilePreview
function AttachmentItem({ attachment, downloadUrl, ... }) {
  // Use passed downloadUrl instead of fetching again
  return (
    <FilePreview
      attachment={attachment}
      downloadUrl={downloadUrl}  // ✅ Pass down
      size="sm"
    />
  );
}

// file-preview.tsx - accept optional downloadUrl prop
interface FilePreviewProps {
  attachment: AttachmentInfo;
  size?: "sm" | "md" | "lg";
  downloadUrl?: string;  // ✅ Optional - if provided, don't fetch
}

export function FilePreview({ attachment, size, downloadUrl: propUrl }) {
  // Only fetch if not provided
  const { data } = useDownloadUrl(
    isImage(attachment.mimeType) && !propUrl ? attachment.id : undefined
  );

  const url = propUrl || data?.downloadUrl;
  // ...
}
```

**Files to modify:**
- `src/components/files/attachment-list.tsx`
- `src/components/files/file-preview.tsx`

**Acceptance criteria:**
- [x] FilePreview accepts optional downloadUrl prop
- [x] AttachmentItem passes URL to FilePreview
- [x] No duplicate API calls for same attachment

---

### FIX-008: Scope Cache Invalidation

**Risk:** Delete invalidates ALL file queries instead of specific entity
**Location:** `src/hooks/use-files.ts:254-257`
**Severity:** LOW

**Current Code:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: fileKeys.all });  // ❌ Too broad
}
```

**Fix:**
```typescript
onSuccess: (_data, attachmentId) => {
  // Get the attachment's entity from cache to scope invalidation
  const queries = queryClient.getQueriesData({ queryKey: fileKeys.lists() });

  // Find which entity this attachment belonged to
  for (const [queryKey, data] of queries) {
    const attachmentList = data as ListAttachmentsResponse | undefined;
    if (attachmentList?.attachments?.some(a => a.id === attachmentId)) {
      queryClient.invalidateQueries({ queryKey });
      return;
    }
  }

  // Fallback: invalidate all lists if attachment not found in cache
  queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
}
```

**Files to modify:**
- `src/hooks/use-files.ts`

**Acceptance criteria:**
- [x] Delete only invalidates relevant entity query
- [x] Other entity lists not refetched
- [x] Fallback to broad invalidation if needed

---

## P3: Resilience (Before Production Traffic)

### FIX-009: Add XHR Upload Timeout

**Risk:** Large file uploads can hang indefinitely
**Location:** `src/hooks/use-files.ts:198-233`
**Severity:** MEDIUM

**Fix:**
```typescript
async function uploadToR2(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
  timeoutMs: number = 300000  // 5 minutes for large files
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.timeout = timeoutMs;  // ✅ Add timeout

    xhr.addEventListener("timeout", () => {
      reject(new Error(`Upload timed out after ${timeoutMs / 1000} seconds`));
    });

    // ... rest of implementation
  });
}
```

**Files to modify:**
- `src/hooks/use-files.ts`

**Acceptance criteria:**
- [x] Timeout fires after 5 minutes
- [x] User-friendly error message on timeout
- [x] Timeout configurable per upload

---

### FIX-010: Add Upload Retry Logic

**Risk:** Transient network failures cause upload failure
**Location:** `src/hooks/use-files.ts:158-193`
**Severity:** MEDIUM

**Solution:**
```typescript
async function uploadWithRetry(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
  maxAttempts: number = 3
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await uploadToR2(uploadUrl, file, onProgress);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Upload failed");

      // Don't retry on non-recoverable errors
      if (lastError.message.includes("File type not allowed")) {
        throw lastError;
      }

      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
        onProgress?.(0); // Reset progress for retry
      }
    }
  }

  throw lastError || new Error("Upload failed after retries");
}
```

**Files to modify:**
- `src/hooks/use-files.ts`

**Acceptance criteria:**
- [x] 3 retry attempts with exponential backoff
- [x] Non-recoverable errors don't retry
- [x] Progress resets on retry
- [x] Final error includes retry info

---

### FIX-011: Explicit AWS SDK Configuration

**Risk:** Default SDK timeouts may not be appropriate
**Location:** `src/lib/storage/r2-client.ts`
**Severity:** LOW

**Fix:**
```typescript
_r2Client = new S3Client({
  region: "auto",
  endpoint,
  credentials,
  maxAttempts: 3,  // ✅ Explicit retry count
  requestHandler: {
    requestTimeout: 30000,  // ✅ 30 second timeout
  },
});
```

**Files to modify:**
- `src/lib/storage/r2-client.ts`

**Acceptance criteria:**
- [x] Max 3 retry attempts configured
- [ ] 30 second request timeout (deferred - requires @aws-sdk/node-http-handler for fine control)
- [x] Applies to all R2 operations

---

## Implementation Order

```
Week 1 (P0 - Security):
  Day 1: FIX-001 (MIME validation)
  Day 1: FIX-002 (Server MIME verification)
  Day 2: FIX-003 (Race condition)
  Day 2: Testing & verification

Week 2 (P1 - Resource Leaks):
  Day 1: FIX-004 (Pending upload cleanup)
  Day 2: FIX-005 (Deleted file cleanup)
  Day 3: Job scheduling setup

Week 3 (P2 - Performance):
  Day 1: FIX-006 (Batch download URLs)
  Day 2: FIX-007 (Share URLs between components)
  Day 2: FIX-008 (Scope invalidation)

Week 4 (P3 - Resilience):
  Day 1: FIX-009 (XHR timeout)
  Day 1: FIX-010 (Retry logic)
  Day 2: FIX-011 (AWS SDK config)
```

---

## Pre-Mortem Metadata

```yaml
premortem:
  date: 2026-01-17
  mode: deep
  scope: Foundation Phase (92 stories)
  tigers: 11 (6 HIGH, 5 MEDIUM)
  elephants: 3 (1 HIGH, 2 MEDIUM)
  paper_tigers: 4

  reviews_completed:
    - critic (code review)
    - aegis (security audit)
    - profiler (performance analysis)
    - liaison (integration review)
```
