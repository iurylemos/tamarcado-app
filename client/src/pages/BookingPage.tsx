import { useEffect, useMemo, useState, type JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AvailableSlot } from '@shared/interfaces/availability.interface';
import { formatBrl } from '@shared/money';
import type { CompanyCatalog } from '../interfaces/company.interface';
import { createAppointment } from '../services/appointment.service';
import { listAvailability } from '../services/availability.service';
import { getCompanyCatalog } from '../services/catalog.service';
import { eligibleProfessionals } from '../services/professional.service';
import { getNextBookableDate } from '../utils/date.util';
import type { BookingFormValues } from '../interfaces/booking.interface';

import BookingForm from '../components/organisms/BookingForm/BookingForm';
import ProfessionalSelector from '../components/organisms/ProfessionalSelector/ProfessionalSelector';
import CompanyCatalogPage from './CompanyCatalogPage';

export default function BookingPage(): JSX.Element {
  const { slug = '', productId = '' } = useParams();
  const [catalog, setCatalog] = useState<CompanyCatalog | null>(null);
  const [date, setDate] = useState<string>(getNextBookableDate());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [selectedStartsAt, setSelectedStartsAt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const product = catalog?.products.find((item) => item.id === productId);

  useEffect(() => {
    let current = true;

    getCompanyCatalog(slug)
      .then((result) => {
        if (current) setCatalog(result);
      })
      .catch(() => {
        if (current) setError('Não foi possível carregar os dados do serviço.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!product) return;

    let current = true;
    setLoading(true);
    setError('');
    setSelectedStartsAt('');

    listAvailability({ businessSlug: slug, productId, date })
      .then((result) => {
        if (current) {
          setSlots(result);
          const choices = eligibleProfessionals(result);
          setSelectedProfessionalId(choices.length === 1 ? choices[0]!.id : '');
        }
      })
      .catch((reason: unknown) => {
        if (current)
          setError(
            reason instanceof Error ? reason.message : 'Não foi possível consultar os horários.',
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [date, product, productId, slug]);

  const professionals = useMemo(() => eligibleProfessionals(slots), [slots]);
  const visibleSlots = slots.filter((slot) => slot.professionalId === selectedProfessionalId);

  if (loading && !catalog)
    return (
      <main className="page">
        <p role="status">Carregando serviço...</p>
      </main>
    );
  if (!catalog || !product) {
    return catalog ? (
      <main className="page">
        <p role="status">Serviço não encontrado.</p>
        <Link to={`/empresa/${slug}`}>Voltar ao catálogo</Link>
      </main>
    ) : (
      <CompanyCatalogPage />
    );
  }

  const submitBooking = async (values: BookingFormValues): Promise<void> => {
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const result = await createAppointment({
        businessSlug: slug,
        productId,
        professionalId: selectedProfessionalId,
        startsAt: selectedStartsAt,
        customerName: values.customerName || undefined,
        customerPhone: values.customerPhone,
        whatsappOptIn: values.whatsappOptIn,
      });

      setSuccess(`Solicitação enviada. Seu código é ${result.appointmentId.slice(0, 8)}.`);
      setSlots((current) => current.filter((slot) => slot.startsAt !== selectedStartsAt));
      setSelectedStartsAt('');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Não foi possível solicitar este horário.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page stack">
      <Link to={`/empresa/${slug}`}>← Voltar ao catálogo</Link>

      <header className="stack">
        <p className="muted">{catalog.business.name}</p>
        <h1>Agendar {product.name}</h1>
        <p>
          {formatBrl(product.priceCents)} · {product.durationMinutes} minutos
        </p>
      </header>

      <label className="field" htmlFor="booking-date">
        Data do atendimento
        <input
          id="booking-date"
          type="date"
          value={date}
          min={getNextBookableDate(new Date(Date.now() - 86_400_000))}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>

      <ProfessionalSelector
        professionals={professionals}
        value={selectedProfessionalId}
        onChange={(id) => {
          setSelectedProfessionalId(id);
          setSelectedStartsAt('');
        }}
      />

      {loading && <p role="status">Buscando horários disponíveis...</p>}

      {!loading && professionals.length > 0 && visibleSlots.length === 0 && (
        <p role="status">Não há horários disponíveis para esta data. Escolha outra data.</p>
      )}

      {visibleSlots.length > 0 && (
        <fieldset className="stack">
          <legend>Horários disponíveis</legend>
          {visibleSlots.map((slot) => (
            <label key={`${slot.professionalId}-${slot.startsAt}`}>
              <input
                type="radio"
                name="booking-time"
                value={slot.startsAt}
                checked={selectedStartsAt === slot.startsAt}
                onChange={() => setSelectedStartsAt(slot.startsAt)}
              />{' '}
              {new Intl.DateTimeFormat('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo',
              }).format(new Date(slot.startsAt))}
            </label>
          ))}
        </fieldset>
      )}

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {success && <p role="status">{success}</p>}

      {selectedStartsAt && <BookingForm onSubmit={submitBooking} busy={busy} error={error} />}
    </main>
  );
}
