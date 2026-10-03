import { useEffect, useState, type JSX } from 'react';
import CustomerHistory from '../components/organisms/CustomerHistory/CustomerHistory';
import type { CollaboratorCustomer } from '../interfaces/appointment.interface';
import { listCustomers } from '../services/customer.service';
import { ErrorUtil } from '../utils/error.util';

export default function CustomersPage(): JSX.Element {
  const [customers, setCustomers] = useState<CollaboratorCustomer[]>([]);
  const [timezone, setTimezone] = useState<string>('America/Sao_Paulo');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let active = true;
    void listCustomers()
      .then((result) => {
        if (!active) return;
        setCustomers(result.customers);
        setTimezone(result.timezone);
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          ErrorUtil.formatMessage(loadError, 'Não foi possível carregar o histórico de clientes.'),
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Relacionamento</p>
          <h1>Clientes</h1>
          <p className="muted">Histórico baseado nos atendimentos do seu escopo.</p>
        </div>
      </header>
      {error && (
        <p className="feedback feedback--error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando clientes…</p>
      ) : customers.length ? (
        <div className="customer-list">
          {customers.map((customer) => (
            <CustomerHistory key={customer.phoneE164} customer={customer} timezone={timezone} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Nenhum cliente no seu histórico</h2>
          <p className="muted">Clientes vinculados aos seus agendamentos aparecerão aqui.</p>
        </div>
      )}
    </section>
  );
}
