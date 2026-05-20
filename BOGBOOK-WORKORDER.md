# Bogbook workorder

Forking the single-site repo into a two-site repo so `evbogue.com` (Ev's personal writing) and `bogbook.com` (a Gawker/NYMag-style media news blog, ad-supported, every post under Ev's byline) run out of the same Deno process.

## Mission

Bogbook exists to bring Gawker back from the dead and put it back where it belongs: as a thorn in Silicon Valley's side. The beat is the tech industry's self-mythology, its founders, its capital, its press capture, and its quiet conviction that nobody is allowed to laugh at it. Media and NYC scene coverage are secondary. Anything that helps locate, name, and puncture power in the Valley is on-brief.

## Decisions locked in

- **Layout**: `sites/<host>/` for both. evbogue's existing content moves into `sites/evbogue.com/`. bogbook lives in `sites/bogbook.com/`. Symmetrical, no implicit-default site.
- **Agents**: shared `Agents/` directory. Roles are mostly site-agnostic; the writer agent is the main fork (`Agents/WRITER.md` for evbogue, `Agents/GAWKER-WRITER.md` for bogbook). `AGENTS.md` gets a section noting which agents serve which site.
- **Process**: one Deno process, one port, dispatch on `Host` header.
- **Code direction**: per `CLAUDE.md` / `AGENTS.md`, prefer the clean current model over backward-compat shims. We move files; we don't dual-mount old and new paths.

## Architecture

### Site dispatch

A `SITES` registry loaded once at boot from `sites/*/site.json`. Every request resolves to a site object via:

```js
function getSite(c) {
  const host = (c.req.header('host') || '').split(':')[0].toLowerCase()
  const override = Deno.env.get("BOGBOOK_DEV_SITE_OVERRIDE") === "1"
    ? new URL(c.req.url).searchParams.get('site')
    : null
  const id = override || (SITE_BY_HOST[host] ?? 'evbogue.com')
  return SITES[id]
}
```

Routes that currently hardcode `posts/`, `drafts/`, `about.md`, `assets/` and the evbogue copy in `signalPage()` get parameterized on the site object. The `?site=` override is local-dev only and must be gated by env so production cannot render the wrong site under the wrong host.

### `site.json` shape

```json
{
  "id": "bogbook.com",
  "hosts": ["bogbook.com", "www.bogbook.com", "bogbook.localhost"],
  "title": "Bogbook",
  "tagline": "Chicago against the Valley.",
  "description": "...",
  "baseUrl": "https://bogbook.com",
  "cssFile": "assets/bogbook.css",
  "emailFrom": "Bogbook <hello@bogbook.com>",
  "emailReplyTo": "hello@bogbook.com",
  "emailSignature": "Bogbook",
  "subscribersFile": "subscribers.json",
  "analyticsNamespace": "bogbook"
}
```

`postsDir`, `draftsDir`, `assetsDir`, `aboutFile` are all derived from the site's root (`sites/<id>/`) — no need to repeat them in JSON.

### Page chrome

`signalPage()` becomes `sitePage(site, { title, description, body })`. Default title is `site.title`. Site-specific bits (header link text, footer, subscribe widget copy) read from `site` or from `sites/<id>/chrome.html` partials if they get long.

### What's shared vs per-site

Shared (`lib/`):
- Markdown rendering
- Post loading / sorting / tag indexing
- Subscribe / unsubscribe / confirm flow (parameterized on `site.subscribersFile` and `site.baseUrl`)
- Click-tracking `/c/...` redirect (namespaced by `site.analyticsNamespace`)
- RSS feed generation (parameterized on `site.baseUrl`)

Per-site:
- `posts/`, `drafts/`, `about.md`
- `assets/` (each site gets its own CSS; fonts can stay shared if we want)
- `subscribers.json`
- Email identity in `send-post.js`, `lib/mailer.js`, and reconfirmation flows
- Analytics file (`analytics/<site>.jsonl`)

