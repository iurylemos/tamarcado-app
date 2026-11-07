import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import type { BookingTemplateProps } from '../../../interfaces/booking.interface';
import MarketBackground from '../../atoms/MarketBackground';
import Skeleton from '../../atoms/Skeleton/Skeleton';
import BookingHero from '../../atoms/BookingHero';
import BookingReady from '../../organisms/BookingReady';
import { companyCatalogPath } from '../../../app/routes';

export default function BookingTemplate(props: Readonly<BookingTemplateProps>): JSX.Element {
  if (props.status === 'loading') {
    return (
      <>
        <MarketBackground />
        <main className="page stack market-page booking-page">
          <Link className="market-back-link" to={companyCatalogPath(props.slug)}>
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

            <section className="booking-panel" aria-label="Carregando serviço">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">CARREGANDO SERVIÇO</p>
                  <h2>Preparando seu agendamento</h2>
                </div>
              </div>
              <div aria-busy="true">
                <p className="skeleton-status" role="status">
                  Carregando informações do serviço...
                </p>
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
          <Link className="market-back-link" to={companyCatalogPath(props.slug)}>
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
          <Link to={companyCatalogPath(props.slug)}>Voltar ao catálogo</Link>
        </main>
      </>
    );
  }

  return <BookingReady {...props} />;
}
