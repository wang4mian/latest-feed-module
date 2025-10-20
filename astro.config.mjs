import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop'
    }
  }
});