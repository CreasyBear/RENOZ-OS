/**
 * QuickQuoteDialog Component
 *
 * Dialog wrapper for QuickQuoteForm for modal-based quote creation.
 * Can be triggered from anywhere in the app for rapid quoting.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-QUICK-QUOTE-UI)
 */

import { memo, useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuickQuoteFormContainer } from "./quick-quote-form-container";

// ============================================================================
// TYPES
// ============================================================================

export interface QuickQuoteDialogProps {
  opportunityId?: string;
  customerId?: string;
  onSuccess?: (quoteId: string) => void;
  trigger?: React.ReactNode;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const QuickQuoteDialog = memo(function QuickQuoteDialog({
  opportunityId,
  customerId,
  onSuccess,
  trigger,
  className,
}: QuickQuoteDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = (quoteId: string) => {
    setOpen(false);
    onSuccess?.(quoteId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className={className}>
            <Zap className="h-4 w-4 mr-2" />
            Quick Quote
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <QuickQuoteFormContainer
          opportunityId={opportunityId}
          customerId={customerId}
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
});

export default QuickQuoteDialog;
