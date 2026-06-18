import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        foreground: '#ffffff',
        muted: '#52525b',
        'muted-foreground': '#a1a1aa',
        border: '#27272a',
        accent: '#fafafa',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
