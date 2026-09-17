#!/usr/bin/env node
/**
 * Builds HTML fixtures in mcla.us's markup from a captured snapshot, runs the
 * sync against them (MCLA_FIXTURE_DIR), and checks the output. Also used once
 * to seed src/data/mcla before the first real sync ran. `npm test`.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'scripts/.fixtures');
const cap = JSON.parse(await readFile(path.join(ROOT, 'scripts/_captured-2026.json'), 'utf8'));
const img = (s) => !s ? '/assets/icons/user-8f36142c.svg' : s.startsWith('T:') ? 'https://mcla.fly.storage.tigris.dev/' + s.slice(2) : s.startsWith('D:') ? 'https://mcla-assets.nyc3.digitaloceanspaces.com/' + s.slice(2) : s;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const recordTable = `<table class="uk-table uk-table-small uk-table-middle"><tbody><tr class="main-header"><th>Overall</th><th>Percent</th><th>Division</th><th>Percent</th><th>Streak</th><th>Home</th><th>Away</th></tr><tr>${cap.record.map((c) => `<td class="uk-text-center">${c}</td>`).join('')}</tr></tbody></table>`;

const schedule = `<html><body><h2>Michigan State</h2><h1>Schedule</h1>${recordTable}<div class="page-card"><div class="uk-card-body">${cap.games.map(([date, name, oppHref, logo, time, venue, type, outcome, score, cta]) => {
  const [dow, mon, day] = date.split(' ');
  const away = name.startsWith('@');
  const bare = name.replace(/^@\s*/, '');
  const prefixMatch = bare.match(/^(#\d+|\d+[A-Z]?)\s+/);
  const prefix = prefixMatch ? prefixMatch[1] + ' ' : '';
  const oppName = bare.slice(prefix.length);
  return `<div class="game-opponent-tile uk-box-shadow-small"><div class="game-opponent-tile__date"><p>${dow}</p><p>${mon}</p><p>${day}</p></div><div class="game-opponent-tile__opponent"><div class="uk-flex uk-flex-middle"><div class="opponent__logo uk-width-auto uk-margin-right"><img class="uk-width-1-1" src="${logo}"></div><div class="opponent__info uk-width-expand"><p class="opponent__name"> ${away ? '@ ' : ''}${prefix}<a href="${oppHref}">${esc(oppName)}</a></p><div class="game-opponent-tile__meta uk-flex"><p class="game-opponent-tile__time"><span data-uk-icon="clock"></span> ${time} </p><p class="game-opponent-tile__venue"><span data-uk-icon="location"></span><a href="/venues/x">${esc(venue)}</a></p></div></div></div></div><div class="game-opponent-tile__result"><div class="game-opponent-tile__type">${type}</div>${outcome ? `<p class="game-opponent-tile__score"><span class="outcome">${outcome}</span><span class="score">${score}</span></p>` : ''}<a class="game-opponent-tile__score-cta uk-button uk-button-default" href="${cta}">Stats</a></div></div>`;
}).join('')}</div></div></body></html>`;

const roster = `<html><body><h2>Michigan State</h2><h1>Roster</h1><div class="page-card"><div class="uk-card-body"><img class="uk-border-rounded" src="${cap.teamPhoto}">${cap.players.map(([num, name, href, photo, ...rest]) => {
  const hometown = rest.length && !/^(Fr|So|Jr|Sr|\d(st|nd|rd|th)|\d+'.*|\d+ lbs)$/.test(rest[rest.length - 1]) ? rest.pop() : '';
  return `<div class="player-tile uk-flex"><div class="player-tile__headshot"><div class="player-tile__headshot_wrap"><a href="${href}"><img class="uk-width-1-1" src="${img(photo)}"></a></div></div><div class="player-tile__info uk-width-expand"><div class="player-tile__name uk-width-1-1"> ${num} <a href="${href}">${esc(name)}</a></div><div class="player-tile__details"><div class="player-tile__meta uk-flex uk-flex-nowrap">${rest.map((m) => `<p>${esc(m)}</p>`).join('')}</div><div class="player-tile__location uk-flex uk-text-right"><span data-uk-icon="location"></span> ${esc(hometown)} </div></div></div></div>`;
}).join('')}</div></div></body></html>`;

const coaches = `<html><body><div class="page-card"><div class="uk-card-body">${cap.coaches.map(([name, href, photo, title, loc]) => `<div class="coach-tile uk-flex"><div class="coach-tile__headshot"><div class="coach-tile__headshot_wrap"><a href="${href}"><img class="uk-width-1-1" src="${img(photo)}"></a></div></div><div class="coach-tile__info"><div class="coach-tile__name uk-width-1-1"><a href="${href}"> ${esc(name)} </a></div><div class="coach-tile__details"><div class="coach-tile__meta uk-flex uk-flex-nowrap"><p>${esc(title)}</p></div><div class="coach-tile__location uk-flex uk-text-right"><span data-uk-icon="location"></span> ${esc(loc)} </div></div></div></div>`).join('')}</div></div></body></html>`;

const statsTable = (h, rows) => `<table class="game-stats__table stats-table uk-table"><thead><tr>${h.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => Array.isArray(c) ? `<td><span class="position">${c[0]}</span> <a data-turbo-frame="_top" href="/players/${c[1].toLowerCase().replace(/\s+/g, '-')}-abc123">${esc(c[1])}</a></td>` : `<td class="center uk-text-nowrap">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const stats = `<html><body><h1>2026 Season Stats</h1>${recordTable}<h3>Team Stats</h3>${cap.stats.team.map((t) => statsTable(t.h, [t.v])).join('')}<h3>Player Stats</h3>${cap.stats.pl.map((t) => statsTable(t.h, t.rows)).join('')}</body></html>`;

await mkdir(FIX, { recursive: true });
await writeFile(path.join(FIX, 'schedule.html'), schedule);
await writeFile(path.join(FIX, 'roster.html'), roster);
await writeFile(path.join(FIX, 'coaches.html'), coaches);
await writeFile(path.join(FIX, 'stats.html'), stats);

const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts/sync-mcla.mjs')], {
  env: { ...process.env, MCLA_FIXTURE_DIR: FIX, MCLA_SEASON: cap.season }, stdio: 'inherit',
});
assert.equal(run.status, 0, 'sync exited non-zero');

const read = async (f) => JSON.parse(await readFile(path.join(ROOT, 'src/data/mcla', f), 'utf8'));
const meta = await read('meta.json');
const sched = await read('schedule.json');
const ros = await read('roster.json');
const coach = await read('coaches.json');
const st = await read('stats.json');

assert.equal(meta.season, '2026');
assert.deepEqual(meta.record.overall, { wins: 10, losses: 5 });
assert.equal(sched.length, 15);
assert.equal(sched[0].opponent, 'James Madison');
assert.equal(sched[0].home, false);
assert.equal(sched[0].date, '2026-02-14');
assert.deepEqual(sched[0].result, { outcome: 'W', us: 11, them: 8 });
assert.equal(sched[2].home, true);
assert.equal(sched[3].opponentRank, 18);
assert.equal(sched[3].opponent, 'Chapman');
assert.equal(sched[12].seed, '2W');
assert.equal(sched[12].opponent, 'Purdue');
assert.equal(sched[12].type, 'Playoff');
assert.equal(sched[14].tz, 'EDT');
assert.equal(sched[14].time, '10am');
assert.equal(ros.length, 40);
const ruma = ros.find((p) => p.slug === 'lorenzo-ruma-ec6e68');
assert.equal(ruma.number, 6);
assert.equal(ruma.position, 'FOS');
assert.equal(ruma.height, null);
const adamski = ros.find((p) => p.number === 23);
assert.equal(adamski.height, `5' 9"`);
assert.equal(adamski.hometown, 'Macomb, MI');
const pressman = ros.find((p) => p.number === 49);
assert.equal(pressman.weight, '225 lbs');
assert.equal(pressman.hometown, 'Kenilworth, IL');
assert.equal(pressman.height, null);
assert.equal(coach.length, 3);
assert.equal(coach[0].title, 'Head Coach');
assert.equal(coach[1].headshot, null);
assert.equal(st.field.length, 37);
assert.equal(st.goalies.length, 3);
assert.equal(st.team.field.g, 149);
assert.equal(st.goalies[0].savePct, 58.4);
assert.equal(st.field.find((p) => p.number === 22).g, 36);
console.log('\nall sync checks passed');
