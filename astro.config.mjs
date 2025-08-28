import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({
      // 禁用默认基础样式，使用Franken UI
      applyBaseStyles: false,
    })
  ],
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true },
    functionPerRoute: false
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