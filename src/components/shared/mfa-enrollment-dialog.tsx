/**
 * MFA Enrollment Dialog
 *
 * Guides users through setting up two-factor authentication:
 * 1. Shows QR code to scan with authenticator app
 * 2. Displays manual entry secret as fallback
 * 3. Verifies setup with a code from the app
 *
 * @see https://supabase.com/docs/guides/auth/auth-mfa/totp
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, CheckCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { useMFA, toast, type EnrollmentData } from '@/hooks';

interface MFAEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrolled: () => void;
}

type Step = 'loading' | 'scan' | 'verify' | 'success';

export function MFAEnrollmentDialog({ open, onOpenChange, onEnrolled }: MFAEnrollmentDialogProps) {
  const { startEnrollment, verifyEnrollment, error } = useMFA();

  const [step, setStep] = useState<Step>('loading');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  // Start enrollment when dialog opens
  useEffect(() => {
    if (open) {
      setStep('loading');
      setVerificationCode('');
      setSecretCopied(false);

      startEnrollment().then((data) => {
        if (data) {
          setEnrollmentData(data);
          setStep('scan');
        }
      });
    }
  }, [open, startEnrollment]);

  const handleCopySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setSecretCopied(true);
      toast.success('Secret copied to clipboard');
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const handleVerify = async () => {
    if (!enrollmentData || verificationCode.length !== 6) return;

    setVerifying(true);
    const success = await verifyEnrollment(enrollmentData.factorId, verificationCode);
    setVerifying(false);

    if (success) {
      setStep('success');
      toast.success('Two-factor authentication enabled!');
      setTimeout(() => {
        onEnrolled();
        onOpenChange(false);
      }, 1500);
    }
  };

  const handleCancel = () => {
    // If user cancels mid-enrollment, the unverified factor is auto-cleaned by Supabase
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="text-primary h-5 w-5" />
            Set Up Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Add an extra layer of security to your account using an authenticator app like Google
            Authenticator, Authy, or 1Password.
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            <p className="text-muted-foreground mt-4 text-sm">
              Generating your authentication key...
            </p>
          </div>
        )}

        {/* Scan QR Code Step */}
        {step === 'scan' && enrollmentData && (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="rounded-lg border bg-white p-4">
                <img
                  src={enrollmentData.qrCode}
                  alt="QR Code for authenticator app"
                  className="h-48 w-48"
                />
              </div>
            </div>

            <p className="text-muted-foreground text-center text-sm">
              Scan this QR code with your authenticator app
            </p>

            {/* Manual Entry Fallback */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                Can't scan? Enter this code manually:
              </Label>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 rounded-md px-3 py-2 font-mono text-xs break-all">
                  {enrollmentData.secret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                  className="shrink-0"
                >
                  {secretCopied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={() => setStep('verify')}>Continue</Button>
            </DialogFooter>
          </div>
        )}

        {/* Verify Code Step */}
        {step === 'verify' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Enter the 6-digit code from your app</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setVerificationCode(value);
                }}
                placeholder="000000"
                className="text-center font-mono text-2xl tracking-widest"
                autoFocus
              />
              <p className="text-muted-foreground text-xs">The code changes every 30 seconds</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setStep('scan')}>
                Back
              </Button>
              <Button onClick={handleVerify} disabled={verificationCode.length !== 6 || verifying}>
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Enable
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="mt-4 font-medium">Two-factor authentication enabled!</p>
            <p className="text-muted-foreground text-sm">Your account is now more secure</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
