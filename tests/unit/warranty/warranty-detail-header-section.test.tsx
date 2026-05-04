import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { WarrantyDetailHeaderSection } from '@/components/domain/warranty/views/warranty-detail-header-section';

type EntityHeaderProps = {
  name: string;
  subtitle?: ReactNode;
  status?: { value: string; variant?: string };
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
  onDelete?: () => void;
};

const entityHeaderCalls = vi.hoisted(() => [] as EntityHeaderProps[]);

vi.mock('@/components/shared', () => ({
  EntityHeader: (props: EntityHeaderProps) => {
    entityHeaderCalls.push(props);
    return (
      <div>
        <h1>{props.name}</h1>
        <div>{props.subtitle}</div>
        <div>{props.status?.value}</div>
        {props.primaryAction ? (
          <button
            type="button"
            disabled={props.primaryAction.disabled}
            onClick={props.primaryAction.onClick}
          >
            {props.primaryAction.label}
          </button>
        ) : null}
        {props.secondaryActions?.map((action) => (
          <button
            type="button"
            key={action.label}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
        {props.onDelete ? (
          <button type="button" onClick={props.onDelete}>
            Delete
          </button>
        ) : null}
      </div>
    );
  },
}));

type WarrantyDetailHeaderSectionProps = ComponentProps<typeof WarrantyDetailHeaderSection>;

function createWarranty(
  overrides: Partial<WarrantyDetailHeaderSectionProps['warranty']> = {}
): WarrantyDetailHeaderSectionProps['warranty'] {
  return {
    warrantyNumber: 'WAR-001',
    productName: 'RENOZ 48V Battery',
    currentOwner: null,
    ownerRecord: {
      id: 'owner-1',
      fullName: 'Ava Owner',
      email: null,
      phone: null,
      address: null,
      notes: null,
    },
    customerName: 'Acme Energy',
    status: 'active',
    ...overrides,
  };
}

function createProps(
  overrides: Partial<WarrantyDetailHeaderSectionProps> = {}
): WarrantyDetailHeaderSectionProps {
  return {
    warranty: createWarranty(),
    sidebarContent: <div>Sidebar summary</div>,
    headerActionsInLayout: false,
    certificateStatus: { exists: false, certificateUrl: null },
    isSubmittingClaim: false,
    isSubmittingExtend: false,
    isCertificateLoading: false,
    isCertificateRegenerating: false,
    isCertificateGenerating: false,
    onClaimDialogOpenChange: vi.fn(),
    onExtendDialogOpenChange: vi.fn(),
    onDownloadCertificate: vi.fn(),
    onRegenerateCertificate: vi.fn(),
    onGenerateCertificate: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

describe('WarrantyDetailHeaderSection', () => {
  it('renders warranty identity and routes primary, extension, and generate actions', () => {
    entityHeaderCalls.length = 0;
    const onClaimDialogOpenChange = vi.fn();
    const onExtendDialogOpenChange = vi.fn();
    const onGenerateCertificate = vi.fn();

    render(
      <WarrantyDetailHeaderSection
        {...createProps({
          onClaimDialogOpenChange,
          onExtendDialogOpenChange,
          onGenerateCertificate,
        })}
      />
    );

    expect(screen.getByText('Warranty WAR-001')).toBeInTheDocument();
    expect(screen.getByText('RENOZ 48V Battery · Ava Owner')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'File a Claim' }));
    fireEvent.click(screen.getByRole('button', { name: 'Extend Warranty' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate Certificate' }));

    expect(onClaimDialogOpenChange).toHaveBeenCalledWith(true);
    expect(onExtendDialogOpenChange).toHaveBeenCalledWith(true);
    expect(onGenerateCertificate).toHaveBeenCalledTimes(1);
    expect(entityHeaderCalls[0]?.primaryAction?.label).toBe('File a Claim');
  });

  it('uses existing certificate actions when a certificate exists', () => {
    const onDownloadCertificate = vi.fn();
    const onRegenerateCertificate = vi.fn();

    render(
      <WarrantyDetailHeaderSection
        {...createProps({
          certificateStatus: { exists: true, certificateUrl: '/certificate.pdf' },
          onDownloadCertificate,
          onRegenerateCertificate,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'View Certificate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate Certificate' }));

    expect(onDownloadCertificate).toHaveBeenCalledTimes(1);
    expect(onRegenerateCertificate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Generate Certificate' })).not.toBeInTheDocument();
  });

  it('locks certificate actions while certificate status is loading', () => {
    render(
      <WarrantyDetailHeaderSection
        {...createProps({
          isCertificateLoading: true,
        })}
      />
    );

    expect(screen.getByRole('button', { name: 'Loading certificate status...' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Generate Certificate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Certificate' })).not.toBeInTheDocument();
  });

  it('omits header actions when page layout owns them', () => {
    render(
      <WarrantyDetailHeaderSection
        {...createProps({
          headerActionsInLayout: true,
        })}
      />
    );

    expect(screen.getByText('Warranty WAR-001')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'File a Claim' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Extend Warranty' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('keeps mobile sidebar access attached to the header section', () => {
    render(<WarrantyDetailHeaderSection {...createProps()} />);

    expect(screen.getByRole('button', { name: 'Toggle warranty sidebar' })).toBeInTheDocument();
  });
});
