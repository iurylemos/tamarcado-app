import type { JSX } from 'react';
import type { PublicCatalogData } from '../../../../../src/interfaces/catalog.interface';
import { useConfig } from 'vike-react/useConfig';
import { useData } from 'vike-react/useData';
import BookingPage from '../../../../../src/pages/BookingPage';

export default function Page(): JSX.Element {
  const { slug, productId, business, product, status } = useData<PublicCatalogData>();

  const title =
    status === undefined
      ? 'Carregando agendamento | Tá Marcado'
      : product && business
        ? `Agende ${product.name} | ${business.name} | Tá Marcado`
        : 'Agendamento não encontrado | Tá Marcado';

  const description =
    status === undefined
      ? 'Carregando os dados do agendamento.'
      : product && business
        ? `Agende ${product.name} em ${business.name} pelo Tá Marcado.`
        : 'O serviço solicitado não está disponível neste catálogo.';

  const config = useConfig();

  config({
    title,
    Head: (
      <>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {business?.logoUrl && <meta property="og:image" content={business.logoUrl} />}
      </>
    ),
  });

  return (
    <BookingPage
      slug={slug}
      productId={productId}
      initialBusiness={business}
      initialProduct={product}
      initialStatus={status}
    />
  );
}
