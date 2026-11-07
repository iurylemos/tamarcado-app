import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  AvailableProfessional,
  AvailableSlot,
  SearchAvailabilityResult,
} from '@shared/interfaces/availability.interface';
import type {
  PublicProductSummary,
  CompanyCatalog,
  CompanySummary,
} from '../interfaces/company.interface';
import type { BookingFormValues, BookingReceipt } from '../interfaces/booking.interface';
import type {
  ProductCustomizationSelection,
  ProductImage,
  ProductImageGallery,
} from '@shared/interfaces/product.interface';
import type { PublicCatalogStatus } from '../interfaces/catalog.interface';
import {
  listAvailability,
  searchAvailability,
  searchAvailabilityForEstimation,
} from '../services/availability.service';
import { createAppointment } from '../services/appointment.service';
import { getCompanyCatalog, getProductImageGalleries } from '../services/catalog.service';
import {
  eligibleProfessionals,
  eligibleProfessionalsWithinHorizon,
} from '../services/professional.service';
import { estimateDateFromInstant, isValidIanaTimezone } from '@shared/timezone';
import { DateUtil } from '../utils/date.util';
import { getBookingErrorMessage } from '../utils/booking-error.util';
import { ReactQueryConfig } from '../config/react-query.config';
import { resolvePageMeta, updatePageMeta } from '../app/page-meta';
import CompanyCatalogPage from './CompanyCatalogPage';
import BookingTemplate from '../components/templates/BookingTemplate/BookingTemplate';

type BookingPageProps = {
  slug: string;
  productId: string;
  initialBusiness?: CompanySummary | null;
  initialProduct?: PublicProductSummary | null;
  initialStatus?: PublicCatalogStatus;
};

function getBookingCatalog(
  queryClient: QueryClient,
  slug: string,
  productId: string,
  refresh = false,
): Promise<CompanyCatalog | null> {
  const detailKey = ReactQueryConfig.companyCatalogQueryKey(slug, productId);

  return queryClient.fetchQuery({
    queryKey: detailKey,
    staleTime: refresh ? 0 : ReactQueryConfig.queryStaleTime,
    queryFn: async () => {
      if (refresh) return getCompanyCatalog(slug, { productId });

      const cachedCatalog = queryClient.getQueryData<CompanyCatalog>(
        ReactQueryConfig.companyCatalogQueryKey(slug),
      );
      const cachedProduct =
        cachedCatalog?.business.slug === slug
          ? cachedCatalog.products.find((item) => item.id === productId)
          : undefined;

      if (!cachedCatalog || !cachedProduct) {
        return getCompanyCatalog(slug, { productId });
      }

      const imageGalleries = await queryClient.fetchQuery({
        queryKey: ReactQueryConfig.productGalleriesQueryKey(slug, productId),
        queryFn: () => getProductImageGalleries(slug, productId),
        staleTime: ReactQueryConfig.queryStaleTime,
      });
      const catalog = {
        ...cachedCatalog,
        products: cachedCatalog.products.map((product) =>
          product.id === productId ? { ...product, imageGalleries } : product,
        ),
      };
      return catalog;
    },
  });
}

