import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { AvailableSlot } from '@shared/interfaces/availability.interface';
import type { BookingReceipt, CompanyCatalog } from '../interfaces/company.interface';
import { createAppointment } from '../services/appointment.service';
import { listAvailability, searchAvailability } from '../services/availability.service';
import { getCompanyCatalog } from '../services/catalog.service';
import {
  availabilityQueryKey,
  availabilitySearchQueryKey,
  companyCatalogQueryKey,
} from '../services/query-client';
import { eligibleProfessionals } from '../services/professional.service';
import { formatTimeRange, getNextBookableDate } from '../utils/date.util';
import { getBookingErrorMessage } from '../utils/booking-error.util';
import type { BookingFormValues } from '../interfaces/booking.interface';
import type {
  ProductCustomizationSelection,
  ProductImage,
} from '@shared/interfaces/product.interface';
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
  const [customizationSelections, setCustomizationSelections] = useState<
    ProductCustomizationSelection[]
  >([]);
  const [selectedImageId, setSelectedImageId] = useState<string>('');
  const queryClient = useQueryClient();
  const skipSearchForDate = useRef<string | null>(null);
  const selectedDateRef = useRef(date);

  const product =
    catalog?.business.slug === slug
      ? catalog.products.find((item) => item.id === productId)
      : undefined;
  const effectiveImageGallery = useMemo(
    () =>
      product?.imageGalleries?.find(
        (gallery) =>
          gallery.selections.length === (product.customizationAttributes?.length ?? 0) &&
          gallery.selections.every((selection) =>
            customizationSelections.some(
              (current) =>
                current.attributeId === selection.attributeId &&
                current.optionId === selection.optionId,
            ),
          ) &&
          customizationSelections.every((selection) =>
            gallery.selections.some(
              (current) =>
                current.attributeId === selection.attributeId &&
                current.optionId === selection.optionId,
            ),
          ),
      ),
    [customizationSelections, product],
  );
  const effectiveImages: ProductImage[] = useMemo(
    () => {
      if (!product) return [];
      if ((product.customizationAttributes?.length ?? 0) > 0) {
        return effectiveImageGallery?.images.filter((image) => image.downloadUrl) ?? [];
      }
      return product.defaultImages?.length
        ? product.defaultImages.filter((image) => image.downloadUrl)
        : [{ id: 'legacy-image', storagePath: '', downloadUrl: product.imageUrl }];
    },
    [effectiveImageGallery, product],
  );
  const effectiveSelectedImageId = effectiveImages.some((image) => image.id === selectedImageId)
    ? selectedImageId
    : (effectiveImages[0]?.id ?? '');

  useEffect(() => {
    const attributes = product?.customizationAttributes ?? [];
    setCustomizationSelections((current) => {
      const next = attributes.map((attribute) => {
        const selected = current.find((selection) => selection.attributeId === attribute.id);
        return selected && attribute.options.some((option) => option.id === selected.optionId)
          ? selected
          : { attributeId: attribute.id, optionId: attribute.defaultOptionId };
      });
      const unchanged =
        next.length === current.length &&
        next.every(
          (selection, index) =>
            selection.attributeId === current[index]?.attributeId &&
            selection.optionId === current[index]?.optionId,
        );
      return unchanged ? current : next;
    });
  }, [product]);

  useEffect(() => {
    if (!effectiveImages.some((image) => image.id === selectedImageId)) {
      setSelectedImageId(effectiveImages[0]?.id ?? '');
    }
  }, [effectiveImages, selectedImageId]);

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
        staleTime: 0,
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
    selectedDateRef.current = date;
  }, [date]);

  useEffect(() => {
    if (!product) return;
    if (skipSearchForDate.current === date) {
      skipSearchForDate.current = null;
      return;
    }

    let current = true;

    setLoading(true);
    setAvailabilityLoading(true);
    setError('');
    setSelectedStartsAt('');
    setSlots([]);

    const loadAvailability = async (): Promise<void> => {
      const currentCatalog = await queryClient.fetchQuery({
        queryKey: companyCatalogQueryKey(slug),
        queryFn: () => getCompanyCatalog(slug),
        staleTime: 0,
      });

      if (!current) return;

      const currentProduct =
        currentCatalog?.business.slug === slug
          ? currentCatalog.products.find((item) => item.id === productId)
          : undefined;

      if (!currentProduct) {
        setCatalog(currentCatalog);
        return;
      }

      const result = await queryClient.fetchQuery({
        queryKey: availabilitySearchQueryKey(slug, productId, date),
        queryFn: () => searchAvailability({ businessSlug: slug, productId, date }),
        staleTime: 15_000,
      });

      if (current) {
        setSlots(result.slots);
        setSelectedStartsAt('');
        const choices = eligibleProfessionals(result.slots);
        setSelectedProfessionalId(choices[0]?.id ?? '');
        setNextDateSearchComplete(result.date === null);
        if (result.date && result.date !== date) {
          skipSearchForDate.current = result.date;
          setDate(result.date);
        }
      }
    };

    void loadAvailability()
      .catch((error: unknown) => {
        if (current) {
          setSlots([]);
          setSelectedStartsAt('');
          setSelectedProfessionalId('');
          setNextDateSearchComplete(false);
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
    setSearchingNextDate(false);
    setNextDateSearchError('');
  }, [date]);

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
      const selectedSlot = slots.find(
        (slot) =>
          slot.professionalId === selectedProfessionalId && slot.startsAt === selectedStartsAt,
      );
      if (!selectedSlot) {
        setError('Escolha novamente um horário disponível antes de continuar.');
        return;
      }
      const currentCatalog = await queryClient.fetchQuery({
        queryKey: companyCatalogQueryKey(slug),
        queryFn: () => getCompanyCatalog(slug),
        staleTime: 0,
      });
      const currentProduct =
        currentCatalog?.business.slug === slug
          ? currentCatalog.products.find((item) => item.id === productId)
          : undefined;

      if (!currentProduct) {
        setCatalog(currentCatalog);
        setError(
          'Este serviço não está mais disponível neste catálogo. Volte ao catálogo e escolha outro serviço.',
        );
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
        ...(customizationSelections.length > 0 ? { customizationSelections } : {}),
        ...(effectiveSelectedImageId ? { selectedImageId: effectiveSelectedImageId } : {}),
      });

      setReceipt({
        appointmentId: result.appointmentId,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
      });
      setSlots((current) =>
        current.filter(
          (slot) =>
            slot.professionalId !== selectedProfessionalId || slot.startsAt !== selectedStartsAt,
        ),
      );
      setSelectedStartsAt('');

      const bookedDate = date;
      const refreshAvailability = async (): Promise<void> => {
        const queryKey = availabilityQueryKey(slug, productId, date);
        await queryClient.invalidateQueries({ queryKey });
        const refreshedSlots = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => listAvailability({ businessSlug: slug, productId, date }),
          staleTime: 0,
        });
        if (selectedDateRef.current !== bookedDate) return;
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
      };
      void refreshAvailability().catch(() => {
        if (selectedDateRef.current === bookedDate) {
          setSlots([]);
          setError(
            'Seu agendamento foi enviado, mas não foi possível atualizar os horários. Atualize a página para consultar a disponibilidade.',
          );
        }
      });
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
    if (loading) {
      return (
        <BookingTemplate
          status="loading"
          slug={slug}
          date={date}
          minimumDate={getNextBookableDate(new Date(Date.now() - 86_400_000))}
          onDateChange={selectDate}
        />
      );
    }
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
      customizationSelections={customizationSelections}
      onCustomizationChange={(attributeId, optionId) =>
        setCustomizationSelections((current) => [
          ...current.filter((selection) => selection.attributeId !== attributeId),
          { attributeId, optionId },
        ])
      }
      effectiveImages={effectiveImages}
      selectedImageId={effectiveSelectedImageId}
      onImageSelect={setSelectedImageId}
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
