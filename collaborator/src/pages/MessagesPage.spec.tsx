import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MessagesPage from './MessagesPage';

const service = vi.hoisted(() => ({
  subscribeConnections: vi.fn(),
  subscribeContacts: vi.fn(),
  subscribeMessages: vi.fn(),
  createContact: vi.fn(),
  setContactConsent: vi.fn(),
}));
vi.mock('../services/message.service', () => service);
vi.mock('../contexts/auth/auth.context', () => ({
  useAuth: () => ({ tenantId: 'tenant-aurora' }),
}));

describe('MessagesPage', () => {
  const stops = { connections: vi.fn(), contacts: vi.fn(), messages: vi.fn() };
  let emitContacts: (items: unknown[]) => void;
  let emitMessages: (items: unknown[]) => void;

  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    service.subscribeConnections.mockImplementation((_t, onData) => {
      onData([{ id: 'c1', provider: 'x', status: 'active' }]);
      return stops.connections;
    });
    service.subscribeContacts.mockImplementation((_t, onData) => {
      emitContacts = onData;
      return stops.contacts;
    });
    service.subscribeMessages.mockImplementation((_t, onData) => {
      emitMessages = onData;
      return stops.messages;
    });
  });

  it('subscribes with the tenant scope, shows live delivery state, and cleans up', () => {
    const { unmount } = render(<MessagesPage />);
    expect(service.subscribeContacts).toHaveBeenCalledWith(
      'tenant-aurora',
      expect.any(Function),
      expect.any(Function),
    );
    act(() =>
      emitContacts([
        { id: 'k1', phoneE164: '+5511999990009', name: 'Maria', whatsappOptIn: true },
        { id: 'k2', phoneE164: '+5511999990010', whatsappOptIn: false },
      ]),
    );
    expect(screen.getByText('**** 0009')).toBeInTheDocument();
    expect(screen.queryByText('+5511999990009')).not.toBeInTheDocument();
    expect(screen.getByText('Consentimento ativo')).toBeInTheDocument();
    expect(screen.getByText('Sem consentimento')).toBeInTheDocument();

    const message = {
      id: 'm1',
      contactId: 'k1',
      content: 'Lembrete',
      status: 'sent',
      createdAt: new Date(),
    };
    act(() => emitMessages([message]));
    expect(screen.getByLabelText('Status de entrega')).toHaveTextContent('Enviada');
    act(() => emitMessages([{ ...message, status: 'failed', failureCode: 'REJECTED' }]));
    expect(screen.getByLabelText('Status de entrega')).toHaveTextContent('Falhou');
    expect(screen.getByText('Falha no envio (REJECTED)')).toBeInTheDocument();

    unmount();
    expect(stops.contacts).toHaveBeenCalled();
    expect(stops.messages).toHaveBeenCalled();
    expect(stops.connections).toHaveBeenCalled();
  });

  it('toggles consent and creates contacts, showing errors', async () => {
    service.setContactConsent.mockResolvedValue(undefined);
    service.createContact.mockRejectedValue(new Error('Este telefone já existe nesta conexão.'));
    render(<MessagesPage />);
    act(() => emitContacts([{ id: 'k2', phoneE164: '+5511999990010', whatsappOptIn: false }]));
    await userEvent.click(screen.getByRole('button', { name: 'Registrar opt-in' }));
    expect(service.setContactConsent).toHaveBeenCalledWith('k2', true);

    await userEvent.type(screen.getByLabelText('Telefone do contato'), '11999990010');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar contato' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('já existe');
  });
});
