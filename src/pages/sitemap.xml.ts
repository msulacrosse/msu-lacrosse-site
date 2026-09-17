import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { roster } from '../lib/mcla';

export const GET: APIRoute = async ({ site }) => {
  const base = site?.toString().replace(/\/$/, '') || '';
  const posts = await getCollection('news', ({ data }) => !data.draft);
  const urls = [
    '/', '/schedule', '/roster', '/stats', '/news', '/about',
    ...roster.map((p) => `/roster/${p.slug}`),
    ...posts.map((p) => `/news/${p.id}`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml' } });
};
