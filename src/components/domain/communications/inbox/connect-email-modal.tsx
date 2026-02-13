/**
 * Connect Email Modal Component
 *
 * Modal wrapper for connecting email accounts.
 * Can be used from inbox empty state or other places.
 *
 * @see src/components/domain/communications/inbox/connect-gmail.tsx
 * @see src/components/domain/communications/inbox/connect-outlook.tsx
 */

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConnectGmail } from "./connect-gmail";
import { ConnectOutlook } from "./connect-outlook";

interface ConnectEmailModalProps {
  children: React.ReactNode;
}

export function ConnectEmailModal({ children }: ConnectEmailModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <div className="p-4">
          <DialogHeader>
            <DialogTitle>Connect Email Account</DialogTitle>
            <DialogDescription>
              Connect an external email account to sync emails into your unified inbox.
              Choose your email provider to get started.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col space-y-3 pt-4">
            <ConnectGmail />
            <ConnectOutlook />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