Analytics are flat files under the repo-level `analytics/` directory: `analytics/evbogue.jsonl`, `analytics/bogbook.jsonl`, and `analytics/reports/<site>/YYYY-Www.md` for generated reports. This keeps ad-hoc grep and reporting simple while keeping site data separate. `analytics/views.jsonl` becomes the evbogue legacy import/source file during Phase 1 and should either be renamed to `analytics/evbogue.jsonl` on the VPS or read as a fallback until the rename is confirmed.

## Restructure plan

### Phase 1 — Move evbogue into `sites/evbogue.com/` (no behavior change)

1. `git mv posts sites/evbogue.com/posts`
2. `git mv drafts sites/evbogue.com/drafts`
3. `git mv about.md sites/evbogue.com/about.md`
4. `git mv assets sites/evbogue.com/assets`
5. `mv subscribers.json sites/evbogue.com/subscribers.json` (gitignored, do on server too)
6. Create `sites/evbogue.com/site.json`
7. Update `serve.js`:
   - Load `SITES` registry at boot
   - `getSite(c)` helper
   - Replace every `posts/` / `drafts/` / `about.md` / `assets/` path with `site.*`
   - Rename `signalPage` → `sitePage(site, ...)`, drop the hardcoded title
8. Update subscriber URL helpers so confirm/unsubscribe URLs use `site.baseUrl`, not hardcoded `https://evbogue.com`
9. Update `lib/mailer.js` so confirmation, reconfirmation, admin notification, and weekly report emails use site identity and site URLs
10. Update `send-post.js` to take a `--site` flag (default `evbogue.com`), read subscribers from `sites/<site>/subscribers.json`, use site email identity, and record sends to the site's analytics file
11. Update `reconfirm.js` to take the same `--site` flag and site-aware confirm/unsubscribe links
12. Update `scripts/weekly_report.js` to take `--site`, read `analytics/<site>.jsonl`, and write reports to `analytics/reports/<site>/`
13. Update `CLAUDE.md`, `AGENTS.md`, and `README.md` paths
14. `deno task start` locally, hit `http://localhost:8000/` and confirm evbogue still works end-to-end (homepage, single post, /about, /tag/X, /feed.xml, subscribe, confirm, unsubscribe, click-tracking, analytics, weekly report dry run)
15. Deploy. Pull on VPS, move `subscribers.json` and `analytics/views.jsonl` into the new locations, restart tmux session, smoke-test live.

At end of Phase 1: site behaves identically, code is multi-site-ready, no bogbook yet.

### Phase 2 — Stand up bogbook skeleton

1. `mkdir -p sites/bogbook.com/{posts,drafts,assets}`
2. Write `sites/bogbook.com/site.json`
3. Write `sites/bogbook.com/assets/bogbook.css` (forked from `signal.css`, but Bogbook should have its own visual identity — see Designer agent task below)
4. ~~Write `sites/bogbook.com/about.md`~~ **Draft done** — masthead with editor bio, beat description, pitching, advertising, contact. Several `[TODO]` brackets for Ev to fill in (NYMag/Gawker years and titles, secure-tips contact method, ads inbox, ad-conflict window).
5. Add `SITE_BY_HOST` entries for `bogbook.com`, `www.bogbook.com`, `bogbook.localhost`
6. Add launch-safe `noindex` for bogbook until Phase 5, either via `site.json` or a simple page-meta flag
7. Local test: `curl -H 'Host: bogbook.com' http://localhost:8000/` should render the bogbook skeleton with no posts yet
8. Deploy

### Phase 3 — DNS and reverse proxy

1. Point `bogbook.com` (and `www.bogbook.com`) at the VPS
2. Update the front-end proxy on the VPS (whatever is in front of Deno — Caddy/nginx/Cloudflare tunnel) to terminate TLS for `bogbook.com` and forward to the Deno port, preserving the `Host` header
3. Verify cert issuance, then `curl -I https://bogbook.com`

### Phase 4 — Editorial & business setup

