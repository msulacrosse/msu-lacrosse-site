# MSU Lacrosse website

The team site for Michigan State Men's Lacrosse. Schedule, results, record, roster, coaches and stats pull from [mcla.us](https://mcla.us/teams/michigan-state) automatically every day. News posts are written on a hidden password-protected page. Everything runs on free tiers.

**Pages:** Home · `/schedule` · `/roster` · `/roster/<player>` · `/stats` · `/news` · `/news/<post>` · `/about` · `/admin` (hidden) · `/schedule.ics` (calendar feed)

---

## 1. One-time setup (about 30 minutes)

The point of the setup below is that **nothing is tied to one person**. Whoever runs the site next just gets added to the accounts; nobody has to transfer anything.

### A. Make a team email
Create a Gmail like `msulacrosseweb@gmail.com`. Keep the password with the team's other shared logins (whoever holds the team Instagram login is a good fit). Every account below gets created with this email.

### B. GitHub — where the code lives
1. Sign up at github.com with the team email. (The team account is `msulacrosse`.)
2. Create a new **repository** called `msu-lacrosse-site`. Public is fine (it's a public website) and keeps GitHub Actions free with no limits.
3. Put this folder into it. From a terminal in this folder:
   ```
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/msulacrosse/msu-lacrosse-site.git
   git push -u origin main
   ```
   (Or use GitHub Desktop and "Add existing repository".)
4. Go to the repo's **Actions** tab and enable workflows if it asks. Then open *Sync MCLA data* → *Run workflow*. It should finish in about a minute and make a commit that adds the player headshots and opponent logos.
5. Optionally add your personal GitHub account as a **collaborator** (repo → Settings → Collaborators) so you can push from your own login. The next person gets added the same way, and people who leave get removed.

### C. Vercel — where the site is hosted
1. Sign up at vercel.com with **"Continue with GitHub"** while logged into the team GitHub account. This links them.
2. *Add New → Project* → pick `msu-lacrosse-site`. Vercel detects Astro. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `ADMIN_PASSWORD` | the password people will type on `/admin` |
   | `GITHUB_REPO` | `msulacrosse/msu-lacrosse-site` |
   | `GITHUB_TOKEN` | see below |

   To make `GITHUB_TOKEN`: in the **team** GitHub account go to *Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate*. Repository access: only `msu-lacrosse-site`. Permissions: **Contents → Read and write**. Set the longest expiration it allows and put a reminder in the team calendar to make a new one before it expires (the site keeps working if it expires; only the `/admin` publisher stops until the token is replaced).
3. Click **Deploy**. You'll get a `something.vercel.app` URL. Every push to `main` — including the daily data sync and every news post — redeploys automatically.
4. Later, when you buy a domain: Vercel → Project → *Settings → Domains* → add it, then follow the DNS instructions from wherever you bought it. Also add `SITE_URL=https://yourdomain.com` to the environment variables so share links and the calendar feed use it.

Vercel's free Hobby plan is meant for personal and non-commercial projects. A club team site is a normal use of it. If the team ever wants sponsor-driven revenue on the site, or Vercel changes the rules, the site also deploys unchanged on Cloudflare Pages or Netlify (both free), because nothing here is Vercel-specific except the `/api/publish` function, which those hosts also support.

---

## 2. Day to day

### Posting news
Go to `yoursite.com/admin`. It's not linked from anywhere. Fill in the title, a one-line summary, optionally a photo, write the article, type the password, hit Publish. The site rebuilds and the post is live in a minute or two. Plain text is fine; `**bold**`, `## headings`, `- bullets` and links also work, and there's a Preview tab.

To edit or delete a post afterwards, open the repo on GitHub → `src/content/news/` → the post's `.md` file → pencil icon (or trash). Save = live in a minute.

### Schedule, roster, stats
Nothing to do. GitHub Actions runs `scripts/sync-mcla.mjs` every day at 6am Eastern (and every 4 hours February–May). It follows wherever `mcla.us/teams/michigan-state` redirects, so when MCLA publishes the 2027 season the site switches over on its own. Player headshots and opponent logos are copied into `public/mcla/` so the site doesn't depend on MCLA's image hosting.

If MCLA ever redesigns their pages, the sync will log an error and leave the last good data in place — the site never goes blank. The parser is small (`scripts/sync-mcla.mjs`, one function per page) and `npm test` checks it against a saved copy of the 2026 pages.

### Editing text, FAQ, contact email, photos
All in **`src/data/site.ts`**: the About paragraphs, FAQ questions, contact email, Instagram link, join-the-team text, sponsor logos, and the photo slots on the home page. Drop photos in `public/photos/` and put the paths in that file. Edit on GitHub directly or locally.

Things marked `TODO` in that file need a real value: the contact email and Instagram handle.

### Calendar feed
Share `yoursite.com/schedule.ics` with players and parents. In Google Calendar: *Other calendars → + → From URL*. In iPhone Calendar: *Add Subscription Calendar*. It updates by itself as the schedule changes.

---

## 3. Working on the code locally

```
npm install
npm run dev        # http://localhost:4321
npm run build      # production build
npm run sync       # pull fresh data from mcla.us (needs internet access to mcla.us)
npm test           # check the MCLA parser against saved 2026 pages
```

To test the `/admin` publisher locally, copy `.env.example` to `.env` and fill it in.

Built with [Astro](https://astro.build). No database, no CMS, no monthly bills. Layout: `src/pages/` are the routes, `src/components/` the pieces, `src/styles/global.css` the design tokens (colors, type, buttons, cards), `src/data/mcla/` the synced JSON, `src/content/news/` the posts.

---

## 4. Handing it over

1. Give the new person the team email login — that's the GitHub account, the Vercel account and (if bought with it) the domain, all in one.
2. Give them the `/admin` password.
3. If you added your personal GitHub account as a collaborator, remove it when you're ready. Nothing else changes — the site, sync and publisher all belong to the team account, not to a person.

If the domain was bought with the team email too, that's the whole list.

---

## Costs

Hosting (Vercel Hobby): free · Code + daily sync (GitHub): free · Calendar feed, publisher function: free · Domain: roughly $10–20/year, the only bill.
