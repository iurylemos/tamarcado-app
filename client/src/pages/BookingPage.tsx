import { useEffect, useMemo, useState, type JSX, type MouseEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import type { AvailableSlot } from '@shared/interfaces/availability.interface';
import { formatBrl } from '@shared/money';
import type { BookingReceipt, CompanyCatalog } from '../interfaces/company.interface';
import { createAppointment } from '../services/appointment.service';
import { listAvailability } from '../services/availability.service';
import { getCompanyCatalog } from '../services/catalog.service';
import {
  availabilityQueryKey,
  companyCatalogQueryKey,
} from '../services/query-client';
import { eligibleProfessionals } from '../services/professional.service';
import { addDaysToDate, formatTimeRange, getNextBookableDate } from '../utils/date.util';
import { getBookingErrorMessage } from '../utils/booking-error.util';
import type { BookingFormValues } from '../interfaces/booking.interface';
import type { EligibleProfessional } from '../interfaces/professional.interface';
import MarketBackground from '../components/atoms/MarketBackground';
import { useAppLoading } from '../contexts/LoadingContext';
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
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(true);
  const [searchingNextDate, setSearchingNextDate] = useState<boolean>(false);
  const [nextAvailableDate, setNextAvailableDate] = useState<string | null>(null);
  const [nextDateSearchComplete, setNextDateSearchComplete] = useState<boolean>(false);
  const [nextDateSearchError, setNextDateSearchError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [shareError, setShareError] = useState<string>('');
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const { runWithLoading } = useAppLoading();
  const queryClient = useQueryClient();

  const product = catalog?.products.find((item) => item.id === productId);

  useEffect(() => {
    let current = true;

    queryClient
      .fetchQuery({
        queryKey: companyCatalogQueryKey(slug),
        queryFn: () => getCompanyCatalog(slug),
      })
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
  }, [queryClient, runWithLoading, slug]);

  useEffect(() => {
    if (!product) return;

    let current = true;

    setLoading(true);
    setAvailabilityLoading(true);
    setError('');
    setSelectedStartsAt('');
    setSlots([]);

    queryClient
      .fetchQuery({
        queryKey: availabilityQueryKey(slug, productId, date),
        queryFn: () =>
          runWithLoading('Procurando horários que cabem na sua agenda...', () =>
            listAvailability({ businessSlug: slug, productId, date }),
          ),
        staleTime: 15_000,
      })
      .then((result) => {
        if (current) {
          setSlots(result);
          const choices = eligibleProfessionals(result);
          setSelectedProfessionalId(choices[0]?.id ?? '');
        }
      })
      .catch((error: unknown) => {
        if (current) {
          setError(
            getBookingErrorMessage(
              error,
              'Não foi possível consultar os horários agora. Tente novamente em instantes.',
            ),
          );
        }
      })
      .finally(() => {
        if (current) {
          setLoading(false);
          setAvailabilityLoading(false);
        }
      });

    return () => {
      current = false;
    };
  }, [date, product, productId, queryClient, runWithLoading, slug]);

  useEffect(() => {
    if (availabilityLoading || error || !product || slots.length > 0) {
      setSearchingNextDate(false);
      setNextAvailableDate(null);
      setNextDateSearchComplete(false);
      setNextDateSearchError('');
      return;
    }

    let current = true;
    setSearchingNextDate(true);
    setNextAvailableDate(null);
    setNextDateSearchComplete(false);
    setNextDateSearchError('');

    const findNextAvailableDate = async (): Promise<void> => {
      for (let offset = 1; offset <= 30; offset += 1) {
        const candidateDate = addDaysToDate(date, offset);
        const candidateSlots = await queryClient.fetchQuery({
          queryKey: availabilityQueryKey(slug, productId, candidateDate),
          queryFn: () =>
            listAvailability({
              businessSlug: slug,
              productId,
              date: candidateDate,
            }),
          staleTime: 15_000,
        });

        if (candidateSlots.length > 0) {
          if (current) setNextAvailableDate(candidateDate);
          return;
        }
      }
    };

    void findNextAvailableDate()
      .catch(() => {
        if (current) {
          setNextDateSearchError(
            'Não foi possível localizar o próximo dia disponível. Você ainda pode escolher outra data.',
          );
        }
      })
      .finally(() => {
        if (current) {
          setSearchingNextDate(false);
          setNextDateSearchComplete(true);
        }
      });

    return () => {
      current = false;
    };
  }, [availabilityLoading, date, error, product, productId, queryClient, slug, slots.length]);

  const professionals = useMemo<EligibleProfessional[]>(
    () => eligibleProfessionals(slots),
    [slots],
  );

  const visibleSlots = useMemo<AvailableSlot[]>(
    () => slots.filter((slot) => slot.professionalId === selectedProfessionalId),
    [slots, selectedProfessionalId],
  );

  const submitBooking = async (values: BookingFormValues): Promise<void> => {
    setBusy(true);
    setError('');

    try {
      const selectedSlot = slots.find((slot) => slot.startsAt === selectedStartsAt);
      if (!selectedSlot) {
        setError('Escolha novamente um horário disponível antes de continuar.');
        return;
      }
      const result = await runWithLoading('Enviando sua solicitação...', () =>
        createAppointment({
          businessSlug: slug,
          productId,
          professionalId: selectedProfessionalId,
          startsAt: selectedStartsAt,
          customerName: values.customerName,
          customerPhone: values.customerPhone,
          whatsappOptIn: values.whatsappOptIn,
        }),
      );

      setReceipt({
        appointmentId: result.appointmentId,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
      });
      setSlots((current) => current.filter((slot) => slot.startsAt !== selectedStartsAt));
      setSelectedStartsAt('');

      setLoading(true);
      setAvailabilityLoading(true);
      try {
        const queryKey = availabilityQueryKey(slug, productId, date);
        await queryClient.invalidateQueries({ queryKey });
        const refreshedSlots = await queryClient.fetchQuery({
          queryKey,
          queryFn: () =>
            runWithLoading('Atualizando horários disponíveis...', () =>
              listAvailability({ businessSlug: slug, productId, date }),
            ),
          staleTime: 0,
        });
        const currentSlots = refreshedSlots.filter(
          (slot) =>
            slot.professionalId !== selectedProfessionalId ||
            slot.startsAt !== selectedSlot.startsAt,
        );
        setSlots(currentSlots);
        const availableProfessionals = eligibleProfessionals(currentSlots);
        setSelectedProfessionalId((current) =>
          availableProfessionals.some((professional) => professional.id === current)
            ? current
            : availableProfessionals[0]?.id ?? '',
        );
      } catch {
        setError(
          'Seu agendamento foi enviado, mas não foi possível atualizar os horários. Atualize a página para consultar a disponibilidade.',
        );
      } finally {
        setLoading(false);
        setAvailabilityLoading(false);
      }
    } catch (error: unknown) {
      setError(
        getBookingErrorMessage(
          error,
          'Não foi possível enviar sua solicitação de agendamento agora. Tente novamente em instantes.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const shareAppointment = async (): Promise<void> => {
    if (!receipt || !navigator.share) return;

    setShareError('');
    try {
      await navigator.share({
        title: `Agendamento - ${product?.name ?? 'Tamarcado'}`,
        text: [
          `Agendamento em ${catalog?.business.name ?? 'Tamarcado'}`,
          `Serviço: ${product?.name ?? ''}`,
          `Data: ${new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'full',
            timeZone: 'America/Sao_Paulo',
          }).format(new Date(receipt.startsAt))}`,
          `Horário: ${formatTimeRange(receipt)}`,
          `Protocolo: ${receipt.appointmentId}`,
        ].join('\n'),
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareError('Não foi possível abrir o compartilhamento. Tente usar WhatsApp ou e-mail.');
    }
  };

  const appointmentShareText = useMemo(
    () =>
      receipt && catalog && product
        ? [
            `Agendamento em ${catalog.business.name}`,
            `Serviço: ${product.name}`,
            `Data: ${new Intl.DateTimeFormat('pt-BR', {
              dateStyle: 'full',
              timeZone: 'America/Sao_Paulo',
            }).format(new Date(receipt.startsAt))}`,
            `Horário: ${formatTimeRange(receipt)}`,
            `Protocolo: ${receipt.appointmentId}`,
          ].join('\n')
        : '',
    [receipt, catalog, product],
  );

  if (loading && !catalog) {
    return (
      <>
        <MarketBackground />
        <main className="page market-page">
          <p className="loading-message" role="status">
            Carregando serviço...
          </p>
        </main>
      </>
    );
  }

  if (!catalog || !product) {
    return catalog ? (
      <>
        <MarketBackground />
        <main className="page market-page state-card">
          <p role="status">Serviço não encontrado.</p>
          <Link to={`/empresa/${slug}`}>Voltar ao catálogo</Link>
        </main>
      </>
    ) : (
      <CompanyCatalogPage />
    );
  }

  return (
    <>
      <MarketBackground />
      <main className="page stack market-page booking-page">
        <Link className="market-back-link" to={`/empresa/${slug}`}>
          ← Voltar ao catálogo
        </Link>

        <motion.header
          className="booking-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <p className="eyebrow">AGENDAMENTO ONLINE</p>
            <h1>Seu próximo momento começa aqui.</h1>
            <p>Escolha um horário e deixe o resto com a gente.</p>
          </div>
          <div className="booking-hero-mark" aria-hidden="true">
            ✦
          </div>
        </motion.header>

        <div className="booking-layout">
          <motion.aside
            className="booking-summary"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="eyebrow">RESUMO DO SERVIÇO</p>
            <span className="booking-summary-icon" aria-hidden="true">
              ✂
            </span>
            <p className="muted">{catalog.business.name}</p>
            <h2>{product.name}</h2>
            {product.description && <p>{product.description}</p>}
            <div className="booking-summary-details">
              <span>{formatBrl(product.priceCents)}</span>
              <span>{product.durationMinutes} minutos</span>
            </div>
          </motion.aside>

          <section className="booking-panel" aria-label="Escolha seu horário">
            <div className="section-heading">
              <div>
                <p className="eyebrow">1. ESCOLHA A DATA E O HORÁRIO</p>
                <h2>Quando você quer vir?</h2>
              </div>
            </div>

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

            {availabilityLoading && (
              <p className="loading-message" role="status">
                Buscando horários disponíveis...
              </p>
            )}

            {!availabilityLoading && slots.length === 0 && professionals.length > 0 && (
              <p role="status" className="state-card state-card-compact">
                Não há horários disponíveis para esta data.
              </p>
            )}

            {!availabilityLoading && slots.length === 0 && (
              <div className="next-availability">
                {searchingNextDate && (
                  <p className="muted" role="status">
                    Procurando o próximo dia com horários...
                  </p>
                )}
                {nextAvailableDate && (
                  <p>
                    Próximo dia com horários:{' '}
                    <strong>
                      {new Intl.DateTimeFormat('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        timeZone: 'UTC',
                      }).format(new Date(`${nextAvailableDate}T12:00:00Z`))}
                    </strong>
                    <button
                      className="next-availability-button"
                      type="button"
                      onClick={() => setDate(nextAvailableDate)}
                    >
                      Ver horários
                    </button>
                  </p>
                )}
                {nextDateSearchComplete && !nextAvailableDate && !nextDateSearchError && (
                  <p className="muted">
                    Não encontramos horários nos próximos 30 dias. Escolha outra data.
                  </p>
                )}
                {nextDateSearchError && (
                  <p className="error" role="alert">
                    {nextDateSearchError}
                  </p>
                )}
              </div>
            )}

            {visibleSlots.length > 0 && (
              <fieldset className="slot-fieldset">
                <legend>Horários disponíveis</legend>
                <div className="slot-grid">
                  {visibleSlots.map((slot, index) => (
                    <motion.label
                      key={`${slot.professionalId}-${slot.startsAt}`}
                      className={`slot-option${selectedStartsAt === slot.startsAt ? ' is-selected' : ''}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index, 12) * 0.025 }}
                    >
                      <input
                        type="radio"
                        name="booking-time"
                        value={slot.startsAt}
                        checked={selectedStartsAt === slot.startsAt}
                        onChange={() => setSelectedStartsAt(slot.startsAt)}
                      />
                      <span>{formatTimeRange(slot)}</span>
                    </motion.label>
                  ))}
                </div>
                <p className="slot-help">
                  Cada opção mostra o início e o fim do atendimento ({product.durationMinutes} min).
                </p>
              </fieldset>
            )}

            {error && !selectedStartsAt && (
              <p role="alert" className="error">
                {error}
              </p>
            )}

            <AnimatePresence initial={false}>
              {selectedStartsAt && (
                <motion.div
                  className="booking-contact"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">2. SEUS DADOS</p>
                      <h2>Quase lá!</h2>
                    </div>
                  </div>
                  <BookingForm onSubmit={submitBooking} busy={busy} error={error} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {receipt && (
          <motion.div
            className="receipt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReceipt(null)}
          >
            <motion.section
              className="receipt-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="receipt-title"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onClick={(event: MouseEvent) => event.stopPropagation()}
            >
              <button
                className="receipt-close"
                type="button"
                aria-label="Fechar comprovante"
                onClick={() => setReceipt(null)}
              >
                ×
              </button>
              <span className="receipt-check" aria-hidden="true">
                ✓
              </span>
              <p className="eyebrow">COMPROVANTE DE AGENDAMENTO</p>
              <h2 id="receipt-title">Solicitação enviada!</h2>
              <p className="receipt-business">{catalog.business.name}</p>
              <div className="receipt-divider" />
              <dl className="receipt-details">
                <div>
                  <dt>Serviço</dt>
                  <dd>{product.name}</dd>
                </div>
                <div>
                  <dt>Data</dt>
                  <dd>
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'full',
                      timeZone: 'America/Sao_Paulo',
                    }).format(new Date(receipt.startsAt))}
                  </dd>
                </div>
                <div>
                  <dt>Horário</dt>
                  <dd>{formatTimeRange(receipt)}</dd>
                </div>
                <div>
                  <dt>Cliente</dt>
                  <dd>{receipt.customerName || 'Cliente'}</dd>
                </div>
                <div>
                  <dt>Celular</dt>
                  <dd>{receipt.customerPhone}</dd>
                </div>
                <div>
                  <dt>Protocolo</dt>
                  <dd>{receipt.appointmentId}</dd>
                </div>
              </dl>
              <div className="receipt-share" aria-label="Compartilhar agendamento">
                <a
                  className="receipt-share-link"
                  href={`https://wa.me/?text=${encodeURIComponent(appointmentShareText)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
                <a
                  className="receipt-share-link"
                  href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(`Agendamento - ${product.name}`)}&body=${encodeURIComponent(appointmentShareText)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  E-mail
                </a>
                {'share' in navigator && (
                  <button className="receipt-share-link" type="button" onClick={shareAppointment}>
                    Compartilhar
                  </button>
                )}
              </div>
              {shareError && (
                <p role="alert" className="error">
                  {shareError}
                </p>
              )}
              <p className="receipt-note">
                A empresa recebeu sua solicitação e poderá entrar em contato para confirmar.
              </p>
              <button
                className="button booking-submit"
                type="button"
                onClick={() => setReceipt(null)}
              >
                Entendi
              </button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
