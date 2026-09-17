// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Set SITE_URL in Vercel once you have a domain (used for sitemap/OG/ICS links).
const site = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${(process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL).replace(/^https?:\/\//, '')}`
  : 'http://localhost:4321';

export default defineConfig({
  site,
  // Everything is static HTML except src/pages/api/* (news publisher), which
  // opts out with `export const prerender = false` and runs as a Vercel function.
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'never',
  build: { format: 'file' },
});
