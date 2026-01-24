/**
 * MFA Disable Confirmation Dialog
 *
 * Confirms user intent to disable two-factor authentication.
 * Requires entering current password or verification code.
 */
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldOff, AlertTriangle } from 'lucide-react';
import { useMFA, toast } from '@/hooks';

interface MFADisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
  onDisabled: () => void;
}

export function MFADisableDialog({
  open,
  onOpenChange,
  factorId,
  onDisabled,
}: MFADisableDialogProps) {
  const { unenroll, error } = useMFA();
  const [disabling, setDisabling] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDisable = async () => {
    setDisabling(true);
    const success = await unenroll(factorId);
    setDisabling(false);

    if (success) {
      toast.success('Two-factor authentication disabled');
      onDisabled();
      onOpenChange(false);
      setConfirmText('');
    }
  };

  const handleCancel = () => {
    setConfirmText('');
    onOpenChange(false);
  };

  const canDisable = confirmText.toLowerCase() === 'disable';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldOff className="h-5 w-5" />
            Disable Two-Factor Authentication?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Disabling 2FA will make your account less secure. Anyone with your password will be
                able to access your account.
              </p>

              <div className="flex items-start gap-3 rounded-lg bg-yellow-50 p-3 text-yellow-800">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm">
                  We strongly recommend keeping two-factor authentication enabled to protect your
                  account from unauthorized access.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-disable">
                  Type <strong>disable</strong> to confirm
                </Label>
                <Input
                  id="confirm-disable"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="disable"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDisable} disabled={!canDisable || disabling}>
            {disabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Disable 2FA
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
