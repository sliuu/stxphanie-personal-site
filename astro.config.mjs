// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://stxphanie.com',
  // Pages are prerendered; only /api/feedback runs as a Vercel function.
  adapter: vercel(),
  env: {
    schema: {
      // Upstash Redis REST credentials for the anonymous feedback store.
      FEEDBACK_REDIS_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      FEEDBACK_REDIS_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
