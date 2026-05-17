import { memo, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPendingDialogInteractionGuards } from "@/components/ui/dialog-pending-guards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { CampaignDetailActionResult } from "@/lib/communications/campaign-detail-actions";

interface CampaignDetailTestSendDialogProps {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSendTestEmail: (testEmail: string) => Promise<CampaignDetailActionResult>;
}

export const CampaignDetailTestSendDialog = memo(
  function CampaignDetailTestSendDialog({
    open,
    isPending,
    onOpenChange,
    onSendTestEmail,
  }: CampaignDetailTestSendDialogProps) {
    const [testEmail, setTestEmail] = useState("");

    const pendingInteractionGuards = useMemo(
      () => createPendingDialogInteractionGuards(isPending),
      [isPending]
    );

    const handleCancel = useCallback(() => {
      onOpenChange(false);
      setTestEmail("");
    }, [onOpenChange]);

    const handleSendTestEmail = useCallback(async () => {
      if (!testEmail || isPending) return;

      const result = await onSendTestEmail(testEmail);

      if (result.status === "success") {
        onOpenChange(false);
        setTestEmail("");
      }
    }, [isPending, onOpenChange, onSendTestEmail, testEmail]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
          onInteractOutside={pendingInteractionGuards.onInteractOutside}
        >
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email for this campaign to verify how it looks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Test Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && testEmail && !isPending) {
                    handleSendTestEmail();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSendTestEmail}
              disabled={!testEmail || isPending}
            >
              {isPending ? "Sending..." : "Send Test Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);
