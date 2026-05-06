export interface XeroTenantDisplayDescriptor {
  tenantId: string;
  tenantName?: string;
  tenantType?: string;
}

export function formatXeroTenantDisplayName(
  tenant: XeroTenantDisplayDescriptor,
  index: number
): string {
  const tenantName = tenant.tenantName?.trim();
  return tenantName || `Xero organization ${index + 1}`;
}

export function formatXeroTenantType(tenant: XeroTenantDisplayDescriptor): string {
  if (tenant.tenantType === 'ORGANISATION') {
    return 'Xero organization';
  }

  const tenantType = tenant.tenantType?.trim();
  return tenantType ? `Xero ${tenantType.toLowerCase()}` : 'Xero organization';
}
