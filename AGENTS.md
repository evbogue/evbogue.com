# AGENTS.md — evbogue.com

Instructions for the next agent working on this project.

## What this is

A minimal multi-site publishing repo for Ev Bogue (ev@evbogue.com). evbogue.com is Ev's personal site; bogbook.com is being planned as a Gawker/NYMag-style media blog. No CMS, no build step, just markdown files and a tiny Deno server.

## Stack

- **Runtime:** Deno 2.x (`brew install deno`)
- **Server:** Hono via `jsr:@hono/hono`
- **Markdown:** `marked` via `https://esm.sh/gh/evbogue/bog5@...`
- **CSS:** `sites/<site>/assets/*.css` served directly by the Deno app
- **Fonts:** Playfair Display, DM Sans, and DM Mono via Google Fonts
- **Deployment:** VPS running this repo, pulled from GitHub

## Run locally

```
deno task start
```

## File structure

```
serve.js          — all routes; `sitePage()` is the page wrapper
lib/sites.js      — site registry + Host-header dispatch
sites/evbogue.com/assets/signal.css — evbogue stylesheet (cache-busted via ?v= query)
sites/evbogue.com/about.md          — bio + contact info (rendered at /about)
sites/evbogue.com/drafts/           — unpublished evbogue drafts
sites/evbogue.com/posts/            — published evbogue posts
sites/evbogue.com/site.json         — evbogue metadata, hosts, email identity
Agents/           — specialized role instructions for writing, editing, ops, archive work, etc.
send-post.js      — emails a post to subscribers via SMTP (run manually after publishing)
sites/evbogue.com/subscribers.json  — email list (gitignored, lives only on server)
test-email.js     — SMTP test script (gitignored)
```

## Routes

| Route | Description |
|---|---|
| `/` | Post index — title, date, excerpt, newest first |
| `/posts/:slug` | Full post rendered from markdown |
| `/about` | Bio + social links + ntfy send widget |
| `/subscribe` | POST endpoint — saves email to the current site's `subscribers.json` |

## Posts

Draft an evbogue markdown file in `sites/evbogue.com/drafts/` with this frontmatter:

```
---
title: "Post title"
slug: post-slug
date: 2026-04-24
tags: [tag1, tag2]
excerpt: "One-liner shown on the homepage index."
---

Body text...
```

Publish by moving the file from `sites/evbogue.com/drafts/` to `sites/evbogue.com/posts/`. Anything in the site's `posts/` directory is public and appears in that site's index and feed. Anything in `drafts/` is private to the repo and ignored by the server. Do not use a `draft` frontmatter field.

## Code direction

Prefer the clean current model over backward-compatibility shims. If preserving old behavior is not required to keep the codebase working, remove the old path and update the docs/agents so the repo has one obvious way to do the thing.

## Commits

Future commits in this repo should be authored as Ev Bogue `<ev@evbogue.com>`. The repo-local Git config should be:

```sh
git config --local user.name "Ev Bogue"
git config --local user.email "ev@evbogue.com"
```

## Agent roles

Specialized role files now live in `Agents/`. Use them when the task is narrower than "work on the whole repo."

| Role | File | Use for |
|---|---|---|
| Writer | `Agents/WRITER.md` | Turning rough notes into publishable drafts (evbogue.com) |
| Gawker Writer | `Agents/GAWKER-WRITER.md` | News and media reporting for bogbook.com — see `BOGBOOK-WORKORDER.md` |
| Editor | `Agents/EDITOR.md` | Sharpening posts into Ev's punchier 2010/Gawker-informed voice |
| Restorationist | `Agents/RESTORATIONIST.md` | Restoring recovered archive essays in batches: remove dead web machinery, clean imports, preserve provenance, promote to `sites/evbogue.com/posts/` |
| Designer | `Agents/DESIGNER.md` | Site readability, layout, and visual restraint |
| Coder | `Agents/CODER.md` | Small blog features and tooling |
| DevOps | `Agents/DEVOPS.md` | VPS, pull process, deployment, route health |
| Social media manager | `Agents/SOCIAL-MEDIA-MANAGER.md` | Distribution copy for finished posts |
| Account manager | `Agents/ACCOUNT-MANAGER.md` | Subscribers, replies, sponsors, reader relationships |
| Product manager | `Agents/PRODUCT-MANAGER.md` | Roadmap and publishing-system priorities |
| Analyst | `Agents/ANALYST.md` | First-party analytics and the weekly numbers memo |

Current editorial direction: direct, snarky, brutally honest, not cruel. Ev is a former NYMag and Gawker employee; future posts should feel more like the strongest 2010 archive posts than generic AI essays.

