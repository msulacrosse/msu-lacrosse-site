import meta from '../data/mcla/meta.json';
import schedule from '../data/mcla/schedule.json';
import roster from '../data/mcla/roster.json';
import coaches from '../data/mcla/coaches.json';
import stats from '../data/mcla/stats.json';

export type Game = (typeof schedule)[number];
export type Player = (typeof roster)[number];
export type Coach = (typeof coaches)[number];
export type FieldStat = (typeof stats.field)[number];
export type GoalieStat = (typeof stats.goalies)[number];

export { meta, schedule, roster, coaches, stats };

const TZ_MAP: Record<string, string> = {
  EST: 'America/New_York', EDT: 'America/New_York',
  CST: 'America/Chicago', CDT: 'America/Chicago',
  MST: 'America/Denver', MDT: 'America/Denver',
  PST: 'America/Los_Angeles', PDT: 'America/Los_Angeles',
};
export const ianaTz = (tz: string | null) => (tz && TZ_MAP[tz.toUpperCase()]) || 'America/New_York';

/** "2026-02-14" -> Date at local midnight (avoid UTC shift) */
export const parseDate = (iso: string | null) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const fmt = (d: Date | null, opts: Intl.DateTimeFormatOptions) =>
  d ? new Intl.DateTimeFormat('en-US', opts).format(d) : 'TBA';

export const shortDate = (g: Game) => fmt(parseDate(g.date), { month: 'short', day: 'numeric' });
export const longDate = (g: Game) => fmt(parseDate(g.date), { weekday: 'short', month: 'short', day: 'numeric' });
export const fullDate = (g: Game) => fmt(parseDate(g.date), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
export const gameTime = (g: Game) => (g.time ? g.time.toUpperCase().replace(/(AM|PM)/, ' $1') + (g.tz ? ` ${g.tz}` : '') : 'Time TBA');

export const prefix = (g: Game) => (g.home ? 'vs' : 'at');
export const opponentLabel = (g: Game) =>
  `${g.opponentRank ? `#${g.opponentRank} ` : ''}${g.opponent}`;
export const resultLabel = (g: Game) => (g.result ? `${g.result.outcome} ${g.result.us}–${g.result.them}` : null);
export const locationLabel = (g: Game) => [g.venue, g.type].filter(Boolean).join(' · ');

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const sortedSchedule = [...schedule].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
export const upcomingGames = () => sortedSchedule.filter((g) => !g.result && (!g.date || g.date >= todayIso()));
export const playedGames = () => sortedSchedule.filter((g) => g.result);
export const lastResults = (n = 3) => playedGames().slice(-n).reverse();

export const recordSummary = () => {
  const played = playedGames();
  const wins = played.filter((g) => g.result?.outcome === 'W').length;
  const losses = played.filter((g) => g.result?.outcome === 'L').length;
  const remaining = schedule.length - played.length;
  // Prefer MCLA's official record when present (it can include forfeits etc.)
  const official = meta.record?.overall;
  return { wins: official?.wins ?? wins, losses: official?.losses ?? losses, remaining };
};

export const playerBySlug = (slug: string) => roster.find((p) => p.slug === slug);
export const statsForPlayer = (p: Player) =>
  stats.field.find((s) => s.number === p.number || s.slug === p.slug) ||
  stats.goalies.find((s) => s.number === p.number || s.slug === p.slug) ||
  null;

/** Players to feature on the home page: top scorers with headshots, then fill. */
export const featuredPlayers = (n = 5, pick: number[] = []) => {
  if (pick.length) {
    const chosen = pick.map((num) => roster.find((r) => r.number === num)).filter((p): p is Player => !!p);
    if (chosen.length) return chosen.slice(0, n);
  }
  const byPts = [...stats.field].sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0));
  const picked: Player[] = [];
  for (const s of byPts) {
    const p = roster.find((r) => r.number === s.number && r.headshot);
    if (p && !picked.includes(p)) picked.push(p);
    if (picked.length === n) break;
  }
  for (const p of roster) {
    if (picked.length === n) break;
    if (p.headshot && !picked.includes(p)) picked.push(p);
  }
  return picked;
};

export const yearLabel = (y: string | null) => ({ Fr: 'Freshman', So: 'Sophomore', Jr: 'Junior', Sr: 'Senior', Gr: 'Graduate' } as Record<string, string>)[y || ''] || y || '';
export const positionLabel = (pos: string | null) =>
  ({ FOS: 'Faceoff', SSDM: 'Short-stick D-Mid', LSM: 'Long-stick Mid' } as Record<string, string>)[pos || ''] || pos || '';
