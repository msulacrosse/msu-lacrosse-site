import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n${site ? `Sitemap: ${new URL('/sitemap.xml', site)}\n` : ''}`, {
    headers: { 'content-type': 'text/plain' },
  });
