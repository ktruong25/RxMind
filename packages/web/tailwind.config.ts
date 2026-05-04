import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      'var(--color-bg)',
        surface: 'var(--color-surface)',
        border:  'var(--color-border)',
        text:    'var(--color-text)',
        muted:   'var(--color-muted)',
        accent:  'var(--color-accent)',
        danger:  'var(--color-danger)',
        warn:    'var(--color-warn)',
        success: 'var(--color-success)',
      },
    },
  },
  plugins: [],
};

export default config;
