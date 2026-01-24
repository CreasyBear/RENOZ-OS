/**
 * Template Preview Component
 *
 * Displays a preview of the email template with sample data substituted.
 *
 * @see DOM-COMMS-007
 */

'use client';

import { sanitizeHtml } from '@/lib/utils';

interface TemplatePreviewProps {
  subject: string;
  body: string;
}

export function TemplatePreview({ subject, body }: TemplatePreviewProps) {
  return (
    <div className="bg-muted/20 min-h-[300px] rounded-md border" aria-label="preview-panel">
      {/* Subject Preview */}
      <div className="bg-muted/40 border-b p-3">
        <div className="text-muted-foreground mb-1 text-xs">Subject:</div>
        <div className="font-medium">{subject || '(No subject)'}</div>
      </div>
      {/* Body Preview */}
      <div className="p-4">
        <div className="text-muted-foreground mb-2 text-xs">Preview with sample data:</div>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(body) || '<p>No content</p>',
          }}
        />
      </div>
    </div>
  );
}
