import type { JSX } from 'react';
import type { BookingTemplateProps } from '../../../interfaces/booking.interface';
import MarketBackground from '../../atoms/MarketBackground';
import BookingHero from '../../atoms/BookingHero';
import BookingServiceSummary from '../BookingServiceSummary/BookingServiceSummary';
import BookingAvailability from '../BookingAvailability/BookingAvailability';
import BookingCustomerDetails from '../BookingCustomerDetails/BookingCustomerDetails';
import BookingReceiptDialog from '../BookingReceiptDialog/BookingReceiptDialog';

type BookingReadyProps = Extract<BookingTemplateProps, { status: 'ready' }>;

export default function BookingReady({
  slug,
  catalog,
  product,
  customizationSelections,
  onCustomizationChange,
  effectiveImages,
  selectedImageId,
  onImageSelect,
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
}: Readonly<BookingReadyProps>): JSX.Element {
  return (
    <>
      <MarketBackground />
      <main className="page stack market-page booking-page">
        <a aria-label="Voltar ao catálogo" className="market-back-link" href={`/empresa/${slug}`}>
          ← Voltar ao catálogo
        </a>

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
