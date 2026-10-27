import type { JSX } from 'react';
import type { BookingTemplateProps } from '../../../interfaces/booking.interface';
import MarketBackground from '../../atoms/MarketBackground';
import Skeleton from '../../atoms/Skeleton/Skeleton';
import SkeletonCard from '../../molecules/SkeletonCard/SkeletonCard';
import BookingHero from '../../atoms/BookingHero';
import BookingReady from '../../organisms/BookingReady';

export default function BookingTemplate(props: Readonly<BookingTemplateProps>): JSX.Element {
  if (props.status === 'loading') {
    return (
      <>
        <MarketBackground />
        <main className="page stack market-page booking-page">
          <a className="market-back-link" href={`/empresa/${props.slug}`}>
            ← Voltar ao catálogo
          </a>

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
          <a className="market-back-link" href={`/empresa/${props.slug}`}>
            Voltar ao catálogo
          </a>
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
          <a href={`/empresa/${props.slug}`}>Voltar ao catálogo</a>
        </main>
      </>
    );
  }

  return <BookingReady {...props} />;
}
