import type { JSX } from 'react';
import { MotionConfig } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { BookingTemplateProps } from '../../../interfaces/booking.interface';
import MarketBackground from '../../atoms/MarketBackground';
import BookingHero from '../../atoms/BookingHero';
import BookingServiceSummary from '../BookingServiceSummary/BookingServiceSummary';
import BookingAvailability from '../BookingAvailability/BookingAvailability';
import BookingCustomerDetails from '../BookingCustomerDetails/BookingCustomerDetails';
import BookingReceiptDialog from '../BookingReceiptDialog/BookingReceiptDialog';
import { companyCatalogPath } from '../../../app/routes';

type BookingReadyProps = Extract<BookingTemplateProps, { status: 'ready' }> & {
  allowContactScroll: boolean;
};

export default function BookingReady({
  slug,
  catalog,
  product,
  customizationSelections,
  allowContactScroll,
  onCustomizationChange,
  effectiveImages,
  selectedImageId,
  onImageSelect,
  estimatedCheckout,
  estimatedDeliveryDays,
  provisionalEstimatedDate,
  estimateUnavailableMessage,
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
  canSubmit,
  receipt,
  shareError,
  appointmentShareText,
  onSubmit,
  onShare,
  onCloseReceipt,
}: Readonly<BookingReadyProps>): JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <MarketBackground />
      <main className="page stack market-page booking-page">
        <Link
          aria-label="Voltar ao catálogo"
          className="market-back-link"
          to={companyCatalogPath(slug)}
        >
          ← Voltar ao catálogo
        </Link>

        <BookingHero />

        <div className="booking-layout">
          <BookingServiceSummary
            catalog={catalog}
            product={product}
            customizationSelections={customizationSelections}
            onCustomizationChange={onCustomizationChange}
            images={effectiveImages}
            selectedImageId={selectedImageId}
            onImageSelect={onImageSelect}
          />

          <section
            className="booking-panel"
            aria-label={estimatedCheckout ? 'Prazo e profissional' : 'Escolha seu horário'}
          >
            <BookingAvailability
              estimatedCheckout={estimatedCheckout}
              estimatedDeliveryDays={estimatedDeliveryDays}
              provisionalEstimatedDate={provisionalEstimatedDate}
              estimateUnavailableMessage={estimateUnavailableMessage}
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
              timezone={catalog.business.timezone}
            />
            <BookingCustomerDetails
              canSubmit={canSubmit}
              allowContactScroll={allowContactScroll}
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
    </MotionConfig>
  );
}
