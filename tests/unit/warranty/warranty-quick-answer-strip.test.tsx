import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WarrantyQuickAnswerStrip } from '@/components/domain/warranty/views/warranty-quick-answer-strip';
import { formatDateAustralian } from '@/lib/warranty';
import type { ComponentProps } from 'react';

type WarrantyQuickAnswerStripProps = ComponentProps<typeof WarrantyQuickAnswerStrip>;

function createWarranty(
  overrides: Partial<WarrantyQuickAnswerStripProps['warranty']> = {}
): WarrantyQuickAnswerStripProps['warranty'] {
  return {
    expiryDate: '2026-06-30T00:00:00.000Z',
    policyName: 'RENOZ Battery Warranty',
    serviceLinkageStatus: 'linked',
    ...overrides,
  };
}

describe('WarrantyQuickAnswerStrip', () => {
  it('renders the linked service-system, policy, and expiry context', () => {
    render(
      <WarrantyQuickAnswerStrip
        warranty={createWarranty()}
        daysUntilExpiry={45}
      />
    );

    expect(screen.getByText('45 Days Left')).toBeInTheDocument();
    expect(screen.getByText('Linked')).toBeInTheDocument();
    expect(screen.getByText('Policy: RENOZ Battery Warranty')).toBeInTheDocument();
    expect(
      screen.getByText(`Expires ${formatDateAustralian('2026-06-30T00:00:00.000Z', 'numeric')}`)
    ).toBeInTheDocument();
  });

  it('renders expired coverage explicitly', () => {
    render(
      <WarrantyQuickAnswerStrip
        warranty={createWarranty({ serviceLinkageStatus: 'owner_missing' })}
        daysUntilExpiry={0}
      />
    );

    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByText('Owner Missing')).toBeInTheDocument();
  });

  it('keeps urgent day counts visible before expiry', () => {
    render(
      <WarrantyQuickAnswerStrip
        warranty={createWarranty({ serviceLinkageStatus: 'pending_review' })}
        daysUntilExpiry={7}
      />
    );

    expect(screen.getByText('7 Days Left')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
  });
});