export default function BookingPage({
  slug,
  productId,
  initialBusiness,
  initialProduct,
  initialStatus,
}: Readonly<BookingPageProps>): JSX.Element {
  const queryClient = useQueryClient();
  const seededCatalog = useMemo<CompanyCatalog | null>(
    () =>
      initialBusiness && initialProduct
        ? { business: initialBusiness, products: [initialProduct] }
        : null,
    [initialBusiness, initialProduct],
  );
  const [catalog, setCatalog] = useState<CompanyCatalog | null>(seededCatalog);
  const [date, setDate] = useState<string>(DateUtil.getNextBookableDate());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [estimatedProfessionals, setEstimatedProfessionals] = useState<AvailableProfessional[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [selectedStartsAt, setSelectedStartsAt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(initialStatus === undefined);
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(true);
  const [searchingNextDate, setSearchingNextDate] = useState<boolean>(false);
  const [nextDateSearchComplete, setNextDateSearchComplete] = useState<boolean>(false);
  const [nextDateSearchError, setNextDateSearchError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>(
    initialStatus === 'unavailable'
      ? 'Este catálogo está temporariamente indisponível. Tente novamente em instantes.'
      : initialStatus === 'error'
        ? 'Não foi possível carregar os dados do serviço.'
        : '',
  );
  const [shareError, setShareError] = useState<string>('');
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [customizationSelectionState, setCustomizationSelectionState] = useState<{
    productId: string;
    selections: ProductCustomizationSelection[];
  } | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string>('');
  const skipSearchForDate = useRef<string | null>(null);
  const selectedDateRef = useRef<string>(date);

  const product = useMemo<PublicProductSummary | undefined>(
    () =>
      catalog && catalog.business.slug === slug
        ? catalog.products.find((item) => item.id === productId)
        : undefined,
    [catalog, slug, productId],
  );

  useEffect(() => {
    const status = loading
      ? undefined
      : product && catalog
        ? 'ready'
        : initialStatus ?? (error ? 'error' : 'not-found');

    return updatePageMeta(
      resolvePageMeta({
        name: 'booking',
        slug,
        productId,
        business: catalog?.business,
        product,
        status,
      }),
    );
  }, [catalog, error, initialStatus, loading, product, productId, slug]);

  const customizationSelections = useMemo<ProductCustomizationSelection[]>(() => {
    if (!product) return [];

    const storedSelections =
      customizationSelectionState?.productId === product.id
        ? customizationSelectionState.selections
        : [];

    return (product.customizationAttributes ?? []).map((attribute) => {
      const selected = storedSelections.find((selection) => selection.attributeId === attribute.id);
      return selected && attribute.options.some((option) => option.id === selected.optionId)
        ? selected
        : { attributeId: attribute.id, optionId: attribute.defaultOptionId };
    });
  }, [customizationSelectionState, product]);

  const estimatedCheckout = useMemo<boolean>(
    () => product?.estimatedDeliveryEnabled === true,
    [product],
  );

  const estimatedDeliveryDays = useMemo<number | undefined>(() => {
    if (!estimatedCheckout || !product) return undefined;

    const hasAttributes = (product.customizationAttributes?.length ?? 0) > 0;
    const variant = hasAttributes
      ? product.variantPrices?.find(
          (candidate) =>
            candidate.selections.length === customizationSelections.length &&
            candidate.selections.every((selection) =>
              customizationSelections.some(
                (selected) =>
                  selected.attributeId === selection.attributeId &&
                  selected.optionId === selection.optionId,
              ),
            ),
        )
      : undefined;
    const days = hasAttributes ? variant?.estimatedDeliveryDays : product.estimatedDeliveryDays;

    return Number.isSafeInteger(days) && Number(days) > 0 ? Number(days) : undefined;
  }, [customizationSelections, estimatedCheckout, product]);

  const businessTimezone = useMemo<string | undefined>(() => catalog?.business.timezone, [catalog]);

  const hasValidBusinessTimezone = useMemo<boolean>(
    () => typeof businessTimezone === 'string' && isValidIanaTimezone(businessTimezone),
    [businessTimezone],
  );

  const provisionalEstimatedDate = useMemo<string | undefined>(() => {
    return estimatedCheckout &&
      estimatedDeliveryDays !== undefined &&
      typeof businessTimezone === 'string' &&
      hasValidBusinessTimezone
      ? estimateDateFromInstant(new Date(), estimatedDeliveryDays, businessTimezone)
      : undefined;
  }, [estimatedCheckout, estimatedDeliveryDays, businessTimezone, hasValidBusinessTimezone]);

  const estimateUnavailableMessage = useMemo<string | undefined>(
    () =>
      estimatedCheckout
        ? estimatedDeliveryDays === undefined
          ? 'A estimativa não está disponível para a opção selecionada.'
          : !hasValidBusinessTimezone
            ? 'A data estimada está indisponível porque o fuso horário da empresa não foi projetado.'
            : undefined
        : undefined,
    [estimatedCheckout, estimatedDeliveryDays, hasValidBusinessTimezone],
  );

  const effectiveImageGallery = useMemo<ProductImageGallery | undefined>(
    () =>
      product &&
      product.imageGalleries?.find(
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

    if (!product.defaultImages) {
      return [{ id: 'legacy-image', storagePath: '', downloadUrl: product.imageUrl }];
    }

    const defaultImagesProduct = product.defaultImages.filter((image) => image.downloadUrl);

    return defaultImagesProduct;
  }, [effectiveImageGallery, product]);

  const effectiveSelectedImageId = useMemo<string>(
    () =>
      effectiveImages.some((image) => image.id === selectedImageId)
        ? selectedImageId
        : (effectiveImages[0]?.id ?? ''),
    [effectiveImages, selectedImageId],
  );

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
      const currentCatalog = await getBookingCatalog(queryClient, slug, productId);

      if (!current) return;

      const currentProduct =
        currentCatalog?.business.slug === slug
          ? currentCatalog.products.find((item) => item.id === productId)
          : undefined;

      if (!currentCatalog || !currentProduct) {
        setCatalog(currentCatalog);
        return;
      }

      let result: SearchAvailabilityResult;
      if (currentProduct.estimatedDeliveryEnabled === true) {
        const searchDate =
          typeof currentCatalog.business.timezone === 'string' &&
          isValidIanaTimezone(currentCatalog.business.timezone)
            ? DateUtil.getDateInBusinessTimezone(new Date(), currentCatalog.business.timezone)
            : undefined;
        result = await searchAvailabilityForEstimation({
          businessSlug: slug,
          productId,
          ...(searchDate ? { date: searchDate } : {}),
        });
      } else {
        const searchInput = { businessSlug: slug, productId, date };
        result = await queryClient.query({
          queryKey: ReactQueryConfig.availabilitySearchQueryKey(slug, productId, date),
          queryFn: () => searchAvailability(searchInput),
          staleTime: 15000,
        });
      }

      if (current) {
        setSlots(result.slots);
        setSelectedStartsAt('');
        const choices =
          currentProduct.estimatedDeliveryEnabled === true
            ? eligibleProfessionalsWithinHorizon(result)
            : eligibleProfessionals(result.slots);
        setEstimatedProfessionals(currentProduct.estimatedDeliveryEnabled === true ? choices : []);
        setSelectedProfessionalId(
          currentProduct.estimatedDeliveryEnabled === true
            ? choices.length === 1
              ? (choices[0]?.id ?? '')
              : ''
            : (choices[0]?.id ?? ''),
        );
        setNextDateSearchComplete(result.date === null);

        if (
          currentProduct.estimatedDeliveryEnabled !== true &&
          result.date &&
          result.date !== date
        ) {
          skipSearchForDate.current = result.date;
          setDate(result.date);
        }
      }
    },
    [date, productId, queryClient, slug],
  );

  useEffect(() => {
    if (initialStatus !== undefined) {
      if (seededCatalog) {
        queryClient.setQueryData(
          ReactQueryConfig.companyCatalogQueryKey(slug, productId),
          seededCatalog,
        );
      }
      setCatalog(seededCatalog);
      setLoading(false);
      return;
    }

    let current = true;

    getBookingCatalog(queryClient, slug, productId)
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
  }, [initialStatus, seededCatalog, productId, queryClient, slug]);

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
    setEstimatedProfessionals([]);

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

  const professionals = useMemo<AvailableProfessional[]>(
    () => (estimatedCheckout ? estimatedProfessionals : eligibleProfessionals(slots)),
    [estimatedCheckout, estimatedProfessionals, slots],
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

      const refreshedSlots = await queryClient.query({
        queryKey,
        queryFn: () =>
          listAvailability({
            businessSlug: slug,
            productId,
            date: bookedDate,
          }),
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
      const selectedSlot = estimatedCheckout
        ? undefined
        : slots.find(
            (slot) =>
              slot.professionalId === selectedProfessionalId && slot.startsAt === selectedStartsAt,
          );

      if (!estimatedCheckout && !selectedSlot) {
        setError('Escolha novamente um horário disponível antes de continuar.');
        return;
      }

      if (!selectedProfessionalId) {
        setError('Selecione um profissional para continuar.');
        return;
      }

      const currentCatalog = await getBookingCatalog(queryClient, slug, productId, true);

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
        ...(!estimatedCheckout ? { startsAt: selectedStartsAt } : {}),
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        whatsappOptIn: values.whatsappOptIn,
        paymentMethod: values.paymentMethod,
        ...(values.installments !== undefined ? { installments: values.installments } : {}),
        ...(customizationSelections.length > 0 ? { customizationSelections } : {}),
        ...(effectiveSelectedImageId ? { selectedImageId: effectiveSelectedImageId } : {}),
      });

      setReceipt({
        appointmentId: result.appointmentId,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        startsAt: result.startsAt,
        endsAt: result.endsAt,
        professionalName: result.professionalName,
        ...(result.estimatedDelivery ? { estimatedDelivery: result.estimatedDelivery } : {}),
        paymentMethod: values.paymentMethod,
        ...(values.installments !== undefined ? { installments: values.installments } : {}),
      });

      if (selectedSlot) {
        setSlots((current) =>
          current.filter(
            (slot) =>
              slot.professionalId !== selectedProfessionalId || slot.startsAt !== selectedStartsAt,
          ),
        );
      }

      setSelectedStartsAt('');

      if (selectedSlot) {
        void refreshAvailability(date, selectedSlot).catch(() => {
          if (selectedDateRef.current === date) {
            setSlots([]);
            setError(
              'Seu agendamento foi enviado, mas não foi possível atualizar os horários. Atualize a página para consultar a disponibilidade.',
            );
          }
        });
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
            timeZone: receipt.estimatedDelivery?.timezone ?? 'America/Sao_Paulo',
          }).format(new Date(receipt.startsAt))}`,
          `Horário: ${DateUtil.formatTimeRange(receipt)}`,
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
              timeZone: receipt.estimatedDelivery?.timezone ?? 'America/Sao_Paulo',
            }).format(new Date(receipt.startsAt))}`,
            `Horário: ${DateUtil.formatTimeRange(receipt)}`,
            `Protocolo: ${receipt.appointmentId}`,
          ].join('\n')
        : '',
    [receipt, catalog, product],
  );

  const canSubmit = useMemo<boolean>(
    () =>
      estimatedCheckout
        ? !availabilityLoading &&
          estimatedDeliveryDays !== undefined &&
          professionals.length > 0 &&
          Boolean(selectedProfessionalId)
        : Boolean(selectedStartsAt),
    [
      estimatedCheckout,
      availabilityLoading,
      estimatedDeliveryDays,
      professionals.length,
      selectedProfessionalId,
      selectedStartsAt,
    ],
  );

  if (!catalog) {
    if (initialStatus === 'not-found') {
      return <BookingTemplate status="not-found" slug={slug} />;
    }

    if (loading) {
      return (
        <BookingTemplate
          status="loading"
          slug={slug}
        />
      );
    }

    if (error) return <BookingTemplate status="error" slug={slug} error={error} />;

    return <CompanyCatalogPage slug={slug} />;
  }

  if (!product) return <BookingTemplate status="not-found" slug={slug} />;

  return (
    <BookingTemplate
      status="ready"
      slug={slug}
      catalog={catalog}
      product={product}
      customizationSelections={customizationSelections}
      onCustomizationChange={(attributeId, optionId) => {
        const attributes = product.customizationAttributes ?? [];
        setCustomizationSelectionState((current) => {
          const currentSelections = current?.productId === product.id ? current.selections : [];

          return {
            productId: product.id,
            selections: attributes.map((attribute) => {
              const currentOptionId = currentSelections.find(
                (selection) => selection.attributeId === attribute.id,
              )?.optionId;

              return {
                attributeId: attribute.id,
                optionId:
                  attribute.id === attributeId
                    ? optionId
                    : currentOptionId &&
                        attribute.options.some((option) => option.id === currentOptionId)
                      ? currentOptionId
                      : attribute.defaultOptionId,
              };
            }),
          };
        });
      }}
      effectiveImages={effectiveImages}
      selectedImageId={effectiveSelectedImageId}
      onImageSelect={setSelectedImageId}
      estimatedCheckout={estimatedCheckout}
      estimatedDeliveryDays={estimatedDeliveryDays}
      provisionalEstimatedDate={provisionalEstimatedDate}
      estimateUnavailableMessage={estimateUnavailableMessage}
      date={date}
      minimumDate={DateUtil.getNextBookableDate(new Date(Date.now() - 86_400_000))}
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
      canSubmit={canSubmit}
      receipt={receipt}
      shareError={shareError}
      appointmentShareText={appointmentShareText}
      onSubmit={submitBooking}
      onShare={shareAppointment}
      onCloseReceipt={() => setReceipt(null)}
    />
  );
}