1. ~~Write `Agents/GAWKER-WRITER.md`~~ **Done** — file exists, voice abstracted into five anonymous style registers (scene reporter, business mechanics, implicated confessional, camp eulogy, strategist's autopsy), wired into `CLAUDE.md` and `AGENTS.md` routing tables.
2. Update `Agents/EDITOR.md` to note it serves both sites, with headline rules per voice
3. New `Agents/AD-OPS.md` for ad inventory, sponsor relationships, rate sheet (bogbook only)
4. Update `AGENTS.md` with a "Which site does this agent serve" table
5. Decide first 3–5 launch stories for bogbook (the WRITER pitches via GAWKER-WRITER)
6. Decide ad model: direct-sold sponsorship slots, programmatic, or both. Programmatic on a brand-new site with no traffic is dead money — start direct-sold and switch if it scales.

### Phase 5 — Launch

1. Publish 3 inaugural bogbook pieces before announcing
2. Announce via evbogue.com (one post linking over) and Ev's social
3. Subscribe form on bogbook live from day one — start the list immediately
4. Remove the temporary `noindex` once DNS, HTTPS, feed, and subscribe are all verified

## File-by-file change list (Phase 1)

| File | Change |
|---|---|
| `serve.js` | Add `SITES` registry + `getSite()`; replace hardcoded paths; rename `signalPage` → `sitePage` |
| `send-post.js` | Accept `--site` flag; read subscribers from site dir; use site email identity |
| `reconfirm.js` | Accept `--site` flag; use site subscriber file, sender identity, confirm URL, and unsubscribe URL |
| `scripts/weekly_report.js` | Accept `--site`; read `analytics/<site>.jsonl`; write `analytics/reports/<site>/YYYY-Www.md`; email with site identity |
| `lib/posts.js` | Accept a site root instead of assuming repo root contains `posts/` |
| `lib/subscribers.js` | Accept a site root and site-aware URL helpers; remove hardcoded evbogue URLs |
| `lib/mailer.js` | Parameterize confirmation, reconfirmation, admin notifications, and weekly reports on site identity |
| `lib/analytics.js` | Replace hardcoded `analytics/views.jsonl` with `analytics/<site>.jsonl`, keeping a short evbogue fallback if needed for VPS migration |
| `posts/` | `git mv` → `sites/evbogue.com/posts/` |
| `drafts/` | `git mv` → `sites/evbogue.com/drafts/` |
| `about.md` | `git mv` → `sites/evbogue.com/about.md` |
| `assets/` | `git mv` → `sites/evbogue.com/assets/` |
| `subscribers.json` | Move on disk to `sites/evbogue.com/subscribers.json` (gitignored, do on both local and VPS) |
| `analytics/` | Rename `views.jsonl` → `evbogue.jsonl` on the VPS; future bogbook data goes to `bogbook.jsonl` |
| `deno.json` | No change expected |
| `README.md`, `CLAUDE.md`, `AGENTS.md` | Update paths and add multi-site notes |

## Open questions to resolve before Phase 1

1. **Reverse proxy**: which proxy is in front of Deno on the VPS today? (Caddy is the easiest to add a second site to; if it's something else, the cert/host config differs.) Need to confirm before Phase 3 to avoid surprises.
2. **Subscriber double-opt-in domain**: confirm emails sent for bogbook subscriptions go from a `@bogbook.com` address with bogbook unsubscribe links — needs the SMTP sender domain configured in the email provider before Phase 2 ships subscribe forms.
3. **Bogbook ownership/legal**: is bogbook a separate LLC, a DBA, or just a brand under Ev personally? Matters for advertising contracts and the masthead. Doesn't block code.
4. **Editorial budget**: how many writers, paid how (per-post / retainer / equity), and out of what runway? Doesn't block Phase 1 either, but PM agent should have a number to plan against before Phase 5.

## Out of scope for this workorder

- Hiring the writers
- Ad sales pipeline beyond ad surface, rate-card, and sponsor-slot planning
- Tax/legal structure
- Bogbook visual design (separate Designer task once `assets/bogbook.css` exists)
