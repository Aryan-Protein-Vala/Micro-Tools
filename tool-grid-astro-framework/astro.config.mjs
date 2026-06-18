import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
  vite: {
    ssr: {
      external: ['@vercel/analytics']
    },
    server: {
      allowedHosts: ['sb-3k73t6xbd5bl.vercel.run', 'localhost', '127.0.0.1'],
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      }
    }
  }
});
