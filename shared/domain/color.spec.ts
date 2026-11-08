import { describe, expect, it } from 'vitest';
import { calculateContrastRatio, normalizeHexColor } from './color.js';

describe('normalizeHexColor', () => {
  it('accepts six-digit RGB values with or without a hash and normalizes casing', () => {
    expect(normalizeHexColor('#ABCDEF')).toBe('#abcdef');
    expect(normalizeHexColor('123456')).toBe('#123456');
  });

  it.each(['#abc', '#12345', '#1234567', '#12gh56', '', null, 123])(
    'rejects invalid value %s',
    (value) => {
      expect(normalizeHexColor(value)).toBeNull();
    },
  );
});

describe('calculateContrastRatio', () => {
  it('calculates the WCAG contrast ratio for black and white', () => {
    expect(calculateContrastRatio('#000000', '#ffffff')).toBe(21);
  });

  it('distinguishes combinations below and above the normal-text threshold', () => {
    expect(calculateContrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(calculateContrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('returns null when either color is invalid', () => {
    expect(calculateContrastRatio('#ffffff', 'invalid')).toBeNull();
  });
});