When acting as the Writer agent and pitching article topics:

- Punchy is good. Brutally honest is the goal. Lying is the line.
- No declarative titles for things Ev hasn't actually done. "Why I'm Deleting X" implies action he's taken. If he hasn't, frame it as interrogative or conditional: "Should I Delete X?", "I Keep Almost Doing X".
- Pitch from where Ev actually stands. Topics must be ones he can write today without contradicting his real situation or workflow.
- Don't contradict the workflow. This site is written with AI assistance. Topics that require Ev to claim he isn't using AI, or that position AI use as something he has abandoned, are a direct contradiction.
- Surface self-aware irony proactively. If you're an AI pitching a piece that involves AI, name that upfront.
- Flag the honest framing before Ev has to discover a false premise on rewrite.

## After every commit and push

Always confirm to Ev with a short summary: what commit(s) were pushed, to which branch, and what changed. Do this automatically — Ev should never have to ask "did we push?"

## Email

Ev uses PrivateEmail (Namecheap) SMTP:
- Host: `mail.privateemail.com`
- Port: 587
- User: ev@evbogue.com
- Pass: stored in env var `SMTP_PASS` on the server — do not hardcode

Subscribers are stored per-site in `sites/<site>/subscribers.json` (gitignored) as an array of objects:

```json
[{ "email": "you@example.com", "token": "...", "subscribed_at": "...", "confirmed_at": "...", "unsubscribed_at": null, "source": "form" }]
```

Old string-only entries are upgraded to this shape on first read (and grandfathered as confirmed). New signups use **double opt-in**: the form saves the row with `confirmed_at: null`, a confirmation email goes out via `lib/mailer.js`, and the recipient clicks `/confirm?token=…` to flip `confirmed_at` to a timestamp. Only confirmed, non-unsubscribed entries are emailed. `subscribers.json` is written atomically (write to `.tmp`, then rename). The server needs `SMTP_PASS` in env to actually send confirmations — without it the subscriber row still gets created but the email is skipped and a warning is logged.

**Admin notifications.** Ev gets an email at `SMTP_USER` (default `ev@evbogue.com`) whenever a real signup, confirm, or unsubscribe happens. Re-clicks of already-confirmed or already-unsubscribed links don't re-notify. The subject line is `[evbogue.com] <verb>: <email>` so it's easy to filter.

Send a post to the active list with:

```sh
SMTP_PASS=... deno run --allow-net --allow-read --allow-write --allow-env send-post.js [slug] --site=evbogue.com
```

The slug is optional — omit it to send the latest post (newest by `date` in frontmatter). `--site` defaults to `evbogue.com`. Add `--dry-run` to print the recipient list without sending. The script refuses drafts, sends one-to-one (no BCC blast), and sets `List-Unsubscribe` headers with both a per-recipient unsubscribe URL and the `ev@evbogue.com` mailto fallback. Each subscriber gets a unique unsubscribe token; the public `/unsubscribe?token=...` route flips `unsubscribed_at` and `activeSubscribers()` excludes them from future sends. For a manual removal, set `unsubscribed_at` to an ISO timestamp on the relevant entry in the site's `subscribers.json` on the VPS.

To run a permission pass (ask currently-confirmed subscribers to re-confirm under the DOI flow):

```sh
# preview only
SMTP_PASS=... deno run --allow-net --allow-read --allow-write --allow-env reconfirm.js [email] --site=evbogue.com --dry-run

# real run — one address (testing) or all active
SMTP_PASS=... deno run --allow-net --allow-read --allow-write --allow-env reconfirm.js ev@evbogue.com --site=evbogue.com
SMTP_PASS=... deno run --allow-net --allow-read --allow-write --allow-env reconfirm.js --site=evbogue.com
```

The script sends the reconfirmation email first; only on a successful send does it set `confirmed_at: null`. So a bad password or transient SMTP failure leaves state untouched and the run is safe to retry.

## Work order

This is the single work order for the repo. All outstanding tasks live here. Do not maintain separate work orders in other files.

### Infrastructure

- [ ] **VPS auto-pull**: add a cron job (no systemd — Deno lives in a tmux session) running every 60s: `git -C /path/to/evbogue.com pull --ff-only`. No restart needed. Requires a deploy key or HTTPS token. Status unknown — confirm with Ev.
- [ ] **VPS weekly report cron**: see `Agents/DEVOPS.md` for the Monday 09:00 cron line. Requires `SMTP_PASS` and `ANALYTICS_SALT` in env.

### Analytics

Phases 2–5 are shipped. Phases 6 and 7 remain deferred.

