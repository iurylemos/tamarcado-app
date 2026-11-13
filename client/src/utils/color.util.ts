import { calculateContrastRatio, normalizeHexColor } from '../../../shared/domain/color.ts';
import type { ColorPalette } from '../interfaces/color.interface.ts';
import type { CompanySummary } from '../interfaces/company.interface.ts';

type ColorData = {
  primaryColor?: string;
  secondaryColor?: string;
};

export class ColorUtil {
  public static readonly defaultChannels: number[] = [1, 3, 5];
  public static readonly defaultColorBrandInk: string = '#061320';
  public static readonly defaultColorBlack: string = '#000000';
  public static readonly defaultColorWhite: string = '#ffffff';

  public static readonly defaultPalette: ColorPalette = {
    main: 'var(--color-brand)',
    deep: 'var(--color-brand-deep)',
    accent: 'var(--color-promo)',
    glow: 'var(--color-brand-soft)',
    soft: 'var(--color-brand-soft)',
    background: 'var(--color-background)',
    on: this.defaultColorWhite,
  };

  public static buildPalette(business?: CompanySummary | null): ColorPalette {
    const { primaryColor, secondaryColor } = business
      ? ColorUtil.readPublicBusinessColors(business)
      : {};
    if (!primaryColor) {
      return secondaryColor
        ? { ...this.defaultPalette, accent: secondaryColor }
        : this.defaultPalette;
    }

    const white = ColorUtil.defaultColorWhite;
    return {
      main: primaryColor,
      deep: ColorUtil.darkenForContrast(primaryColor, white, 4.5),
      accent: secondaryColor ?? this.defaultPalette.accent,
      glow: ColorUtil.mix(primaryColor, white, 0.7),
      soft: ColorUtil.mix(primaryColor, white, 0.88),
      background: ColorUtil.mix(primaryColor, white, 0.94),
      on: ColorUtil.foreground(primaryColor),
    };
  }

  public static getGradientColor(hover: string, primary: string): string {
    return `linear-gradient(135deg, ${hover} 0%, ${primary} 55%, ${hover} 100%)`;
  }

  public static readPublicBusinessColors(data: ColorData): ColorData {
    const colors: ColorData = {};

    for (const field of ['primaryColor', 'secondaryColor'] as const) {
      if (!Object.hasOwn(data, field)) continue;
      const color = normalizeHexColor(data[field]);

      if (!color) {
        throw new Error(`A published public business has an invalid ${field} color.`);
      }

      colors[field] = color;
    }

    return colors;
  }

  public static mix(color: string, target: string, amount: number): string {
    const channels = this.defaultChannels.map((index) => {
      const from = Number.parseInt(color.slice(index, index + 2), 16);
      const to = Number.parseInt(target.slice(index, index + 2), 16);
      return Math.round(from + (to - from) * amount)
        .toString(16)
        .padStart(2, '0');
    });

    return `#${channels.join('')}`;
  }

  public static foreground(color: string): string {
    const black = calculateContrastRatio(this.defaultColorBlack, color);
    const white = calculateContrastRatio(this.defaultColorWhite, color);

    if (black === null || white === null) {
      throw new Error('Invalid public theme color.');
    }

    return black >= white ? this.defaultColorBlack : this.defaultColorWhite;
  }

  public static darkenForContrast(color: string, background: string, minimum: number): string {
    for (let amount = 0; amount <= 100; amount += 1) {
      const candidate = this.mix(color, this.defaultColorBlack, amount / 100);
      const ratio = calculateContrastRatio(candidate, background);

      if (ratio !== null && ratio >= minimum) {
        return candidate;
      }
    }

    throw new Error('Unable to derive an accessible public theme color.');
  }

  public static lightenForContrast(color: string, background: string, minimum: number): string {
    for (let amount = 0; amount <= 100; amount += 1) {
      const candidate = this.mix(color, this.defaultColorWhite, amount / 100);
      const ratio = calculateContrastRatio(candidate, background);

      if (ratio !== null && ratio >= minimum) {
        return candidate;
      }
    }

    throw new Error('Unable to derive an accessible public theme color.');
  }
}
