'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WarrantyCertificateStatus } from '@/lib/schemas/warranty';

interface WarrantyCertificateStatusCardProps {
  certificateStatus: WarrantyCertificateStatus | null | undefined;
  isCertificateLoading: boolean;
  certificateError?: string | null;
  onRetryCertificate?: () => void;
}

export function WarrantyCertificateStatusCard({
  certificateStatus,
  isCertificateLoading,
  certificateError,
  onRetryCertificate,
}: WarrantyCertificateStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Certificate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          {certificateError
            ? 'Certificate status is temporarily unavailable.'
            : isCertificateLoading
              ? 'Checking certificate status...'
              : certificateStatus?.exists
                ? 'Certificate available in the Actions menu.'
                : 'No certificate generated yet.'}
        </p>
        {certificateError && onRetryCertificate ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{certificateError}</span>
              <Button variant="outline" size="sm" onClick={onRetryCertificate}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
