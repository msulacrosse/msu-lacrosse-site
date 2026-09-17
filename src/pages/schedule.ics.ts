import type { APIRoute } from 'astro';
import { meta, sortedSchedule, ianaTz, opponentLabel, prefix, resultLabel } from '../lib/mcla';
import { site } from '../data/site';

/**
 * Calendar feed. Anyone can subscribe to /schedule.ics in Google Calendar,
 * Apple Calendar or Outlook and the schedule updates itself as MCLA changes.
 */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const fold = (line: string) => line.match(/.{1,72}/g)?.join('\r\n ') ?? line;
const pad = (n: number) => String(n).padStart(2, '0');

function parseTime(t: string | null): { h: number; m: number } | null {
  const m = t?.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/i);
  if (!m) return null;
  let h = +m[1] % 12;
  if (m[3].toLowerCase() === 'pm') h += 12;
  return { h, m: +(m[2] || 0) };
}

export const GET: APIRoute = () => {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${site.name}//Schedule//EN`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(`${site.name} ${meta.season}`)}`, 'X-WR-TIMEZONE:America/New_York', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
  ];
  for (const g of sortedSchedule) {
    if (!g.date) continue;
    const [y, mo, d] = g.date.split('-').map(Number);
    const time = parseTime(g.time);
    const tz = ianaTz(g.tz);
    const summary = `${site.shortName} ${prefix(g)} ${opponentLabel(g)}${g.result ? ` (${resultLabel(g)})` : ''}`;
    const desc = [g.type, g.statsUrl ? `Box score: ${g.statsUrl}` : null, `Schedule: ${site.mclaTeamUrl}`].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT', `UID:${g.id}@msulacrosse`, `DTSTAMP:${stamp}`);
    if (time) {
      const start = `${y}${pad(mo)}${pad(d)}T${pad(time.h)}${pad(time.m)}00`;
      const endH = time.h + 2;
      const end = `${y}${pad(mo)}${pad(d)}T${pad(Math.min(endH, 23))}${pad(time.m)}00`;
      lines.push(`DTSTART;TZID=${tz}:${start}`, `DTEND;TZID=${tz}:${end}`);
    } else {
      const next = new Date(y, mo - 1, d + 1);
      lines.push(`DTSTART;VALUE=DATE:${y}${pad(mo)}${pad(d)}`, `DTEND;VALUE=DATE:${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`);
    }
    lines.push(`SUMMARY:${esc(summary)}`);
    if (g.venue) lines.push(`LOCATION:${esc(g.venue)}`);
    lines.push(`DESCRIPTION:${esc(desc)}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': 'inline; filename="msu-lacrosse.ics"' },
  });
};
