import { useEffect, useState, type FormEvent, type JSX } from 'react';
import type { Contact } from '@shared/interfaces/contact.interface';
import type { Message, MessageStatus } from '@shared/interfaces/message.interface';
import type { MessageConnection } from '../interfaces/message.interface';
import { useAuth } from '../contexts/auth/auth.context';
import {
  createContact,
  setContactConsent,
  subscribeConnections,
  subscribeContacts,
  subscribeMessages,
} from '../services/message.service';
import { ErrorUtil } from '../utils/error.util';
import { PhoneUtil } from '../utils/phone.util';

const statusLabels: Record<MessageStatus, string> = {
  pending: 'Pendente',
  sent: 'Enviada',
  delivered: 'Entregue',
  read: 'Lida',
  failed: 'Falhou',
};

export default function MessagesPage(): JSX.Element {
  const { tenantId } = useAuth();

  const [connections, setConnections] = useState<MessageConnection[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');

  useEffect(() => {
    if (!tenantId) return;

    const fail = (subscriptionError: Error): void => {
      setError(
        ErrorUtil.formatMessage(subscriptionError, 'Não foi possível carregar as mensagens.'),
      );
      setLoading(false);
    };

    const stops = [
      subscribeConnections(tenantId, setConnections, fail),
      subscribeContacts(
        tenantId,
        (items) => {
          setContacts(items);
          setLoading(false);
        },
        fail,
      ),
      subscribeMessages(tenantId, setMessages, fail),
    ];

    return () => stops.forEach((stop) => stop());
  }, [tenantId]);

  const run = async (action: () => Promise<void>, success: string): Promise<void> => {
    setError('');
    setFeedback('');

    try {
      await action();
      setFeedback(success);
    } catch (actionError: unknown) {
      setError(ErrorUtil.formatMessage(actionError, 'Não foi possível concluir a operação.'));
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const connection = connections[0];

    if (!connection) {
      setError('Nenhuma conexão disponível para cadastrar contatos.');
      return;
    }

    await run(async () => {
      await createContact({ connectionId: connection.id, phone, ...(name ? { name } : {}) });
      setPhone('');
      setName('');
    }, 'Contato cadastrado sem consentimento de WhatsApp.');
  };

  const contactName = (contactId: string): string => {
    const contact = contacts.find((item) => item.id === contactId);
    return contact?.name || (contact ? PhoneUtil.maskedPhone(contact.phoneE164) : 'Contato');
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Relacionamento</p>
          <h1>Mensagens</h1>
          <p className="muted">Contatos, consentimento e status de entrega das mensagens.</p>
        </div>
      </header>
      {error && (
        <p className="feedback feedback--error" role="alert">
          {error}
        </p>
      )}
      {feedback && <p role="status">{feedback}</p>}

      <form className="panel editor-form" onSubmit={(event) => void handleCreate(event)}>
        <h2>Novo contato</h2>
        <label>
          Nome do contato
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Telefone do contato
          <input
            type="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <button type="submit" className="button">
          Cadastrar contato
        </button>
      </form>

      <h2>Contatos</h2>
      {loading ? (
        <p role="status">Carregando contatos…</p>
      ) : contacts.length ? (
        <ul className="customer-list" aria-label="Contatos">
          {contacts.map((contact) => (
            <li key={contact.id} className="customer-card">
              <div>
                <strong>{contact.name || 'Contato'}</strong>
                <p className="muted">{PhoneUtil.maskedPhone(contact.phoneE164)}</p>
              </div>
              <span>{contact.whatsappOptIn ? 'Consentimento ativo' : 'Sem consentimento'}</span>
              <button
                type="button"
                className="button button--secondary"
                onClick={() =>
                  void run(
                    () => setContactConsent(contact.id, !contact.whatsappOptIn),
                    contact.whatsappOptIn ? 'Consentimento revogado.' : 'Consentimento registrado.',
                  )
                }
              >
                {contact.whatsappOptIn ? 'Registrar opt-out' : 'Registrar opt-in'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h2>Nenhum contato cadastrado</h2>
          <p className="muted">Cadastre um contato para começar.</p>
        </div>
      )}

      <h2>Mensagens enviadas</h2>
      {messages.length ? (
        <ul className="customer-list" aria-label="Mensagens">
          {messages.map((message) => (
            <li key={message.id} className="customer-card">
              <div>
                <strong>{contactName(message.contactId)}</strong>
                <p>{message.content}</p>
              </div>
              <span aria-label="Status de entrega">{statusLabels[message.status]}</span>
              {message.status === 'failed' && (
                <span className="feedback feedback--error">
                  Falha no envio{message.failureCode ? ` (${message.failureCode})` : ''}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nenhuma mensagem enviada.</p>
      )}
    </section>
  );
}
