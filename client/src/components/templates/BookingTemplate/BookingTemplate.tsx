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
  | {
      status: 'loading';
      slug: string;
      date: string;
      minimumDate: string;
      onDateChange: (date: string) => void;
    }
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
          <Link className="market-back-link" to={`/empresa/${props.slug}`}>
            ← Voltar ao catálogo
          </Link>

          <BookingHero />

          <div className="booking-layout">
            <aside className="booking-summary booking-summary-loading" aria-busy="true">
              <p className="eyebrow">RESUMO DO SERVIÇO</p>
              <span className="booking-summary-icon" aria-hidden="true">
                ✂
              </span>
              <div className="booking-summary-loading-content" aria-hidden="true">
                <Skeleton className="booking-summary-loading-business" />
                <Skeleton className="booking-summary-loading-title" />
                <Skeleton className="booking-summary-loading-description" />
              </div>
              <div className="booking-summary-details" aria-hidden="true">
                <Skeleton className="booking-summary-loading-price" />
                <Skeleton className="booking-summary-loading-duration" />
              </div>
            </aside>

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
                  value={props.date}
                  min={props.minimumDate}
                  onChange={(event) => props.onDateChange(event.target.value)}
                />
              </label>
              <div aria-busy="true">
                <p className="skeleton-status" role="status">
                  Preparando horários disponíveis...
                </p>
                <div className="slot-grid" aria-label="Carregando horários disponíveis">
                  {Array.from({ length: 4 }, (_, index) => (
                    <SkeletonCard key={`booking-loading-time-${index}`} variant="time" />
                  ))}
                </div>
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
        <main className="page stack market-page">
          <p role="alert" className="error state-card">
            {props.error}
          </p>
          <Link className="market-back-link" to={`/empresa/${props.slug}`}>
            Voltar ao catálogo
          </Link>
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

        <BookingHero />

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

function BookingHero(): JSX.Element {
  return (
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
  );
}
