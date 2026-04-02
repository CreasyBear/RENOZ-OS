import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { XeroContactManager } from '@/components/domain/customers/components/xero-contact-manager';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, className, ...props }: any) => {
    const href =
      typeof to === 'string'
        ? `${to}${search ? `?${new URLSearchParams(search).toString()}` : ''}`
        : '#';
    return (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock('@/hooks', () => ({
  useConfirmation: () => ({
    confirm: vi.fn().mockResolvedValue({ confirmed: false, status: 'cancelled' }),
  }),
}));

vi.mock('@/hooks/customers', () => ({
  useCustomerXeroMapping: () => ({
    data: { customerId: 'customer-1', xeroContactId: null, mappedContact: null },
    isLoading: false,
  }),
  useSearchCustomerXeroContacts: () => ({
    data: [],
    isLoading: false,
  }),
  useCreateCustomerXeroContact: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useLinkCustomerXeroContact: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useUnlinkCustomerXeroContact: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

describe('XeroContactManager', () => {
  it('renders the Xero blockers link without crashing the customer edit section', () => {
    render(
      <XeroContactManager
        customerId="customer-1"
        customerName="Acme Solar"
        customerEmail="ops@acme.test"
        customerPhone="0400000000"
        legalName="Acme Solar Pty Ltd"
      />
    );

    expect(screen.getByText('Xero Contact', { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view xero blockers/i })).toHaveAttribute(
      'href',
      '/financial/xero-sync?view=invoice_sync&issue=missing_contact_mapping&customerId=customer-1'
    );
  });
});
