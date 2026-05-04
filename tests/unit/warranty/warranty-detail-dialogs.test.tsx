import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { WarrantyDetailDialogs } from '@/components/domain/warranty/views/warranty-detail-dialogs';

type WarrantyClaimFormDialogCall = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: {
    id: string;
    warrantyNumber: string;
    productName?: string;
    commercialCustomerId?: string;
    commercialCustomerName?: string;
    ownerRecord?: {
      fullName: string;
      email?: string | null;
      phone?: string | null;
    } | null;
    status: string;
    policyType?: string;
    currentCycleCount?: number;
    cycleLimit?: number;
  };
  onSubmit: unknown;
  isSubmitting?: boolean;
  onSuccess?: () => void;
};

type ClaimApprovalDialogCall = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: {
    id: string;
    claimNumber: string;
    claimType: string;
    status: string;
    description: string;
    cost?: number | null;
    submittedAt: string | Date;
    cycleCountAtClaim?: number | null;
    warranty: {
      warrantyNumber: string;
      productSerial?: string | null;
    };
    customer: {
      name: string;
    };
    product: {
      name: string;
    };
  };
  onApprove: unknown;
  onDeny: unknown;
  onRequestInfo: unknown;
  isSubmitting?: boolean;
  onSuccess?: () => void;
};

type ExtendWarrantyDialogCall = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: {
    id: string;
    warrantyNumber: string;
    productName?: string;
    customerName?: string;
    expiryDate: Date | string;
    status?: string;
  };
  onSubmit: unknown;
  isSubmitting?: boolean;
  onSuccess?: () => void;
};

const dialogCalls = vi.hoisted(() => ({
  claimForm: [] as WarrantyClaimFormDialogCall[],
  approval: [] as ClaimApprovalDialogCall[],
  extension: [] as ExtendWarrantyDialogCall[],
}));

vi.mock('@/components/domain/warranty/dialogs/warranty-claim-form-dialog', () => ({
  WarrantyClaimFormDialog: (props: WarrantyClaimFormDialogCall) => {
    dialogCalls.claimForm.push(props);
    return <div data-testid="claim-form-dialog" />;
  },
}));

vi.mock('@/components/domain/warranty/dialogs/claim-approval-dialog', () => ({
  ClaimApprovalDialog: (props: ClaimApprovalDialogCall) => {
    dialogCalls.approval.push(props);
    return <div data-testid="claim-approval-dialog" />;
  },
}));

vi.mock('@/components/domain/warranty/dialogs/extend-warranty-dialog', () => ({
  ExtendWarrantyDialog: (props: ExtendWarrantyDialogCall) => {
    dialogCalls.extension.push(props);
    return <div data-testid="extend-warranty-dialog" />;
  },
}));

type WarrantyDetailDialogsProps = ComponentProps<typeof WarrantyDetailDialogs>;

function createWarranty(
  overrides: Partial<WarrantyDetailDialogsProps['warranty']> = {}
): WarrantyDetailDialogsProps['warranty'] {
  return {
    id: 'warranty-1',
    warrantyNumber: 'WAR-001',
    productName: 'RENOZ 48V Battery',
    customerId: 'customer-1',
    customerName: 'Acme Energy',
    ownerRecord: {
      id: 'owner-1',
      fullName: 'Ava Owner',
      email: 'ava@example.com',
      phone: '+61 400 000 000',
      address: null,
      notes: null,
    },
    status: 'active',
    policyType: 'battery_performance',
    currentCycleCount: 412,
    cycleLimit: 6000,
    productSerial: 'REN-48V-0001',
    expiryDate: '2028-01-15',
    ...overrides,
  };
}

function createApprovalClaim(
  overrides: Partial<WarrantyDetailDialogsProps['approvalClaim']> = {}
): NonNullable<WarrantyDetailDialogsProps['approvalClaim']> {
  return {
    id: 'claim-1',
    claimNumber: 'CLM-001',
    claimType: 'cell_degradation',
    status: 'submitted',
    description: 'Battery capacity has degraded below expected performance.',
    cost: 450,
    submittedAt: '2026-05-01T00:00:00.000Z',
    cycleCountAtClaim: 400,
    customer: {
      name: 'Acme Energy',
    },
    product: {
      name: 'RENOZ 48V Battery',
    },
    ...overrides,
  };
}

function createProps(
  overrides: Partial<WarrantyDetailDialogsProps> = {}
): WarrantyDetailDialogsProps {
  return {
    warranty: createWarranty(),
    approvalClaim: null,
    isClaimDialogOpen: true,
    isApprovalDialogOpen: false,
    isExtendDialogOpen: true,
    isSubmittingClaim: true,
    isSubmittingApproval: false,
    isSubmittingExtend: true,
    onClaimDialogOpenChange: vi.fn(),
    onApprovalDialogOpenChange: vi.fn(),
    onExtendDialogOpenChange: vi.fn(),
    onSubmitClaim: vi.fn(async () => {}),
    onApproveClaim: vi.fn(async () => {}),
    onDenyClaim: vi.fn(async () => {}),
    onRequestInfoClaim: vi.fn(async () => {}),
    onExtendWarranty: vi.fn(async () => {}),
    onClaimsSuccess: vi.fn(),
    onExtensionsSuccess: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  dialogCalls.claimForm.length = 0;
  dialogCalls.approval.length = 0;
  dialogCalls.extension.length = 0;
});

