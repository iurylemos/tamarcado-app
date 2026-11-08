const hexColorPattern = /^#?([0-9a-f]{6})$/i;

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = hexColorPattern.exec(value);
  const hex = match?.[1];
  return hex ? `#${hex.toLowerCase()}` : null;
}

function linearizeChannel(hexPair: string): number {
  const channel = Number.parseInt(hexPair, 16) / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: string): number {
  return (
    0.2126 * linearizeChannel(color.slice(1, 3)) +
    0.7152 * linearizeChannel(color.slice(3, 5)) +
    0.0722 * linearizeChannel(color.slice(5, 7))
  );
}

export function calculateContrastRatio(foreground: unknown, background: unknown): number | null {
  const normalizedForeground = normalizeHexColor(foreground);
  const normalizedBackground = normalizeHexColor(background);
  if (!normalizedForeground || !normalizedBackground) return null;

  const foregroundLuminance = relativeLuminance(normalizedForeground);
  const backgroundLuminance = relativeLuminance(normalizedBackground);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}
