import type { APIRoute } from 'astro';
import { authed, config, json, slugify, yamlStr, commitFiles, type FileChange } from '../../lib/admin';

/**
 * POST /api/publish — create or update a news post. Used by /admin.
 * Requires Authorization: Bearer <token> from /api/auth.
 *
 * Body: { slug?, title, date, tag, excerpt, author, html, image?: {name,type,data}, removeImage?, existingImage? }
 * The article body is stored as HTML inside the markdown file (markdown allows raw HTML),
 * which is what the rich text editor produces.
 */
export const prerender = false;

interface Body {
  slug?: string;
  title: string;
  date?: string;
  tag?: string;
  excerpt?: string;
  author?: string;
  html: string;
  image?: { name: string; type: string; data: string };
  existingImage?: string;
  removeImage?: boolean;
}

// Strip anything that shouldn't come out of the editor (scripts, event handlers, javascript: links)
function sanitize(html: string) {
  return html
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*/gi, '$1=$2#');
}

export const POST: APIRoute = async ({ request }) => {
  if (!config().ok) return json({ error: 'Publishing is not configured yet. Set ADMIN_PASSWORD, GITHUB_TOKEN and GITHUB_REPO in Vercel.' }, 500);
  if (!authed(request)) return json({ error: 'Not signed in' }, 401);

  let body: Body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }

  const title = (body.title || '').trim();
  const html = sanitize((body.html || '').trim());
  const plain = html.replace(/<[^>]+>/g, '').trim();
  if (!title || !plain) return json({ error: 'Title and article text are required' }, 400);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date || '') ? body.date! : new Date().toISOString().slice(0, 10);
  const tag = (body.tag || 'Team').trim().slice(0, 30);
  const excerpt = (body.excerpt || '').trim().slice(0, 300);
  const author = (body.author || '').trim().slice(0, 80);
  const editing = Boolean(body.slug);
  const slug = editing ? String(body.slug).replace(/[^a-z0-9-]/g, '') : `${date}-${slugify(title) || 'post'}`;
  if (!slug) return json({ error: 'Bad slug' }, 400);

  const files: FileChange[] = [];
  let imagePath: string | undefined = body.removeImage ? undefined : (body.existingImage || undefined);
  if (body.image?.data) {
    const ext = body.image.type === 'image/png' ? 'png' : body.image.type === 'image/webp' ? 'webp' : 'jpg';
    const base = slugify(body.image.name.replace(/\.[^.]+$/, '')) || 'photo';
    imagePath = `/news/${slug}/${base}.${ext}`;
    if (body.image.data.length > 6_000_000) return json({ error: 'Image is too large (max ~4 MB)' }, 413);
    files.push({ path: `public${imagePath}`, content: body.image.data, encoding: 'base64' });
  }

  const front = [
    '---',
    `title: ${yamlStr(title)}`,
    `date: ${date}`,
    `tag: ${yamlStr(tag)}`,
    excerpt ? `excerpt: ${yamlStr(excerpt)}` : null,
    author ? `author: ${yamlStr(author)}` : null,
    imagePath ? `image: ${yamlStr(imagePath)}` : null,
    '---',
  ].filter(Boolean).join('\n');
  files.push({ path: `src/content/news/${slug}.md`, content: `${front}\n\n${html}\n` });

  try {
    const sha = await commitFiles(`news: ${editing ? 'update' : 'add'} ${title}${author ? ` (by ${author})` : ''}`, files);
    return json({ ok: true, slug, url: `/news/${slug}`, commit: sha });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message || 'Publish failed' }, 502);
  }
};
