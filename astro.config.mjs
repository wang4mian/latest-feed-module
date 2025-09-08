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
    webAnalytics: { enabled: true },
    functionPerRoute: true
  }),
  server: {
    port: 3000,
    host: true
  },
  vite: {
    define: {
      'process.env.PUBLIC_SUPABASE_URL': JSON.stringify(process.env.PUBLIC_SUPABASE_URL),
      'process.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(process.env.PUBLIC_SUPABASE_ANON_KEY)
    }
  }
});