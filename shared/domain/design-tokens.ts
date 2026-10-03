export const designTokens = {
  color: {
    brand: '#4f46e5',
    brandHover: '#4338ca',
    success: '#0f766e',
    danger: '#b91c1c',
    text: '#0f172a',
    muted: '#475569',
    surface: '#ffffff',
    background: '#f8fafc',
    border: '#cbd5e1',
  },
  font: {
    family: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    bodySize: '1rem',
    lineHeight: 1.5,
  },
  spacing: { unit: '0.25rem', page: '1.5rem', section: '2rem' },
  radius: { control: '0.375rem', card: '0.75rem' },
} as const;
