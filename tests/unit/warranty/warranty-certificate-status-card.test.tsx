import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WarrantyCertificateStatusCard } from '@/components/domain/warranty/views/warranty-certificate-status-card';

describe('WarrantyCertificateStatusCard', () => {
  it('shows unavailable status and retry without pretending no certificate exists', () => {
    const onRetryCertificate = vi.fn();

    render(
      <WarrantyCertificateStatusCard
        certificateStatus={undefined}
        isCertificateLoading={false}
        certificateError="Warranty certificate status is temporarily unavailable. Please refresh and try again."
        onRetryCertificate={onRetryCertificate}
      />
    );

    expect(screen.getByText('Certificate status is temporarily unavailable.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Warranty certificate status is temporarily unavailable. Please refresh and try again.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('No certificate generated yet.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetryCertificate).toHaveBeenCalledTimes(1);
  });

  it('shows loading status while certificate lookup is pending', () => {
    render(
      <WarrantyCertificateStatusCard
        certificateStatus={undefined}
        isCertificateLoading
        certificateError={null}
      />
    );

    expect(screen.getByText('Checking certificate status...')).toBeInTheDocument();
  });

  it('shows available status when the certificate exists', () => {
    render(
      <WarrantyCertificateStatusCard
        certificateStatus={{ exists: true, certificateUrl: '/certificates/warranty-1.pdf' }}
        isCertificateLoading={false}
        certificateError={null}
      />
    );

    expect(screen.getByText('Certificate available in the Actions menu.')).toBeInTheDocument();
  });

  it('shows missing status only after a successful empty lookup', () => {
    render(
      <WarrantyCertificateStatusCard
        certificateStatus={{ exists: false, certificateUrl: null }}
        isCertificateLoading={false}
        certificateError={null}
      />
    );

    expect(screen.getByText('No certificate generated yet.')).toBeInTheDocument();
  });
});
