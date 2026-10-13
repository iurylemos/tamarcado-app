import { ContactDocument } from '../model/contact.model';

export type InputContact = { connectionId: string; phone: string; name?: string };
export type SaveContactData = { contactId: string };

export type DocumentCreateContact = Omit<ContactDocument, 'createdAt' | 'updatedAt'> &
  Record<string, unknown>;
