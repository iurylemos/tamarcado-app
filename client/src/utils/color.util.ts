import { calculateContrastRatio, normalizeHexColor } from '../../../shared/domain/color.ts';

type ColorData = {
  primaryColor?: string;
  secondaryColor?: string;
};

export class ColorUtil {
  public static readonly defaultColorBrandInk: string = '#061320';

  public static readPublicBusinessColors(data: ColorData): ColorData {
    const colors: ColorData = {};

    for (const field of ['primaryColor', 'secondaryColor'] as const) {
      if (!Object.hasOwn(data, field)) continue;
      const color = normalizeHexColor(data[field]);
      if (!color) throw new Error(`A published public business has an invalid ${field} color.`);
      colors[field] = color;
    }

    return colors;
  }

  public static mix(color: string, target: string, amount: number): string {
    const channels = [1, 3, 5].map((index) => {
      const from = Number.parseInt(color.slice(index, index + 2), 16);
      const to = Number.parseInt(target.slice(index, index + 2), 16);
      return Math.round(from + (to - from) * amount)
        .toString(16)
        .padStart(2, '0');
    });

    return `#${channels.join('')}`;
  }

  public static foreground(color: string): string {
    const black = calculateContrastRatio('#000000', color);
    const white = calculateContrastRatio('#ffffff', color);
    if (black === null || white === null) throw new Error('Invalid public theme color.');
    return black >= white ? '#000000' : '#ffffff';
  }

  public static darkenForContrast(color: string, background: string, minimum: number): string {
    for (let amount = 0; amount <= 100; amount += 1) {
      const candidate = this.mix(color, '#000000', amount / 100);
      const ratio = calculateContrastRatio(candidate, background);
      if (ratio !== null && ratio >= minimum) return candidate;
    }
    throw new Error('Unable to derive an accessible public theme color.');
  }

  public static lightenForContrast(color: string, background: string, minimum: number): string {
    for (let amount = 0; amount <= 100; amount += 1) {
      const candidate = this.mix(color, '#ffffff', amount / 100);
      const ratio = calculateContrastRatio(candidate, background);
      if (ratio !== null && ratio >= minimum) return candidate;
    }
    throw new Error('Unable to derive an accessible public theme color.');
  }
}
