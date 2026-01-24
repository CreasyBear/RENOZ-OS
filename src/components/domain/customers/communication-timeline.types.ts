export type CommunicationType = 'email' | 'phone' | 'meeting' | 'portal' | 'note';
export type CommunicationDirection = 'inbound' | 'outbound' | 'internal';
export type CommunicationStatus = 'sent' | 'delivered' | 'read' | 'replied' | 'failed';

export interface Communication {
  id: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  status?: CommunicationStatus;
  subject: string;
  preview: string;
  content?: string;
  from: {
    name: string;
    email?: string;
  };
  to?: {
    name: string;
    email?: string;
  };
  timestamp: string;
  duration?: number; // For calls, in seconds
  attachments?: number;
  contactId?: string;
  customerId: string;
}
