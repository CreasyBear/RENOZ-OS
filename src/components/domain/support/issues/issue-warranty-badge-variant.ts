export function getWarrantyBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'expiring_soon':
      return 'secondary';
    case 'expired':
      return 'destructive';
    default:
      return 'outline';
  }
}
