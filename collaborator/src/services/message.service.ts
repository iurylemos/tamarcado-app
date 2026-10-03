import { collection, onSnapshot, query, where, type DocumentData } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Contact } from '@shared/interfaces/contact.interface';
import type { Message } from '@shared/interfaces/message.interface';
import { db, functions } from '../config/firebase.config';

export interface Connection {
  id: string;
  provider: string;
  status: string;
}

type Unsubscribe = () => void;

function toDate(value: unknown): Date {
  return typeof value === 'object' && value !== null && 'toDate' in value
    ? (value as { toDate(): Date }).toDate()
    : new Date(0);
}

function subscribe<T>(
  name: string,
  tenantId: string,
  map: (id: string, data: DocumentData) => T,
  onData: (items: T[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, name), where('tenantId', '==', tenantId)),
    (snapshot) => onData(snapshot.docs.map((document) => map(document.id, document.data()))),
    onError,
  );
}

export function subscribeConnections(
  tenantId: string,
  onData: (items: Connection[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribe(
    'connections',
    tenantId,
    (id, data) => ({
      id,
      provider: String(data.provider ?? ''),
      status: String(data.status ?? ''),
    }),
    onData,
    onError,
  );
}

export function subscribeContacts(
  tenantId: string,
  onData: (items: Contact[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribe(
    'contacts',
    tenantId,
    (id, data): Contact => ({
      id,
      tenantId: data.tenantId,
      connectionId: data.connectionId,
      phoneE164: data.phoneE164,
      whatsappOptIn: data.whatsappOptIn === true,
      ...(data.name ? { name: data.name } : {}),
    }),
    onData,
    onError,
  );
}

export function subscribeMessages(
  tenantId: string,
  onData: (items: Message[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribe(
    'messages',
    tenantId,
    (id, data): Message => ({
      id,
      tenantId: data.tenantId,
      connectionId: data.connectionId,
      contactId: data.contactId,
      direction: data.direction,
      content: data.content,
      status: data.status,
      ...(data.failureCode ? { failureCode: data.failureCode } : {}),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    }),
    (items) => onData(items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())),
    onError,
  );
}

export async function createContact(input: {
  connectionId: string;
  phone: string;
  name?: string;
}): Promise<void> {
  await httpsCallable(functions, 'createContact')(input);
}

export async function setContactConsent(contactId: string, optIn: boolean): Promise<void> {
  await httpsCallable(functions, 'setContactConsent')({ contactId, optIn });
}