describe('WarrantyDetailDialogs', () => {
  it('passes claim filing and extension dialog contracts through unchanged', () => {
    const props = createProps();

    render(<WarrantyDetailDialogs {...props} />);

    expect(screen.getByTestId('claim-form-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('extend-warranty-dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('claim-approval-dialog')).not.toBeInTheDocument();

    expect(dialogCalls.claimForm[0]).toMatchObject({
      open: true,
      isSubmitting: true,
      warranty: {
        id: 'warranty-1',
        warrantyNumber: 'WAR-001',
        productName: 'RENOZ 48V Battery',
        commercialCustomerId: 'customer-1',
        commercialCustomerName: 'Acme Energy',
        ownerRecord: {
          fullName: 'Ava Owner',
          email: 'ava@example.com',
          phone: '+61 400 000 000',
        },
        status: 'active',
        policyType: 'battery_performance',
        currentCycleCount: 412,
        cycleLimit: 6000,
      },
    });
    expect(dialogCalls.claimForm[0]?.onOpenChange).toBe(props.onClaimDialogOpenChange);
    expect(dialogCalls.claimForm[0]?.onSubmit).toBe(props.onSubmitClaim);
    expect(dialogCalls.claimForm[0]?.onSuccess).toBe(props.onClaimsSuccess);

    expect(dialogCalls.extension[0]).toMatchObject({
      open: true,
      isSubmitting: true,
      warranty: {
        id: 'warranty-1',
        warrantyNumber: 'WAR-001',
        productName: 'RENOZ 48V Battery',
        customerName: 'Acme Energy',
        expiryDate: '2028-01-15',
        status: 'active',
      },
    });
    expect(dialogCalls.extension[0]?.onOpenChange).toBe(props.onExtendDialogOpenChange);
    expect(dialogCalls.extension[0]?.onSubmit).toBe(props.onExtendWarranty);
    expect(dialogCalls.extension[0]?.onSuccess).toBe(props.onExtensionsSuccess);
  });

  it('maps a selected approval claim with warranty serial and review callbacks', () => {
    const props = createProps({
      approvalClaim: createApprovalClaim(),
      isApprovalDialogOpen: true,
      isSubmittingApproval: true,
    });

    render(<WarrantyDetailDialogs {...props} />);

    expect(screen.getByTestId('claim-approval-dialog')).toBeInTheDocument();
    expect(dialogCalls.approval[0]).toMatchObject({
      open: true,
      isSubmitting: true,
      claim: {
        id: 'claim-1',
        claimNumber: 'CLM-001',
        claimType: 'cell_degradation',
        status: 'submitted',
        description: 'Battery capacity has degraded below expected performance.',
        cost: 450,
        submittedAt: '2026-05-01T00:00:00.000Z',
        cycleCountAtClaim: 400,
        warranty: {
          warrantyNumber: 'WAR-001',
          productSerial: 'REN-48V-0001',
        },
        customer: {
          name: 'Acme Energy',
        },
        product: {
          name: 'RENOZ 48V Battery',
        },
      },
    });
    expect(dialogCalls.approval[0]?.onOpenChange).toBe(props.onApprovalDialogOpenChange);
    expect(dialogCalls.approval[0]?.onApprove).toBe(props.onApproveClaim);
    expect(dialogCalls.approval[0]?.onDeny).toBe(props.onDenyClaim);
    expect(dialogCalls.approval[0]?.onRequestInfo).toBe(props.onRequestInfoClaim);
    expect(dialogCalls.approval[0]?.onSuccess).toBe(props.onClaimsSuccess);
  });

  it('uses honest fallback labels for incomplete approval claim context', () => {
    render(
      <WarrantyDetailDialogs
        {...createProps({
          approvalClaim: createApprovalClaim({
            customer: { name: null },
            product: null,
          }),
        })}
      />
    );

    expect(dialogCalls.approval[0]?.claim.customer.name).toBe('Unknown Customer');
    expect(dialogCalls.approval[0]?.claim.product.name).toBe('Unknown Product');
  });

  it('keeps nullable warranty labels out of child dialog props', () => {
    render(
      <WarrantyDetailDialogs
        {...createProps({
          warranty: createWarranty({
            productName: null,
            customerName: null,
            ownerRecord: null,
            currentCycleCount: null,
            cycleLimit: null,
          }),
        })}
      />
    );

    expect(dialogCalls.claimForm[0]?.warranty.productName).toBeUndefined();
    expect(dialogCalls.claimForm[0]?.warranty.commercialCustomerName).toBeUndefined();
    expect(dialogCalls.claimForm[0]?.warranty.ownerRecord).toBeNull();
    expect(dialogCalls.claimForm[0]?.warranty.currentCycleCount).toBeUndefined();
    expect(dialogCalls.claimForm[0]?.warranty.cycleLimit).toBeUndefined();
    expect(dialogCalls.extension[0]?.warranty.productName).toBeUndefined();
    expect(dialogCalls.extension[0]?.warranty.customerName).toBeUndefined();
  });
});
