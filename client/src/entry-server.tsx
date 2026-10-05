import { renderToStaticMarkup } from 'react-dom/server';
import type { PublicBusiness } from '../../shared/domain/interfaces/tenant.interface';
import type { StorefrontService } from './interfaces/storeFront.interface';

export function renderPublicContent(
  business: PublicBusiness,
  services: StorefrontService[],
): string {
  return renderToStaticMarkup(
    <main>
      <header>
        {business.logoUrl && <img src={business.logoUrl} alt="" />}
        <h1>{business.name}</h1>
        {business.description && <p>{business.description}</p>}
      </header>
      <section aria-label="Serviços disponíveis">
        <h2>Serviços</h2>

        {services.length === 0 ? (
          <p>Nenhum serviço disponível no momento.</p>
        ) : (
          <ul>
            {services.map((service: StorefrontService) => (
              <li key={service.id}>
                <img src={service.imageUrl} alt="" />
                <h3>{service.name}</h3>
                {service.description && <p>{service.description}</p>}
                <p>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    service.priceCents / 100,
                  )}
                </p>
                <p>{service.durationMinutes} minutos</p>
                <a href={`/empresa/${business.slug}/agendar/${service.id}`}>Escolher horário</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>,
  );
}