- **Phase 2** — Funnel events: `subscribe_attempt`, `confirm`, `unsubscribe`, and `send` events now write to `analytics/<site>.jsonl` alongside view data. No PII.
- **Phase 3** — `scripts/weekly_report.js` generates `analytics/reports/<site>/YYYY-Www.md`. Run with `deno task weekly-report` or `--week=YYYY-Www` for a specific week. Add `--email` to send via SMTP.
- **Phase 4** — Cron line and commit+email workflow documented in `Agents/DEVOPS.md`. VPS setup is a manual step for Ev.
- **Phase 5** — `/analytics` token gate was built and then deliberately removed. The dashboard is intentionally public.

Phases 6 (signup attribution) and 7 (per-recipient email click tracking) remain deferred — high complexity for current scale.

### Cleanup

- [x] **Deduplicate newsletter form**: removed bottom-of-page newsletter band; modal dialog in header is the single subscribe entry point. Done 2026-05-15.
- [x] **FBTS non-essay artifacts**: `how-to-read-a-book-a-week-in-2010` and Babauta contest post classified as `bury` — not imported into `posts/`.

### Archive

- [x] **Restoration complete**: 131/154 staged drafts promoted to `sites/evbogue.com/posts/`; 23 buried. All 2011–2014 evbogue.com Wayback drafts processed. HTML→Markdown, entities decoded, dead widgets stripped, pre-2025 private names anonymized to initials. Done 2026-05-15.
- [ ] **Batch 2 image restoration**: five evbogue.com pilot posts in batch 2 had external images stripped during HTML-to-Markdown conversion. If any images matter, localize them into `sites/evbogue.com/assets/posts/`.

### Code quality

- [x] **Tag display**: replaced forced Essay catch-all with Archive bucket. Posts tagged `archive`/`evbogue`/`fbts` now display as "Archive"; all other posts show their real first tag titlecased. Done 2026-05-15.

## Recently completed

- FBTS archive fully recovered: 171/171 dated posts published. Full archive restoration complete (2026-05-15): 131/154 evbogue.com Wayback drafts promoted to `sites/evbogue.com/posts/`, 23 buried. HTML→Markdown, entity decoding, dead widget removal, pre-2025 name anonymization applied across all batches.
- First-party analytics (phases 1–5): view counts, salted-IP unique visitors, funnel events (subscribe/confirm/unsubscribe/send), weekly report script (`scripts/weekly_report.js`), gated `/analytics` dashboard (`ANALYTICS_TOKEN`). Reports go to `analytics/reports/`.
- DOI subscribe flow: double opt-in confirmation email, admin notifications on signup/confirm/unsubscribe, atomic `subscribers.json` writes, one-click unsubscribe with token, `reconfirm.js` permission-pass script.
- `send-post.js` sends posts to the active subscriber list via SMTP, one-to-one with `List-Unsubscribe` headers; supports `--dry-run`.
- Modal subscribe dialog in page header; avatar in date ribbon; squared avatars on `/about`.
- Headline-pass workflow in CLAUDE.md: editor proposes 3–5 candidates early; second pass before publish.
- Writer, Editor, Archivist, Restorationist, Designer, Coder, DevOps, Social Media, Account Manager, Product Manager, and Analyst agent roles in `Agents/`.
- Posts composed with the Writer agent and published: `agents-md`, `how-to-fire-up-a-blog-with-openclaw`, `my-subscriber-list-is-a-json-file`, `i-built-a-dashboard-with-no-cookies-and-no-pixels`, `i-maintain-git-ssb-i-still-push-to-github`, `agentic-harnesses-and-the-discipline-of-attention`, `the-ai-did-not-ruin-your-codebase-you-let-it`, `james-pain-is-right-he-got-dumber`, and more.
- Repo cleanup: removed 171 FBTS source PDFs (`fbts_evbogue_mnml/`), completed one-shot import scripts, and stale archive assessment docs. `scripts/` now contains only tools needed for ongoing Wayback archive work.

## Notes

- `sites/evbogue.com/subscribers.json` is gitignored — it lives only on the VPS. Back it up separately.
- `test-email.js` is gitignored — it is a scratch SMTP test file.
- `analytics/evbogue.jsonl` is gitignored — it lives only on the VPS.
- The live design is the Signal layout in `sites/evbogue.com/assets/signal.css` and `sitePage()`; there is no active Pico/head.html shell.
- The ntfy send widget on `/about` posts to `https://ntfy.sh/evbogue` — Ev receives these as push notifications.
- git-ssb integration was discussed and deferred — the remote plumbing can be added later without changing the rest of the pipeline.
