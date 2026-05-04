import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SerialNumbersList } from '../components/serial-numbers-list';

export interface ShipmentCardDetailItem {
  id: string;
  orderLineItemId: string;
  quantity: number;
  serialNumbers?: string[] | null;
}

export interface ShipmentCardTrackingEvent {
  timestamp: string | Date;
  status: string;
  description?: string | null;
  location?: string | null;
}

export interface ShipmentCardDeliveryConfirmation {
  signedBy?: string | null;
  notes?: string | null;
}

export interface ShipmentCardDetailShipment {
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | Date | null;
  estimatedDeliveryAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  items: ShipmentCardDetailItem[];
  trackingEvents?: ShipmentCardTrackingEvent[] | null;
  deliveryConfirmation?: ShipmentCardDeliveryConfirmation | null;
}

export interface ShipmentCardDetailsProps {
  shipment: ShipmentCardDetailShipment;
}

export function ShipmentCardDetails({ shipment }: ShipmentCardDetailsProps) {
  return (
    <>
      {shipment.trackingNumber ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Tracking Number</p>
            <p className="font-mono">{shipment.trackingNumber}</p>
          </div>
          {shipment.trackingUrl ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(shipment.trackingUrl ?? undefined, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <>
                      Track
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open carrier tracking page</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-4 text-sm">
        {shipment.shippedAt ? (
          <div>
            <p className="text-muted-foreground">Shipped</p>
            <p>{format(new Date(shipment.shippedAt), 'dd/MM/yyyy')}</p>
          </div>
        ) : null}
        {shipment.estimatedDeliveryAt ? (
          <div>
            <p className="text-muted-foreground">Est. Delivery</p>
            <p>{format(new Date(shipment.estimatedDeliveryAt), 'dd/MM/yyyy')}</p>
          </div>
        ) : null}
        {shipment.deliveredAt ? (
          <div>
            <p className="text-muted-foreground">Delivered</p>
            <p>{format(new Date(shipment.deliveredAt), 'dd/MM/yyyy')}</p>
          </div>
        ) : null}
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="items" className="border-none">
          <AccordionTrigger className="py-2 text-sm">
            {shipment.items.length} item{shipment.items.length !== 1 ? 's' : ''} in this shipment
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-2">
              {shipment.items.map((item) => (
                <div key={item.id} className="py-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Line Item #{item.orderLineItemId.slice(0, 8)}...</span>
                    <span className="font-medium">Qty: {item.quantity}</span>
                  </div>
                  {item.serialNumbers && item.serialNumbers.length > 0 ? (
                    <div className="mt-1">
                      <SerialNumbersList serials={item.serialNumbers} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {shipment.trackingEvents && shipment.trackingEvents.length > 0 ? (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="events" className="border-none">
            <AccordionTrigger className="py-2 text-sm">
              Tracking History ({shipment.trackingEvents.length} events)
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {[...shipment.trackingEvents].reverse().map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm py-1">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{event.status}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.timestamp), 'dd/MM HH:mm')}
                        </span>
                      </div>
                      {event.description ? (
                        <p className="text-muted-foreground">{event.description}</p>
                      ) : null}
                      {event.location ? (
                        <p className="text-xs text-muted-foreground">{event.location}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}

      {shipment.deliveryConfirmation ? (
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm font-medium text-green-800 mb-1">Delivery Confirmed</p>
          {shipment.deliveryConfirmation.signedBy ? (
            <p className="text-sm text-green-700">
              Signed by: {shipment.deliveryConfirmation.signedBy}
            </p>
          ) : null}
          {shipment.deliveryConfirmation.notes ? (
            <p className="text-sm text-green-600 mt-1">
              {shipment.deliveryConfirmation.notes}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
