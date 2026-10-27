import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AvailableSlot } from '@shared/interfaces/availability.interface';
import type { PublicProductSummary, CompanyCatalog } from '../interfaces/company.interface';
import type { BookingFormValues, BookingReceipt } from '../interfaces/booking.interface';
import type {
  ProductCustomizationAttribute,
  ProductCustomizationSelection,
  ProductImage,
  ProductImageGallery,
} from '@shared/interfaces/product.interface';
import type { EligibleProfessional } from '../interfaces/professional.interface';
import { getCompanyCatalog } from '../services/catalog.service';
import { eligibleProfessionals } from '../services/professional.service';
import { formatTimeRange, getNextBookableDate } from '../utils/date.util';
import { getBookingErrorMessage } from '../utils/booking-error.util';
import { ReactQueryConfig } from '../config/react-query.config';
import CompanyCatalogPage from './CompanyCatalogPage';
import BookingTemplate from '../components/templates/BookingTemplate/BookingTemplate';

type BookingPageProps = {
  slug: string;
  productId: string;
  initialCatalog?: CompanyCatalog | null;
  initialCatalogStatus?: 'ready' | 'not-found' | 'unavailable' | 'error';
};

export default function BookingPage({
  slug,
  productId,
  initialCatalog,
  initialCatalogStatus,
}: Readonly<BookingPageProps>): JSX.Element {
  const queryClient = useQueryClient();
  const [catalog, setCatalog] = useState<CompanyCatalog | null>(initialCatalog ?? null);
  const [date, setDate] = useState<string>(getNextBookableDate());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [selectedStartsAt, setSelectedStartsAt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(initialCatalog === undefined);
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(true);
  const [searchingNextDate, setSearchingNextDate] = useState<boolean>(false);
  const [nextDateSearchComplete, setNextDateSearchComplete] = useState<boolean>(false);
  const [nextDateSearchError, setNextDateSearchError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>(
    initialCatalogStatus === 'unavailable'
      ? 'Este catálogo está temporariamente indisponível. Tente novamente em instantes.'
      : initialCatalogStatus === 'error'
        ? 'Não foi possível carregar os dados do serviço.'
        : '',
  );
  const [shareError, setShareError] = useState<string>('');
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [customizationSelections, setCustomizationSelections] = useState<
    ProductCustomizationSelection[]
  >([]);
  const [selectedImageId, setSelectedImageId] = useState<string>('');
  const skipSearchForDate = useRef<string | null>(null);
  const selectedDateRef = useRef<string>(date);

  const product = useMemo<PublicProductSummary | undefined>(
    () =>
      catalog?.business.slug === slug
        ? catalog.products.find((item) => item.id === productId)
        : undefined,
    [catalog, slug, productId],
  );

  const effectiveImageGallery = useMemo<ProductImageGallery | undefined>(
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

  const effectiveImages = useMemo<ProductImage[]>(() => {
    if (!product) return [];

    if ((product.customizationAttributes?.length ?? 0) > 0) {
      return effectiveImageGallery?.images.filter((image) => image.downloadUrl) ?? [];
    }

    return product.defaultImages?.length
      ? product.defaultImages.filter((image) => image.downloadUrl)
      : [{ id: 'legacy-image', storagePath: '', downloadUrl: product.imageUrl }];
  }, [effectiveImageGallery, product]);

  const effectiveSelectedImageId = useMemo<string>(
    () =>
      effectiveImages.some((image) => image.id === selectedImageId)
        ? selectedImageId
        : (effectiveImages[0]?.id ?? ''),
    [effectiveImages, selectedImageId],
  );

  useEffect(() => {
    const attributes = product?.customizationAttributes ?? [];

    setCustomizationSelections((current: ProductCustomizationSelection[]) => {
      const next = attributes.map((attribute: ProductCustomizationAttribute) => {
        const selected = current.find((selection) => selection.attributeId === attribute.id);
        return selected && attribute.options.some((option) => option.id === selected.optionId)
          ? selected
          : { attributeId: attribute.id, optionId: attribute.defaultOptionId };
      });

      const unchanged =
        next.length === current.length &&
        next.every((selection: ProductCustomizationSelection, index: number): boolean =>
          current[index]
            ? selection.attributeId === current[index].attributeId &&
              selection.optionId === current[index].optionId
            : false,
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

  const loadAvailability = useCallback(
    async (current: boolean): Promise<void> => {
      const currentCatalog = await queryClient.fetchQuery({
        queryKey: ReactQueryConfig.companyCatalogQueryKey(slug),
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
        queryKey: ReactQueryConfig.availabilitySearchQueryKey(slug, productId, date),
        queryFn: async () => {
          const { searchAvailability } = await import('../services/availability.service');
          return searchAvailability({ businessSlug: slug, productId, date });
        },
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
    },
    [date, productId, queryClient, slug],
  );

  useEffect(() => {
    if (initialCatalog !== undefined) {
      queryClient.setQueryData(ReactQueryConfig.companyCatalogQueryKey(slug), initialCatalog);
      setCatalog(initialCatalog);
      setLoading(false);
      return;
    }

    let current = true;

    queryClient
      .fetchQuery({
        queryKey: ReactQueryConfig.companyCatalogQueryKey(slug),
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
  }, [initialCatalog, queryClient, slug]);

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

    void loadAvailability(current)
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
  }, [date, loadAvailability, product, productId, slug]);

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

  const refreshAvailability = useCallback(
    async (bookedDate: string, selectedSlot: AvailableSlot): Promise<void> => {
      const queryKey = ReactQueryConfig.availabilityQueryKey(slug, productId, bookedDate);

      await queryClient.invalidateQueries({
        queryKey,
        exact: true,
        refetchType: 'none',
      });

      const refreshedSlots = await queryClient.fetchQuery({
        queryKey,
        queryFn: async () => {
          const { listAvailability } = await import('../services/availability.service');
          return listAvailability({
            businessSlug: slug,
            productId,
            date: bookedDate,
          });
        },
        staleTime: 0,
      });

      if (selectedDateRef.current !== bookedDate) return;

      const currentSlots = refreshedSlots.filter(
        (slot) =>
          slot.professionalId !== selectedProfessionalId || slot.startsAt !== selectedSlot.startsAt,
      );

      setSlots(currentSlots);

      const availableProfessionals = eligibleProfessionals(currentSlots);

      setSelectedProfessionalId((current) =>
        availableProfessionals.some((professional) => professional.id === current)
          ? current
          : (availableProfessionals[0]?.id ?? ''),
      );
    },
    [productId, queryClient, selectedProfessionalId, slug],
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
        queryKey: ReactQueryConfig.companyCatalogQueryKey(slug),
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

      const { createAppointment } = await import('../services/appointment.service');
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

      void refreshAvailability(date, selectedSlot).catch(() => {
        if (selectedDateRef.current === date) {
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
    if (initialCatalogStatus === 'not-found') {
      return <BookingTemplate status="not-found" slug={slug} />;
    }

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

    return (
      <CompanyCatalogPage
        slug={slug}
        initialCatalog={catalog}
        initialStatus={catalog ? 'ready' : 'not-found'}
      />
    );
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
