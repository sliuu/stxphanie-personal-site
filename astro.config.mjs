// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://stxphanie.com',
  // Pages are prerendered; only /api/feedback runs as a Vercel function.
  adapter: vercel(),
  env: {
    schema: {
      // Resend API key: the feedback endpoint emails each note through it.
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Where notes go: the Resend account's own address. Secret so it stays
      // out of the repo and the built pages.
      FEEDBACK_EMAIL_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
