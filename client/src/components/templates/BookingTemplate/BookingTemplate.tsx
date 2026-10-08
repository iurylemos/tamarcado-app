import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { AvailableSlot } from '@shared/interfaces/availability.interface';
import type {
  BookingReceipt,
  CompanyCatalog,
  PublicProductSummary,
} from '../../../interfaces/company.interface';
import type { BookingFormValues } from '../../../interfaces/booking.interface';
import type { EligibleProfessional } from '../../../interfaces/professional.interface';
import MarketBackground from '../../atoms/MarketBackground';
import Skeleton from '../../atoms/Skeleton/Skeleton';
import SkeletonCard from '../../molecules/SkeletonCard/SkeletonCard';
import BookingAvailability from '../../organisms/BookingAvailability/BookingAvailability';
import BookingCustomerDetails from '../../organisms/BookingCustomerDetails/BookingCustomerDetails';
import BookingReceiptDialog from '../../organisms/BookingReceiptDialog/BookingReceiptDialog';
import BookingServiceSummary from '../../organisms/BookingServiceSummary/BookingServiceSummary';

type BookingTemplateState =
  | { status: 'loading'; slug: string }
  | { status: 'error'; slug: string; error: string }
  | { status: 'not-found'; slug: string }
  | {
      status: 'ready';
      slug: string;
      catalog: CompanyCatalog;
      product: PublicProductSummary;
      date: string;
      minimumDate: string;
      onDateChange: (date: string) => void;
      professionals: EligibleProfessional[];
      selectedProfessionalId: string;
      onProfessionalChange: (professionalId: string) => void;
      availabilityLoading: boolean;
      slots: AvailableSlot[];
      visibleSlots: AvailableSlot[];
      selectedStartsAt: string;
      onTimeChange: (startsAt: string) => void;
      searchingNextDate: boolean;
      nextDateSearchComplete: boolean;
      nextDateSearchError: string;
      error: string;
      busy: boolean;
      receipt: BookingReceipt | null;
      shareError: string;
      appointmentShareText: string;
      onSubmit: (values: BookingFormValues) => Promise<void>;
      onShare: () => Promise<void>;
      onCloseReceipt: () => void;
    };

export default function BookingTemplate(props: Readonly<BookingTemplateState>): JSX.Element {
  if (props.status === 'loading') {
    return (
      <>
        <MarketBackground />
        <main className="page stack market-page booking-page">
          <p className="skeleton-status" role="status">
            Carregando serviço...
          </p>
          <header className="booking-hero booking-loading-hero" aria-hidden="true">
            <div>
              <Skeleton className="booking-loading-eyebrow" width="30%" />
              <Skeleton className="booking-loading-title" width="78%" />
              <Skeleton className="booking-loading-copy" width="52%" />
            </div>
          </header>
          <div className="booking-layout">
            <SkeletonCard variant="booking" />
            <section className="booking-panel booking-loading-panel" aria-hidden="true">
              <div className="booking-loading-heading">
                <Skeleton className="booking-loading-eyebrow" width="42%" />
                <Skeleton className="booking-loading-title" width="65%" />
              </div>
              <div className="booking-loading-field">
                <Skeleton className="booking-loading-field-label" width="38%" />
                <Skeleton className="booking-loading-field-input" />
              </div>
              <div className="slot-grid">
                {Array.from({ length: 4 }, (_, index) => (
                  <SkeletonCard key={`booking-loading-time-${index}`} variant="time" />
                ))}
              </div>
              <div className="booking-loading-contact">
                <Skeleton className="booking-loading-eyebrow" width="28%" />
                <Skeleton className="booking-loading-title" width="46%" />
                <Skeleton className="booking-loading-field-input" />
                <Skeleton className="booking-loading-field-input" />
              </div>
            </section>
          </div>
        </main>
      </>
    );
  }

  if (props.status === 'error') {
    return (
      <>
        <MarketBackground />
        <main className="page market-page">
          <p role="alert" className="error state-card">
            {props.error}
          </p>
        </main>
      </>
    );
  }

  if (props.status === 'not-found') {
    return (
      <>
        <MarketBackground />
        <main className="page market-page state-card">
          <p role="status">Serviço não encontrado.</p>
          <Link to={`/empresa/${props.slug}`}>Voltar ao catálogo</Link>
        </main>
      </>
    );
  }

  return <BookingReadyTemplate {...props} />;
}

function BookingReadyTemplate({
  slug,
  catalog,
  product,
  date,
  minimumDate,
  onDateChange,
  professionals,
  selectedProfessionalId,
  onProfessionalChange,
  availabilityLoading,
  slots,
  visibleSlots,
  selectedStartsAt,
  onTimeChange,
  searchingNextDate,
  nextDateSearchComplete,
  nextDateSearchError,
  error,
  busy,
  receipt,
  shareError,
  appointmentShareText,
  onSubmit,
  onShare,
  onCloseReceipt,
}: Extract<BookingTemplateState, { status: 'ready' }>): JSX.Element {
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
          <BookingServiceSummary catalog={catalog} product={product} />

          <section className="booking-panel" aria-label="Escolha seu horário">
            <BookingAvailability
              date={date}
              minimumDate={minimumDate}
              onDateChange={onDateChange}
              professionals={professionals}
              selectedProfessionalId={selectedProfessionalId}
              onProfessionalChange={onProfessionalChange}
              availabilityLoading={availabilityLoading}
              slots={slots}
              visibleSlots={visibleSlots}
              selectedStartsAt={selectedStartsAt}
              onTimeChange={onTimeChange}
              searchingNextDate={searchingNextDate}
              nextDateSearchComplete={nextDateSearchComplete}
              nextDateSearchError={nextDateSearchError}
              error={error}
              durationMinutes={product.durationMinutes}
            />
            <BookingCustomerDetails
              selectedStartsAt={selectedStartsAt}
              busy={busy}
              error={error}
              onSubmit={onSubmit}
            />
          </section>
        </div>

        <BookingReceiptDialog
          receipt={receipt}
          businessName={catalog.business.name}
          productName={product.name}
          appointmentShareText={appointmentShareText}
          shareError={shareError}
          onShare={onShare}
          onClose={onCloseReceipt}
        />
      </main>
    </>
  );
}
