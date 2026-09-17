/**
 * Shared helpers for the /admin API routes: config, password check, session
 * tokens, and a tiny GitHub client. Runs only in Vercel functions.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const env = (k: string) => process.env[k] ?? (import.meta.env as any)[k] ?? '';
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export function config() {
  const password = env('ADMIN_PASSWORD');
  const token = env('GITHUB_TOKEN');
  const repo = env('GITHUB_REPO');
  const branch = env('GITHUB_BRANCH') || 'main';
  const ok = Boolean(password && token && repo);
  return { password, token, repo, branch, ok };
}

const sha256 = (s: string) => createHash('sha256').update(s).digest();
export const passwordMatches = (given: string, actual: string) =>
  Boolean(given && actual && timingSafeEqual(sha256(given), sha256(actual)));

// Session token: "<expiry>.<hmac>" signed with the admin password. Lives in the
// browser's sessionStorage for 12 hours. No database needed.
const SESSION_HOURS = 12;
const sign = (exp: string, secret: string) => createHmac('sha256', secret).update(exp).digest('base64url');
export function issueToken(secret: string) {
  const exp = String(Date.now() + SESSION_HOURS * 3600_000);
  return `${exp}.${sign(exp, secret)}`;
}
export function tokenValid(token: string | null, secret: string) {
  if (!token || !secret) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = sign(exp, secret);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
export function authed(request: Request) {
  const { password } = config();
  const header = request.headers.get('authorization') || '';
  return tokenValid(header.replace(/^Bearer\s+/i, ''), password);
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
export const yamlStr = (s: string) => JSON.stringify(s);

// ---------------------------------------------------------------- GitHub
export async function gh(path: string, init: RequestInit = {}) {
  const { token } = config();
  const res = await fetch(`${env('GITHUB_API_BASE') || 'https://api.github.com'}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28',
      'content-type': 'application/json', 'user-agent': 'msu-lacrosse-site', ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${data.message || text}`);
  return data;
}

export interface FileChange { path: string; content?: string; encoding?: 'utf-8' | 'base64'; delete?: boolean }

/** One commit that adds/updates/deletes several files. */
export async function commitFiles(message: string, files: FileChange[]) {
  const { repo, branch } = config();
  const ref = await gh(`/repos/${repo}/git/ref/heads/${branch}`);
  const baseSha: string = ref.object.sha;
  const baseCommit = await gh(`/repos/${repo}/git/commits/${baseSha}`);
  const tree = await Promise.all(files.map(async (f) => {
    if (f.delete) return { path: f.path, mode: '100644', type: 'blob', sha: null };
    const blob = await gh(`/repos/${repo}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: f.content, encoding: f.encoding || 'utf-8' }) });
    return { path: f.path, mode: '100644', type: 'blob', sha: blob.sha };
  }));
  const newTree = await gh(`/repos/${repo}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree }) });
  const commit = await gh(`/repos/${repo}/git/commits`, { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [baseSha] }) });
  await gh(`/repos/${repo}/git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
  return commit.sha as string;
}

/** Minimal front-matter parser for our own post files. */
export function parsePost(raw: string) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const data: Record<string, string> = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const key = line.slice(0, i).trim();
      let val = line.slice(i + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) { try { val = JSON.parse(val); } catch {} }
      data[key] = val;
    }
  }
  return { data, body: (m ? m[2] : raw).trim() };
}
