import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({
      // 使用默认Tailwind基础样式
      applyBaseStyles: true,
    })
  ],
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
  server: {
    port: 4000,
    host: true
  }
});