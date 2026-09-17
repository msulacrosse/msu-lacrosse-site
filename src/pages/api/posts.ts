import type { APIRoute } from 'astro';
import { authed, config, gh, json, parsePost, commitFiles } from '../../lib/admin';

/**
 * GET  /api/posts            -> list of posts (from the repo, so it includes ones not deployed yet)
 * GET  /api/posts?slug=x     -> one post with its body
 * DELETE /api/posts {slug}   -> removes the post file (and its photo folder)
 * All require the Authorization: Bearer <token> header from /api/auth.
 */
export const prerender = false;

const DIR = 'src/content/news';

export const GET: APIRoute = async ({ request, url }) => {
  if (!config().ok) return json({ error: 'Not configured' }, 500);
  if (!authed(request)) return json({ error: 'Not signed in' }, 401);
  const { repo, branch } = config();
  const slug = url.searchParams.get('slug');
  try {
    if (slug) {
      const file = await gh(`/repos/${repo}/contents/${DIR}/${encodeURIComponent(slug)}.md?ref=${branch}`);
      const raw = Buffer.from(file.content, 'base64').toString('utf8');
      const { data, body } = parsePost(raw);
      return json({ slug, ...data, body });
    }
    const list = await gh(`/repos/${repo}/contents/${DIR}?ref=${branch}`);
    const posts = await Promise.all(
      (Array.isArray(list) ? list : []).filter((f: any) => f.name.endsWith('.md')).map(async (f: any) => {
        const file = await gh(`/repos/${repo}/contents/${DIR}/${f.name}?ref=${branch}`);
        const { data } = parsePost(Buffer.from(file.content, 'base64').toString('utf8'));
        return { slug: f.name.replace(/\.md$/, ''), title: data.title || f.name, date: data.date || '', tag: data.tag || '', excerpt: data.excerpt || '', image: data.image || '', author: data.author || '' };
      }),
    );
    posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return json({ posts });
  } catch (e: any) {
    return json({ error: e.message }, 502);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!config().ok) return json({ error: 'Not configured' }, 500);
  if (!authed(request)) return json({ error: 'Not signed in' }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const slug = String(body?.slug || '').replace(/[^a-z0-9-]/g, '');
  if (!slug) return json({ error: 'Missing slug' }, 400);
  const { repo, branch } = config();
  try {
    const files = [{ path: `${DIR}/${slug}.md`, delete: true }];
    // Remove the post's photo folder too, if it has one
    try {
      const imgs = await gh(`/repos/${repo}/contents/public/news/${slug}?ref=${branch}`);
      if (Array.isArray(imgs)) for (const f of imgs) files.push({ path: f.path, delete: true });
    } catch { /* no photos */ }
    const sha = await commitFiles(`news: delete ${slug}`, files);
    return json({ ok: true, commit: sha });
  } catch (e: any) {
    return json({ error: e.message }, 502);
  }
};
