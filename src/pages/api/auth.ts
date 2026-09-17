import type { APIRoute } from 'astro';
import { config, json, passwordMatches, issueToken } from '../../lib/admin';

/** POST { password } -> { token } (12-hour session for the /admin page). */
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const cfg = config();
  if (!cfg.ok) return json({ error: 'Publishing is not configured yet. Set ADMIN_PASSWORD, GITHUB_TOKEN and GITHUB_REPO in Vercel.' }, 500);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
  if (!passwordMatches(body?.password || '', cfg.password)) {
    await new Promise((r) => setTimeout(r, 1500)); // slow down guessing
    return json({ error: 'Wrong password' }, 401);
  }
  return json({ token: issueToken(cfg.password) });
};
