type StylesheetLink = { tag: string; href: string };

export function findStylesheetLink(html: string): StylesheetLink {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  const stylesheetLinks = links.filter((link) => /\brel=["']stylesheet["']/i.test(link));

  if (stylesheetLinks.length !== 1) {
    throw new Error('Expected exactly one initial stylesheet in the storefront template.');
  }

  const tag = stylesheetLinks[0];
  const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];

  if (!href) {
    throw new Error('The initial storefront stylesheet link has no href.');
  }

  return { tag, href };
}

export function inlineStylesheet(html: string, stylesheet: string): string {
  const { tag } = findStylesheetLink(html);
  return html.replace(tag, `<style>${stylesheet.replace(/<\/style/gi, '<\\/style')}</style>`);
}
