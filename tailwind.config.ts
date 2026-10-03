import type { Config } from 'tailwindcss';

export default {
  content: ['./client/src/**/*.{ts,tsx}', './collaborator/src/**/*.{ts,tsx}', './backoffice/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef2ff', 600: '#4f46e5', 700: '#4338ca' },
        success: '#0f766e',
      },
    },
  },
  plugins: [],
} satisfies Config;
