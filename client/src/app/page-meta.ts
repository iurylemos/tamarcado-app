import type { PageData } from './page-data';

export type PageMeta = {
  title: string;
  description: string;
  imageUrl?: string;
};

const brand = 'Tá Marcado';

export function resolvePageMeta(page: PageData): PageMeta {
  if (page.name === 'home') {
    return {
      title: `${brand} | Catálogos e agendamentos`,
      description: 'Acesse o catálogo público do seu negócio e agende serviços online.',
    };
  }

  if (page.name === 'catalog') {
    const { business, status } = page;

    if (status === undefined) {
      return {
        title: `Carregando catálogo | ${brand}`,
        description: 'Confira os catálogos públicos disponíveis no Tá Marcado.',
      };
    }

    return status === 'ready' && business
      ? {
          title: `${business.name} | ${brand}`,
          description: `Conheça os serviços de ${business.name}.`,
          ...(business.logoUrl ? { imageUrl: business.logoUrl } : {}),
        }
      : {
          title: `Catálogo não encontrado | ${brand}`,
          description: 'Confira os catálogos públicos disponíveis no Tá Marcado.',
        };
  }

  if (page.name === 'booking') {
    const { business, product, status } = page;

    if (status === undefined) {
      return {
        title: `Carregando agendamento | ${brand}`,
        description: 'Carregando os dados do agendamento.',
      };
    }

    return product && business
      ? {
          title: `Agende ${product.name} | ${business.name} | ${brand}`,
          description: `Agende ${product.name} em ${business.name} pelo ${brand}.`,
          ...(business.logoUrl ? { imageUrl: business.logoUrl } : {}),
        }
      : {
          title: `Agendamento não encontrado | ${brand}`,
          description: 'O serviço solicitado não está disponível neste catálogo.',
        };
  }

  return {
    title: `Página não encontrada | ${brand}`,
    description: 'Esta página não existe.',
  };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderPageMetaTags({ description, title, imageUrl }: PageMeta): string {
  return [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    ...(imageUrl ? [`<meta property="og:image" content="${escapeHtml(imageUrl)}" />`] : []),
  ].join('\n    ');
}
