#!/usr/bin/env node
/**
 * MCLA sync
 * ---------
 * Pulls the Michigan State schedule, record, roster, coaches and stats from
 * mcla.us and writes them as JSON into src/data/mcla/. Headshots and opponent
 * logos are downloaded into public/mcla/ so the site never hotlinks MCLA.
 *
 * Runs daily via .github/workflows/sync-mcla.yml, or by hand: `npm run sync`.
 *
 * Fail-safe rules:
 *  - If a page can't be fetched or parses to nothing, the existing JSON for
 *    that page is left untouched (the site keeps showing the last good data).
 *  - The current season is detected from where mcla.us/teams/<slug> redirects,
 *    so when the 2027 season is published the site follows it automatically.
 *
 * Env:
 *  MCLA_TEAM_SLUG   default "michigan-state"
 *  MCLA_FIXTURE_DIR read HTML from files instead of the network (tests)
 */
import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'src/data/mcla');
const IMG_DIR = path.join(ROOT, 'public/mcla');
const BASE = 'https://mcla.us';
const TEAM_SLUG = process.env.MCLA_TEAM_SLUG || 'michigan-state';
const FIXTURE_DIR = process.env.MCLA_FIXTURE_DIR || null;
const UA = 'MSU-Lacrosse-Website/1.0 (+team site; daily sync)';

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
const slugify = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const isPlaceholderImg = (src) => !src || src.includes('/assets/icons/');
const absUrl = (src) => (src && src.startsWith('/') ? BASE + src : src);

