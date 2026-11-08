import type { CSSProperties, JSX, ReactNode } from 'react';
import { ColorUtil } from '../utils/color.util';
import type { CompanySummary } from '../interfaces/company.interface';

type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

type BusinessThemeProps = { business?: CompanySummary | null; slug: string; children: ReactNode };

export default function BusinessTheme({
  business,
  slug,
  children,
}: Readonly<BusinessThemeProps>): JSX.Element {
  const colors = business?.slug === slug ? ColorUtil.readPublicBusinessColors(business) : {};
  const style: ThemeStyle = {};

  if (colors.primaryColor) {
    const primary = colors.primaryColor;
    const onBrand = ColorUtil.foreground(primary);
    const contrastDirection = onBrand === '#ffffff' ? '#000000' : '#ffffff';
    const hover = ColorUtil.mix(primary, contrastDirection, 0.12);
    const soft = ColorUtil.mix(primary, '#ffffff', 0.92);
    const deep = ColorUtil.darkenForContrast(primary, soft, 7);
    style['--color-brand'] = primary;
    style['--color-brand-hover'] = hover;
    style['--color-brand-deep'] = deep;
    style['--color-brand-ink'] = ColorUtil.darkenForContrast(primary, soft, 9);
    style['--color-brand-soft'] = soft;
    style['--color-brand-line'] = ColorUtil.mix(primary, '#ffffff', 0.8);
    style['--color-brand-control'] = ColorUtil.darkenForContrast(primary, '#f3f6f9', 3);
    style['--color-brand-on'] = onBrand;
    style['--gradient-brand'] =
      `linear-gradient(135deg, ${hover} 0%, ${primary} 55%, ${hover} 100%)`;
  }

  if (colors.secondaryColor) {
    style['--color-promo'] = colors.secondaryColor;
    style['--color-promo-on'] = ColorUtil.foreground(colors.secondaryColor);
  }

  const cardAccent = colors.secondaryColor ?? colors.primaryColor;

  if (cardAccent) {
    style['--color-card-label'] = ColorUtil.lightenForContrast(
      cardAccent,
      style['--color-brand-ink'] ?? ColorUtil.defaultColorBrandInk,
      4.5,
    );
  }

  return (
    <div
      {...(colors.primaryColor ? { 'data-custom-primary': '' } : {})}
      {...(colors.secondaryColor ? { 'data-custom-secondary': '' } : {})}
      style={style}
    >
      {children}
    </div>
  );
}
