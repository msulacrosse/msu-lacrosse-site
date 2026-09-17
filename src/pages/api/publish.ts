import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * POST /api/publish — used by the hidden /admin page.
 *
 * Checks the shared password, then writes a markdown post (and optional image)
 * straight into the GitHub repo in one commit. Vercel sees the commit and
 * redeploys, so the post is live a minute or two later.
 *
 * Required environment variables (set in Vercel → Project → Settings → Environment Variables):
 *   ADMIN_PASSWORD   the password people type on /admin
 *   GITHUB_TOKEN     fine-grained token with "Contents: Read and write" on this repo
 *   GITHUB_REPO      "org-name/repo-name"
 *   GITHUB_BRANCH    optional, default "main"
 */
export const prerender = false;

const env = (k: string) => process.env[k] ?? (import.meta.env as any)[k] ?? '';
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const sha256 = (s: string) => createHash('sha256').update(s).digest();
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
const yamlStr = (s: string) => JSON.stringify(s); // JSON strings are valid YAML

interface Body {
  password: string;
  title: string;
  date?: string;      // YYYY-MM-DD
  tag?: string;
  excerpt?: string;
  author?: string;
  body: string;       // markdown
  image?: { name: string; type: string; data: string }; // base64
}

async function gh(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`${env('GITHUB_API_BASE') || 'https://api.github.com'}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'content-type': 'application/json', 'user-agent': 'msu-lacrosse-site', ...(init.headers || {}) },
  });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${data.message || text}`);
  return data;
}

export const POST: APIRoute = async ({ request }) => {
  const password = env('ADMIN_PASSWORD');
  const token = env('GITHUB_TOKEN');
  const repo = env('GITHUB_REPO');
  const branch = env('GITHUB_BRANCH') || 'main';
  if (!password || !token || !repo) return json({ error: 'Publishing is not configured yet. Set ADMIN_PASSWORD, GITHUB_TOKEN and GITHUB_REPO in Vercel.' }, 500);

  let body: Body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }

  // Constant-time password check + a delay on failure to slow down guessing
  const ok = body.password && timingSafeEqual(sha256(body.password), sha256(password));
  if (!ok) { await new Promise((r) => setTimeout(r, 1500)); return json({ error: 'Wrong password' }, 401); }

  const title = (body.title || '').trim();
  const markdown = (body.body || '').trim();
  if (!title || !markdown) return json({ error: 'Title and article text are required' }, 400);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date || '') ? body.date! : new Date().toISOString().slice(0, 10);
  const tag = (body.tag || 'Team').trim().slice(0, 30);
  const excerpt = (body.excerpt || '').trim().slice(0, 300);
  const author = (body.author || '').trim().slice(0, 80);
  const slug = `${date}-${slugify(title) || 'post'}`;

  const files: { path: string; content: string; encoding: 'utf-8' | 'base64' }[] = [];
  let imagePath: string | undefined;
  if (body.image?.data) {
    const ext = (body.image.type === 'image/png' ? 'png' : body.image.type === 'image/webp' ? 'webp' : 'jpg');
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
  files.push({ path: `src/content/news/${slug}.md`, content: `${front}\n\n${markdown}\n`, encoding: 'utf-8' });

  try {
    // One commit with all files, via the Git Data API
    const ref = await gh(`/repos/${repo}/git/ref/heads/${branch}`, token);
    const baseSha: string = ref.object.sha;
    const baseCommit = await gh(`/repos/${repo}/git/commits/${baseSha}`, token);
    const tree = await Promise.all(files.map(async (f) => {
      const blob = await gh(`/repos/${repo}/git/blobs`, token, { method: 'POST', body: JSON.stringify({ content: f.content, encoding: f.encoding }) });
      return { path: f.path, mode: '100644', type: 'blob', sha: blob.sha };
    }));
    const newTree = await gh(`/repos/${repo}/git/trees`, token, { method: 'POST', body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }) });
    const commit = await gh(`/repos/${repo}/git/commits`, token, {
      method: 'POST',
      body: JSON.stringify({ message: `news: ${title}${author ? ` (by ${author})` : ''}`, tree: newTree.sha, parents: [baseSha] }),
    });
    await gh(`/repos/${repo}/git/refs/heads/${branch}`, token, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
    return json({ ok: true, slug, url: `/news/${slug}`, commit: commit.sha });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message || 'Publish failed' }, 502);
  }
};
