import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { AvailableSlot } from '@shared/interfaces/availability.interface';
import type { BookingReceipt, CompanyCatalog } from '../interfaces/company.interface';
import { createAppointment } from '../services/appointment.service';
import { listAvailability } from '../services/availability.service';
import { getCompanyCatalog } from '../services/catalog.service';
import { availabilityQueryKey, companyCatalogQueryKey } from '../services/query-client';
import { eligibleProfessionals } from '../services/professional.service';
import { addDaysToDate, formatTimeRange, getNextBookableDate } from '../utils/date.util';
import { getBookingErrorMessage } from '../utils/booking-error.util';
import type { BookingFormValues } from '../interfaces/booking.interface';
import type { EligibleProfessional } from '../interfaces/professional.interface';
import CompanyCatalogPage from './CompanyCatalogPage';
import BookingTemplate from '../components/templates/BookingTemplate/BookingTemplate';

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
  const [nextDateSearchComplete, setNextDateSearchComplete] = useState<boolean>(false);
  const [nextDateSearchError, setNextDateSearchError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [shareError, setShareError] = useState<string>('');
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const queryClient = useQueryClient();

  const product = catalog?.products.find((item) => item.id === productId);

  const selectDate = useCallback((selectedDate: string): void => {
    setAvailabilityLoading(true);
    setDate(selectedDate);
  }, []);

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
  }, [queryClient, slug]);

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
        queryFn: () => listAvailability({ businessSlug: slug, productId, date }),
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
  }, [date, product, productId, queryClient, slug]);

  useEffect(() => {
    if (availabilityLoading || error || !product || slots.length > 0) {
      setSearchingNextDate(false);
      setNextDateSearchComplete(false);
      setNextDateSearchError('');
      return;
    }

    let current = true;
    setSearchingNextDate(true);
    setNextDateSearchComplete(false);
    setNextDateSearchError('');

    const findNextAvailableDate = async (): Promise<void> => {
      for (let offset = 1; offset <= 30; offset += 1) {
        if (!current) return;
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

        if (!current) return;
        if (candidateSlots.length > 0) {
          selectDate(candidateDate);
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
  }, [
    availabilityLoading,
    date,
    error,
    product,
    productId,
    queryClient,
    selectDate,
    slug,
    slots.length,
  ]);

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
      const result = await createAppointment({
        businessSlug: slug,
        productId,
        professionalId: selectedProfessionalId,
        startsAt: selectedStartsAt,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        whatsappOptIn: values.whatsappOptIn,
      });

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
          queryFn: () => listAvailability({ businessSlug: slug, productId, date }),
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
            : (availableProfessionals[0]?.id ?? ''),
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

  if (!catalog) {
    if (loading) return <BookingTemplate status="loading" slug={slug} />;
    if (error) return <BookingTemplate status="error" slug={slug} error={error} />;
    return <CompanyCatalogPage />;
  }

  if (!product) return <BookingTemplate status="not-found" slug={slug} />;

  return (
    <BookingTemplate
      status="ready"
      slug={slug}
      catalog={catalog}
      product={product}
      date={date}
      minimumDate={getNextBookableDate(new Date(Date.now() - 86_400_000))}
      onDateChange={selectDate}
      professionals={professionals}
      selectedProfessionalId={selectedProfessionalId}
      onProfessionalChange={(professionalId) => {
        setSelectedProfessionalId(professionalId);
        setSelectedStartsAt('');
      }}
      availabilityLoading={availabilityLoading}
      slots={slots}
      visibleSlots={visibleSlots}
      selectedStartsAt={selectedStartsAt}
      onTimeChange={setSelectedStartsAt}
      searchingNextDate={searchingNextDate}
      nextDateSearchComplete={nextDateSearchComplete}
      nextDateSearchError={nextDateSearchError}
      error={error}
      busy={busy}
      receipt={receipt}
      shareError={shareError}
      appointmentShareText={appointmentShareText}
      onSubmit={submitBooking}
      onShare={shareAppointment}
      onCloseReceipt={() => setReceipt(null)}
    />
  );
}