// ---------------------------------------------------------------- fetching
async function fetchHtml(url) {
  if (FIXTURE_DIR) {
    const name = url.replace(BASE, '').replace(/^\/teams\/[^/]+\/\d{4}\//, '').replace(/\W+/g, '_') + '.html';
    return { html: await readFile(path.join(FIXTURE_DIR, name), 'utf8'), finalUrl: url };
  }
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return { html: await res.text(), finalUrl: res.url };
}

/** Where does /teams/<slug> land? That's the current season. */
async function detectSeason() {
  if (FIXTURE_DIR) return process.env.MCLA_SEASON || String(new Date().getFullYear());
  const { finalUrl } = await fetchHtml(`${BASE}/teams/${TEAM_SLUG}`);
  const m = finalUrl.match(/\/teams\/[^/]+\/(\d{4})/);
  if (!m) throw new Error(`Could not detect season from redirect: ${finalUrl}`);
  return m[1];
}

// ---------------------------------------------------------------- parsers
export function parseRecord($) {
  const row = $('table').first().find('tr').eq(1).find('td');
  if (row.length < 5) return null;
  const cells = row.map((_, td) => clean($(td).text())).get();
  const split = (s) => {
    const m = s.match(/(\d+)\s*-\s*(\d+)/);
    return m ? { wins: +m[1], losses: +m[2] } : null;
  };
  const overall = split(cells[0]);
  if (!overall) return null;
  return {
    overall, pct: cells[1] || null,
    division: split(cells[2]), divisionPct: cells[3] || null,
    streak: cells[4] || null, home: split(cells[5]), away: split(cells[6]),
  };
}

export function parseSchedule($, season) {
  const games = [];
  $('.game-opponent-tile').each((_, el) => {
    const t = $(el);
    const dateParts = t.find('.game-opponent-tile__date p').map((_, p) => clean($(p).text())).get();
    const [dow, mon, day] = dateParts;
    const month = MONTHS[(mon || '').slice(0, 3).toLowerCase()];
    const date = month && day ? `${season}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;

    const nameEl = t.find('.opponent__name');
    const rawName = clean(nameEl.text());
    const oppLink = nameEl.find('a');
    const opponent = clean(oppLink.text()) || rawName.replace(/^@\s*/, '');
    const away = rawName.startsWith('@');
    // Prefix before the link: "#18", "2W" (seed), "1" (seed on tournament rows)
    const prefix = clean(rawName.replace(/^@\s*/, '').replace(opponent, ''));
    const rankMatch = prefix.match(/#(\d+)/);
    const seedMatch = !rankMatch && prefix.match(/^(\d+)[A-Z]?$/);

    const timeRaw = clean(t.find('.game-opponent-tile__time').text());
    const timeMatch = timeRaw.match(/(\d{1,2}(?::\d{2})?\s*[ap]m)\s*([A-Z]{2,4})?/i);
    const venue = clean(t.find('.game-opponent-tile__venue').text());
    const type = clean(t.find('.game-opponent-tile__type').text()) || null;
    const outcome = clean(t.find('.outcome').text()).toUpperCase() || null;
    const score = clean(t.find('.score').text());
    const sm = score.match(/(\d+)\s*-\s*(\d+)/);
    const logo = t.find('.opponent__logo img').attr('src') || null;
    const statsHref = t.find('.game-opponent-tile__score-cta').attr('href') || null;
    const oppHref = oppLink.attr('href') || null;
    const oppSlug = oppHref ? oppHref.split('/')[2] : slugify(opponent);

    games.push({
      id: statsHref ? statsHref.split('/').pop() : `${date}-${oppSlug}`,
      date, dayOfWeek: dow || null,
      time: timeMatch ? timeMatch[1].toLowerCase().replace(/\s+/, '') : (timeRaw || null),
      tz: timeMatch && timeMatch[2] ? timeMatch[2].toUpperCase() : null,
      home: !away,
      opponent, opponentSlug: oppSlug,
      opponentRank: rankMatch ? +rankMatch[1] : null,
      seed: seedMatch ? prefix : null,
      opponentLogo: absUrl(logo),
      opponentUrl: oppHref ? BASE + oppHref : null,
      venue: venue || null,
      type,
      result: outcome && sm ? { outcome, us: +sm[1], them: +sm[2] } : null,
      statsUrl: statsHref ? BASE + statsHref : null,
    });
  });
  return games;
}

export function parseRoster($) {
  const players = [];
  $('.player-tile').each((_, el) => {
    const t = $(el);
    const link = t.find('.player-tile__name a');
    const name = clean(link.text());
    if (!name) return;
    const number = clean(t.find('.player-tile__name').text().replace(name, ''));
    const meta = t.find('.player-tile__meta p').map((_, p) => clean($(p).text())).get();
    // Meta is [position, class, eligibility, height?, weight?] — the last two are optional
    const height = meta.find((m) => /\d+'\s*\d+"?/.test(m)) || null;
    const weight = meta.find((m) => /lbs/i.test(m)) || null;
    const rest = meta.filter((m) => m !== height && m !== weight);
    const href = link.attr('href') || '';
    const img = t.find('.player-tile__headshot img').attr('src');
    players.push({
      number: /^\d+$/.test(number) ? +number : number || null,
      name,
      slug: href ? href.split('/').pop() : slugify(name),
      url: href ? BASE + href : null,
      headshot: isPlaceholderImg(img) ? null : absUrl(img),
      position: rest[0] || null,
      year: rest[1] || null,          // Fr / So / Jr / Sr
      eligibility: rest[2] || null,   // 1st / 2nd / 3rd / 4th
      height, weight,
      hometown: clean(t.find('.player-tile__location').text()) || null,
    });
  });
  return players;
}

export function parseCoaches($) {
  const coaches = [];
  $('.coach-tile').each((_, el) => {
    const t = $(el);
    const link = t.find('.coach-tile__name a');
    const name = clean(link.text());
    if (!name) return;
    const href = link.attr('href') || '';
    const img = t.find('.coach-tile__headshot img').attr('src');
    coaches.push({
      name,
      slug: href ? href.split('/').pop() : slugify(name),
      url: href ? BASE + href : null,
      headshot: isPlaceholderImg(img) ? null : absUrl(img),
      title: t.find('.coach-tile__meta p').map((_, p) => clean($(p).text())).get().join(', ') || null,
      hometown: clean(t.find('.coach-tile__location').text()) || null,
    });
  });
  return coaches;
}

const STAT_KEYS = { '#': 'number', Player: 'player', EL: 'eligibility', GP: 'gp', G: 'g', A: 'a', Po: 'pts', SH: 'sh', GB: 'gb', Pn: 'pn', CTO: 'cto', 'FO-W': 'fow', 'FO-L': 'fol', GA: 'ga', S: 'saves', 'S%': 'savePct', Field: 'label', Goalies: 'label' };
const num = (s) => { const n = parseFloat(String(s).replace('%', '')); return Number.isFinite(n) ? n : null; };

export function parseStats($) {
  const tables = $('table.stats-table');
  if (!tables.length) return null;
  const out = { team: { field: null, goalie: null }, field: [], goalies: [] };
  tables.each((_, tb) => {
    const headers = $(tb).find('th').map((_, th) => clean($(th).text())).get();
    const keys = headers.map((h) => STAT_KEYS[h] || slugify(h));
    const rows = $(tb).find('tbody tr').map((_, tr) => {
      const row = {};
      $(tr).find('td').each((i, td) => {
        const key = keys[i];
        if (key === 'player') {
          row.position = clean($(td).find('.position').text()) || null;
          row.name = clean($(td).find('a').text()) || clean($(td).text());
          const href = $(td).find('a').attr('href');
          row.slug = href ? href.split('/').pop() : slugify(row.name);
        } else if (key === 'label') {
          // empty label cell on team totals
        } else if (key === 'number') {
          row.number = num($(td).text());
        } else {
          row[key] = num($(td).text());
        }
      });
      return row;
    }).get();
    const isTeam = headers[0] === 'Field' || headers[0] === 'Goalies';
    const isGoalie = headers.includes('GA');
    if (isTeam) out.team[isGoalie ? 'goalie' : 'field'] = rows[0] || null;
    else if (isGoalie) out.goalies = rows;
    else out.field = rows;
  });
  return out;
}

// ---------------------------------------------------------------- images
async function downloadImage(url, dir, baseName) {
  if (!url || FIXTURE_DIR) return url; // keep remote URL in tests
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (!res.ok) throw new Error(res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get('content-type') || '';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('svg') ? 'svg' : type.includes('gif') ? 'gif' : 'jpg';
    const hash = createHash('sha1').update(url).digest('hex').slice(0, 8);
    const file = `${baseName}-${hash}.${ext}`;
    await mkdir(dir, { recursive: true });
    const full = path.join(dir, file);
    if (!existsSync(full)) await writeFile(full, buf);
    return `/mcla/${path.basename(dir)}/${file}`;
  } catch (e) {
    console.warn(`  image failed (${e.message}): ${url} — keeping remote URL`);
    return url;
  }
}

async function pruneUnused(dir, keep) {
  if (!existsSync(dir)) return;
  for (const f of await readdir(dir)) {
    if (!keep.has(`/mcla/${path.basename(dir)}/${f}`)) await rm(path.join(dir, f));
  }
}

// ---------------------------------------------------------------- main
async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(path.join(DATA_DIR, file), 'utf8')); } catch { return fallback; }
}
async function writeJson(file, data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 2) + '\n');
}

async function main() {
  const season = await detectSeason();
  const teamBase = `${BASE}/teams/${TEAM_SLUG}/${season}`;
  console.log(`MCLA sync — ${TEAM_SLUG}, season ${season}`);
  const previous = await readJson('meta.json', {});
  const keepImages = { players: new Set(), coaches: new Set(), logos: new Set() };
  const problems = [];

  // Schedule + record
  try {
    const { html } = await fetchHtml(`${teamBase}/schedule`);
    const $ = load(html);
    const games = parseSchedule($, season);
    if (!games.length) throw new Error('parsed 0 games');
    for (const g of games) {
      g.opponentLogo = await downloadImage(g.opponentLogo, path.join(IMG_DIR, 'logos'), g.opponentSlug);
      if (g.opponentLogo?.startsWith('/mcla/')) keepImages.logos.add(g.opponentLogo);
    }
    await writeJson('schedule.json', games);
    const record = parseRecord($);
    const teamName = clean($('h2').first().text()) || 'Michigan State';
    await writeJson('meta.json', {
      season, team: { name: teamName, slug: TEAM_SLUG, url: `${teamBase}/schedule` },
      record, syncedAt: new Date().toISOString(),
      previousSeason: previous.season && previous.season !== season ? previous.season : previous.previousSeason || null,
    });
    console.log(`  schedule: ${games.length} games, record ${record ? `${record.overall.wins}-${record.overall.losses}` : 'n/a'}`);
  } catch (e) { problems.push(`schedule: ${e.message}`); }

  // Roster
  try {
    const { html } = await fetchHtml(`${teamBase}/roster`);
    const $ = load(html);
    const players = parseRoster($);
    if (!players.length) throw new Error('parsed 0 players');
    for (const p of players) {
      p.headshot = await downloadImage(p.headshot, path.join(IMG_DIR, 'players'), p.slug);
      if (p.headshot?.startsWith('/mcla/')) keepImages.players.add(p.headshot);
    }
    players.sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
    await writeJson('roster.json', players);
    console.log(`  roster: ${players.length} players`);
  } catch (e) { problems.push(`roster: ${e.message}`); }

  // Coaches
  try {
    const { html } = await fetchHtml(`${teamBase}/coaches`);
    const $ = load(html);
    const coaches = parseCoaches($);
    if (!coaches.length) throw new Error('parsed 0 coaches');
    for (const c of coaches) {
      c.headshot = await downloadImage(c.headshot, path.join(IMG_DIR, 'coaches'), c.slug);
      if (c.headshot?.startsWith('/mcla/')) keepImages.coaches.add(c.headshot);
    }
    await writeJson('coaches.json', coaches);
    console.log(`  coaches: ${coaches.length}`);
  } catch (e) { problems.push(`coaches: ${e.message}`); }

  // Stats
  try {
    const { html } = await fetchHtml(`${teamBase}/stats`);
    const stats = parseStats(load(html));
    if (!stats) throw new Error('no stats tables');
    await writeJson('stats.json', stats);
    console.log(`  stats: ${stats.field.length} field players, ${stats.goalies.length} goalies`);
  } catch (e) { problems.push(`stats: ${e.message}`); }

  // Only prune images if every image-bearing page synced successfully
  if (!problems.length && !FIXTURE_DIR) {
    await pruneUnused(path.join(IMG_DIR, 'players'), keepImages.players);
    await pruneUnused(path.join(IMG_DIR, 'coaches'), keepImages.coaches);
    await pruneUnused(path.join(IMG_DIR, 'logos'), keepImages.logos);
  }

  if (problems.length) {
    console.error('\nSome pages did not sync (existing data kept):\n  ' + problems.join('\n  '));
    // Exit 0 on partial failure so the workflow still commits whatever did update.
    // A total failure (nothing synced) exits 1 so it shows up as a failed run.
    if (problems.length === 4) process.exit(1);
  }
  console.log('done');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
