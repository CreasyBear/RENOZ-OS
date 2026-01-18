# File Storage PRD Execution

> **PRD**: file-storage.prd.json
> **Stories**: 7
> **Dependencies**: FOUND-AUTH, FOUND-SCHEMA, FOUND-SHARED

## Required Reading

Before implementing any story, read these pattern files:

| Pattern | Path | When to Apply |
|---------|------|---------------|
| Testing Standards | `_meta/patterns/testing-standards.md` | All stories |
| Error Recovery | `_meta/patterns/error-recovery.md` | FILE-002, FILE-003, FILE-004 - handle R2 failures |
| Performance | `_meta/patterns/performance-benchmarks.md` | FILE-003 - upload size limits, timeout handling |

**IMPORTANT**: Pattern compliance is mandatory. File uploads must handle network failures gracefully.

## Overview

Foundation file storage using Cloudflare R2 (S3-compatible):
- **Presigned URLs**: Secure direct upload/download to R2
- **Attachment Schema**: Metadata storage in Postgres
- **UI Components**: Uploader, preview, and list components

## Required Reading

Before implementing UI components, review:
- `_Initiation/_meta/frontend-components.md` - Required shared components (FormatAmount, TruncateTooltip, skeleton loading, memoized table cells)

**IMPORTANT:** Use existing shared components. DO NOT create local formatCurrency functions or duplicate UI patterns.

## Execution Order

### Phase 1: Infrastructure (2 stories)
1. **FILE-001** - Attachments Schema
2. **FILE-002** - R2 Storage Provider

### Phase 2: API Routes (2 stories)
3. **FILE-003** - Upload API (depends on 001, 002)
4. **FILE-004** - Download/Delete API (depends on 001, 002)

### Phase 3: Query Layer (1 story)
5. **FILE-007** - Query Hooks (depends on 003, 004)

### Phase 4: UI Components (2 stories)
6. **FILE-005** - File Uploader (depends on 003)
7. **FILE-006** - Preview & List (depends on 004, 007)

## Key Patterns

### Presigned URL Upload Flow
```typescript
// 1. Get presigned URL
const { uploadUrl, attachmentId } = await fetch('/api/files/upload/presigned', {
  method: 'POST',
  body: JSON.stringify({ filename, mimeType, sizeBytes })
}).then(r => r.json());

// 2. Direct upload to R2
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': mimeType }
});

// 3. Confirm upload
const { attachment } = await fetch('/api/files/upload/confirm', {
  method: 'POST',
  body: JSON.stringify({ attachmentId })
}).then(r => r.json());
```

### R2 Client Configuration
```typescript
import { S3Client } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

### Storage Key Format
```
{orgId}/{entityType}/{uuid}-{sanitized-filename}
```

## Environment Variables

```bash
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=renoz-attachments
```

## UI Components Reference

| Component | Location | Dependencies |
|-----------|----------|--------------|
| Progress | @/components/ui/progress | shadcn/ui |
| AlertDialog | @/components/ui/alert-dialog | shadcn/ui |
| Skeleton | @/components/ui/skeleton | shadcn/ui |

## Icons (lucide-react)

- `Upload` - Upload action
- `Download` - Download action
- `Trash2` - Delete action
- `File` - Generic file
- `FileText` - PDF/document
- `Image` - Image file
- `AlertTriangle` - Error state
- `CheckCircle` - Success state

## Validation

```bash
bun run typecheck
python scripts/validate-prd-corpus.py --prd-root "_Initiation/_prd/"
```

## Completion

When ALL file storage stories pass:
```xml
<promise>FILE_STORAGE_COMPLETE</promise>
```

## If Stuck

- After 3 iterations on same issue: Add blocker to progress.txt Notes
- After 5 iterations total on story: Output `<promise>STUCK_NEEDS_HELP</promise>`
