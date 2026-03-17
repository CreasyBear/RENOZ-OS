import { useMemo, useState } from 'react';
import { Building2, ExternalLink, Loader2, Link2, Plus, RefreshCw, Unlink2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DynamicLink } from '@/components/ui/dynamic-link';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import { Separator } from '@/components/ui/separator';
import { useConfirmation } from '@/hooks';
import {
  useCreateCustomerXeroContact,
  useCustomerXeroMapping,
  useLinkCustomerXeroContact,
  useSearchCustomerXeroContacts,
  useUnlinkCustomerXeroContact,
} from '@/hooks/customers';
import { cn } from '@/lib/utils';

interface XeroContactManagerProps {
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  legalName?: string | null;
  className?: string;
}

export function XeroContactManager({
  customerId,
  customerName,
  customerEmail,
  customerPhone,
  legalName,
  className,
}: XeroContactManagerProps) {
  const confirm = useConfirmation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState(customerEmail?.trim() || customerName);

  const mappingQuery = useCustomerXeroMapping(customerId);
  const mapping = mappingQuery.data;
  const searchQuery = useSearchCustomerXeroContacts(customerId, query, dialogOpen);
  const createMutation = useCreateCustomerXeroContact();
  const linkMutation = useLinkCustomerXeroContact();
  const unlinkMutation = useUnlinkCustomerXeroContact();

  const suggestions = searchQuery.data ?? [];
  const suggestedQuery = useMemo(
    () => customerEmail?.trim() || legalName?.trim() || customerName,
    [customerEmail, legalName, customerName]
  );

  const isBusy =
    mappingQuery.isLoading ||
    searchQuery.isLoading ||
    createMutation.isPending ||
    linkMutation.isPending ||
    unlinkMutation.isPending;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isBusy);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isBusy, setDialogOpen);

  const handleCreateContact = async () => {
    try {
      await createMutation.mutateAsync(customerId);
      toast.success('Xero contact created and linked', {
        description: 'Customer linked. You can now retry invoice sync.',
      });
      setDialogOpen(false);
    } catch (error) {
      toast.error('Failed to create Xero contact', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleLink = async (xeroContactId: string) => {
    try {
      await linkMutation.mutateAsync({ customerId, xeroContactId });
      toast.success('Customer linked to Xero contact', {
        description: 'Customer linked. You can now retry invoice sync.',
      });
      setDialogOpen(false);
    } catch (error) {
      toast.error('Failed to link Xero contact', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleUnlink = async () => {
    const { confirmed } = await confirm.confirm({
      title: 'Unlink Xero Contact',
      description:
        'This removes the trusted Xero contact mapping for this customer. Invoice sync will fail closed until a new mapping is linked.',
      confirmLabel: 'Unlink Contact',
      variant: 'destructive',
    });

    if (!confirmed) {
      return;
    }

    try {
      await unlinkMutation.mutateAsync(customerId);
      toast.success('Xero contact mapping removed');
    } catch (error) {
      toast.error('Failed to unlink Xero contact', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" />
          Xero Contact
        </CardTitle>
        <CardDescription>
          Map this customer to a trusted Xero contact so invoice sync can proceed safely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mapping?.xeroContactId ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Link2 className="h-3 w-3" />
                    Linked
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {mapping.xeroContactId}
                  </span>
                </div>
                <p className="font-medium">
                  {mapping.mappedContact?.name ?? 'Mapped contact not currently readable from Xero'}
                </p>
                {mapping.mappedContact?.email ? (
                  <p className="text-sm text-muted-foreground">{mapping.mappedContact.email}</p>
                ) : null}
                {mapping.mappedContact?.phones?.[0]?.number ? (
                  <p className="text-sm text-muted-foreground">
                    {mapping.mappedContact.phones[0].number}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlink}
                  disabled={unlinkMutation.isPending}
                >
                  {unlinkMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink2 className="mr-2 h-4 w-4" />
                  )}
                  Unlink
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertTitle>No trusted Xero contact linked</AlertTitle>
            <AlertDescription>
              Invoice sync is blocked for this customer until a Xero contact is linked or created.
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border border-dashed p-4">
          <div className="text-sm font-medium">Renoz customer profile</div>
          <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <span className="font-medium text-foreground">Name:</span> {customerName}
            </div>
            <div>
              <span className="font-medium text-foreground">Legal name:</span> {legalName || 'Not set'}
            </div>
            <div>
              <span className="font-medium text-foreground">Email:</span> {customerEmail || 'Not set'}
            </div>
            <div>
              <span className="font-medium text-foreground">Phone:</span> {customerPhone || 'Not set'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setDialogOpen(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {mapping?.xeroContactId ? 'Search or Replace Mapping' : 'Search Xero Contacts'}
          </Button>
          <Button type="button" onClick={handleCreateContact} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create Xero Contact
          </Button>
          <Button variant="ghost" asChild>
            <DynamicLink
              to="/financial/xero-sync"
              search={{ view: 'invoice_sync', issue: 'missing_contact_mapping', customerId }}
            >
              View Xero blockers
            </DynamicLink>
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent
            className="max-w-2xl"
            onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
            onInteractOutside={pendingInteractionGuards.onInteractOutside}
          >
            <DialogHeader>
              <DialogTitle>Map Xero Contact</DialogTitle>
              <DialogDescription>
                Search by customer name, legal name, email, or phone and explicitly choose the
                Xero contact to trust.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Xero contacts"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuery(suggestedQuery)}
                  disabled={!suggestedQuery}
                >
                  Use Suggestion
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  Suggested lookup: <strong>{suggestedQuery}</strong>
                  {customerPhone ? ` • ${customerPhone}` : ''}
                </AlertDescription>
              </Alert>

              <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {searchQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching Xero contacts...
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      className={cn(
                        'w-full rounded-lg border p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/20'
                      )}
                      onClick={() => handleLink(contact.id)}
                      disabled={linkMutation.isPending}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{contact.name}</p>
                          </div>
                          {contact.email ? (
                            <p className="text-sm text-muted-foreground">{contact.email}</p>
                          ) : null}
                          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                            <div>Renoz email: {customerEmail || 'Not set'}</div>
                            <div>Xero email: {contact.email || 'Not set'}</div>
                            <div>Renoz phone: {customerPhone || 'Not set'}</div>
                            <div>
                              Xero phone: {contact.phones?.[0]?.number || contact.contactNumber || 'Not set'}
                            </div>
                          </div>
                          {contact.phones?.[0]?.number ? (
                            <p className="text-sm text-muted-foreground">
                              {contact.phones[0].number}
                            </p>
                          ) : null}
                          <p className="font-mono text-xs text-muted-foreground">{contact.id}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {mapping?.xeroContactId ? (
                            <Badge variant="outline">Replacement candidate</Badge>
                          ) : (
                            <Badge variant="outline">Link candidate</Badge>
                          )}
                          <Badge variant="secondary">{contact.matchReason.replace(/_/g, ' ')}</Badge>
                        </div>
                      </div>
                    </button>
                  ))
                ) : query.trim().length >= 2 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No matching Xero contacts found for this query.
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Type at least 2 characters to search Xero contacts.
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  No safe match? Create a new Xero contact from this customer profile instead.
                </div>
                <Button type="button" onClick={handleCreateContact} disabled={isBusy}>
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create and Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {mapping?.xeroContactId ? (
          <a
            href="https://go.xero.com/Contacts/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Open Xero contacts
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
