/**
 * ReviewStep Component
 *
 * Final wizard step showing summary of all entered data:
 * - Customer information
 * - Contacts list
 * - Addresses list
 */
import { User, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { type ReviewStepProps, statusLabels, typeLabels } from '../types';

export function ReviewStep({ data }: ReviewStepProps) {
  const { customer, contacts, addresses } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-sm font-medium">Name</dt>
              <dd className="mt-1 font-medium">{customer.name}</dd>
            </div>
            {customer.legalName && (
              <div>
                <dt className="text-muted-foreground text-sm font-medium">Legal Name</dt>
                <dd className="mt-1">{customer.legalName}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground text-sm font-medium">Type</dt>
              <dd className="mt-1">
                <Badge variant="outline">{typeLabels[customer.type || 'business']}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm font-medium">Status</dt>
              <dd className="mt-1">
                <Badge variant="secondary">{statusLabels[customer.status || 'prospect']}</Badge>
              </dd>
            </div>
            {customer.industry && (
              <div>
                <dt className="text-muted-foreground text-sm font-medium">Industry</dt>
                <dd className="mt-1">{customer.industry}</dd>
              </div>
            )}
            {customer.email && (
              <div>
                <dt className="text-muted-foreground text-sm font-medium">Email</dt>
                <dd className="mt-1">{customer.email}</dd>
              </div>
            )}
            {customer.phone && (
              <div>
                <dt className="text-muted-foreground text-sm font-medium">Phone</dt>
                <dd className="mt-1">{customer.phone}</dd>
              </div>
            )}
          </dl>

          {customer.tags && customer.tags.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <dt className="text-muted-foreground mb-2 text-sm font-medium">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </dd>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacts ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No contacts added</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-muted/50 flex items-center gap-3 rounded-lg p-3"
                >
                  <User className="text-muted-foreground h-5 w-5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </span>
                      {contact.isPrimary && (
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    {contact.email && (
                      <p className="text-muted-foreground text-sm">{contact.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Addresses ({addresses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <p className="text-muted-foreground text-sm">No addresses added</p>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
                  <MapPin className="text-muted-foreground mt-0.5 h-5 w-5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{address.type}</span>
                      {address.isPrimary && (
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {address.street1}, {address.city} {address.state} {address.postcode}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
