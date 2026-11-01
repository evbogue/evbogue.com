# AGENTS.md — evbogue.com

Instructions for the next agent working on this project.

## What this is

A minimal multi-site publishing repo for Ev Bogue (ev@evbogue.com). evbogue.com is Ev's personal site; bogbook.com is being planned as a Gawker/NYMag-style media blog. No CMS, no build step, just markdown files and a tiny Deno server.

## Stack

- **Runtime:** Deno 2.x (`brew install deno`)
- **Server:** Hono via `npm:hono` (npm registry, so it resolves everywhere including locked-down containers)
- **Markdown:** `marked`, vendored at `vendor/marked.esm.js` (the bog5 build, committed so there's no runtime CDN dependency)
- **CSS:** `sites/<site>/assets/*.css` served directly by the Deno app
- **Fonts:** Playfair Display, DM Sans, and DM Mono via Google Fonts
- **Deployment:** `root@evbogue.com`, repo at `/root/evbogue.com`. App runs as `deno serve --port=8082 serve.js` in tmux session `10`, behind a TLS reverse proxy on `:443`. Manual `git pull` to deploy. Markdown goes live on pull; `serve.js` changes need an app reload. Full runbook in `Agents/DEVOPS.md`.

## Run locally

```
deno task start
```

### Running in a Claude Code container

Claude Code web/cloud containers do **not** ship Deno, and the normal install
paths are blocked by the session's egress policy — `brew install deno` isn't
available and the `deno.land` installer returns **403** (so does `dl.deno.land`).
Deno itself still runs here; you just have to fetch the binary from GitHub
(which is allowed) instead of from deno.land:

```sh
curl -fsSL -o /tmp/deno.zip \
  https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip
unzip -o /tmp/deno.zip -d /tmp
install -m 0755 /tmp/deno /usr/local/bin/deno
deno --version
```

Once Deno is on the PATH, `deno task start` boots cleanly in a container. That
wasn't always true: `jsr.io` and `esm.sh` are both 403-blocked here, so the app
used to die fetching Hono and `marked`. It doesn't anymore, because those two
deps were moved to sources the container *can* reach:

| Dependency | Source | In a Claude container |
|---|---|---|
| Hono | `npm:hono` (was `jsr:@hono/hono`) | reachable — npm registry is allowed |
| `marked` | `vendor/marked.esm.js` (was `esm.sh`) | reachable — committed in-repo |
| `nodemailer`, `playwright` | npm registry | reachable |
| `deno.land`, `jsr.io`, `esm.sh` | — | **403 — still blocked, but nothing imports from them** |

If you ever add a new `jsr:` or `esm.sh`/`deno.land` import it will fail in
containers — prefer `npm:` specifiers or vendor the file under `vendor/`. `bun`
and `node` are also preinstalled if you need a quick JS runtime for something
unrelated to `serve.js`.

**Screenshots in a container.** `deno task screenshots` runs Chromium fine here
— it's preinstalled at `$PLAYWRIGHT_BROWSERS_PATH` and the script launches it by
explicit path (don't run `playwright install`). The catch is egress: the live
project sites (`wiredove.net`, `anproto.com`, `apds.anproto.com`,
`decent.evbogue.com`, even `evbogue.com`) are all 403-blocked from a container,
so there's nothing to capture. Real portfolio screenshots have to be taken where
those sites are reachable — your machine or the VPS. From a container you can
only screenshot a target the container can reach, e.g. the local dev server
(`deno task start`, then point a capture at `http://localhost:8082/`).

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
| `/` | Existing publishing homepage |
| `/timeline/*` | Timeline page, signed-message API, and verified AndFS media reads |
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

### Which site does each agent serve?

| Role | evbogue.com | bogbook.com |
|---|---:|---:|
| Writer | Yes | No — use Gawker Writer |
| Gawker Writer | No | Yes |
| Editor | Yes | Yes, after reading `Agents/GAWKER-WRITER.md` |
| Restorationist | Yes | No |
| Designer | Yes | Yes |
| Coder | Yes | Yes |
| DevOps | Yes | Yes |
| Social media manager | Yes | Yes |
| Account manager | Yes | Yes |
| Product manager | Yes | Yes |
| Analyst | Yes | Yes |

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

## Git branch policy

Always commit and push directly to `master`. Do not create feature branches. If the environment creates a feature branch automatically, merge it into master and push master before finishing the session.

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

### Current priority — sustainable internet fame, 2026-10-29

Status: planned. This section is the current execution order for the timeline; older handoff checklists below remain reference scope. The October 4 direction to use the actual Wiredove widget remains authoritative. Do not restore the removed independent timeline renderer or composer.

**Research purpose:** learn whether publishing on Ev’s own domain, with portable authorship and accessible conversations, leads to repeat recognition, relationships, collaborations, and opportunities at a sustainable cost in time.

**Shared first milestone:** a visitor reads Ev’s Wiredove posts on evbogue.com, opens a conversation, replies without leaving the site, and can reload the same conversation. The reply is also retrievable in Wiredove. Reading requires no identity setup. Validate writes with disposable identities and isolated local services before any separately authorized public release.

#### Next ticket: connect the real interactive Wiredove embed

- [ ] Preserve and inspect existing uncommitted site work. Reconcile `timeline/README.md`: its opening correctly describes a read-only widget, while later descriptions of removed controls/background behavior need an explicit historical label or correction after source inspection.
- [ ] Work with Wiredove’s `SHARED_UI_WORK_ORDER.md` current priority. Document the host/runtime boundary before wiring it. Shared UI and interaction fixes belong upstream; this repo supplies site chrome, configuration, verified data/storage/media services, and capability/route adapters.
- [ ] Load verified owner originals for the configured Ev public key; keep replies in conversations and profile/edit events out of the ordinary post list. Distinguish truly empty history from unavailable or incomplete synchronization. Start with a real read-only owner-content inspection, without publishing test artifacts.
- [ ] Pin a known Wiredove client revision and its dependencies with provenance and an update procedure. Confirm actual module availability; avoid depending on an unversioned production module. A pinned asset copy must not become a divergent UI fork.
- [ ] Enable opening a thread, identity setup when Reply is chosen, draft preservation, signing, publication status, retry, and reload through the supplied Wiredove runtime. Keep top-level posting owner-only. Never configure Ev’s secret key on the server.
- [ ] Preserve server verification, existing quotas/abuse controls, exact signed bytes, identifiers, media endpoints, and existing identity backups. Provide durable local post/thread URLs, reload, Back, and return-to-feed position.

**Acceptance:** on two local origins with public outbound writes disabled, a disposable owner publishes a text/image post, a visitor reads and replies within the site, Wiredove retrieves that reply, and both clients retain the thread after reload. Also check reverse-direction publication, relay failure/retry, duplicate delivery, unauthorized root posts, bad signatures, unavailable media, keyboard use, and 390px/320px layout. Fixtures must never appear as Ev’s real public content. Record which real owner/history/media checks remain unverified.

**Deliver:** screenshots, pinned upstream revision, updated timeline documentation, checks and limitations, data/media backup boundary, deployment revision and rollback plan. Track local verification, release preparation, and production verification separately. This documentation task does not deploy or publish messages.

**Stop point:** the interactive loop works locally. Next prepare a reviewed release and, after release, select actual work for the Fame ledger. Homepage preview, wider historical import, broader moderation, and extra analytics follow only as separate priorities.

Coordination: `../wiredove/SHARED_UI_WORK_ORDER.md` owns shared behavior; `../anproto-fame/WORK_ORDER.md` owns research records. These are local workspace links, not deployment dependencies.

### Wiredove publication handoff — 2026-10-01

**Status:** superseded in part by Ev’s 2026-10-04 instruction to depend on the complete Wiredove widget. The timeline now mounts `wiredove-widget`; the separate timeline UI and inactive component copy have been removed. Keep the host adapter limited to verified data. Implement missing interactions upstream in Wiredove. The widget is currently read-only; storage and media APIs remain intact. Ev requested this handoff document after reviewing the proposal. This document records the proposed implementation scope; creating it does not itself authorize deployment or public test posts. Follow Ev's instructions in the receiving session.

**Objective:** replace the presentation of `/timeline/` with actual Wiredove embed components for Ev's identity, making evbogue.com a dependable home for personal posts, images, audio, video, and conversations. Demonstrate ANProto's research into sustainable internet fame through durable identity, publishing on one's own domain, portable attribution, and low publishing effort.

Owner public key (match exactly; preserve `+` and `=` when encoding URLs):

```text
ev4/4vRXmzuPXlIUFbvGaFkiIkKfErW9nLnvKTPls5A=
```

#### Read first and preserve existing work

- Site repo: `/Users/evbogue/Code/evbogue.com`. Read this file, `Agents/DESIGNER.md`, `Agents/CODER.md`, `timeline/README.md`, `timeline/config.json`, `timeline/client.js`, `timeline/server.js`, `timeline/index.html`, `serve.js`, and `sites/evbogue.com/assets/signal.css`. Read `Agents/DEVOPS.md` before any authorized deployment.
- Wiredove repo: `/Users/evbogue/Code/wiredove`. Read its `AGENTS.md`, `WORK_ORDER.md`, `client/README.md`, `client/index.js`, `client/ui.js`, `client/render.js`, `client/protocol.js`, `client/relay.js`, `client/andfs.js`, and `style.css`.
- Research context: `/Users/evbogue/Code/anproto-fame/README.md`.
- At research time the site had uncommitted changes in `serve.js`, `timeline/client.js`, and `timeline/server.js`. Wiredove had uncommitted changes in `composer.js`, `media.js`, `profile.js`, `profile_header.js`, `render.js`, `serve.js`, and `style.css`, plus untracked `andfs_media.js`, `client/`, and `vendor/`. Recheck status and diffs; preserve and reconcile this work. Do not reset it, blindly stage it, or assume it is all part of this task.
- The existing site changes already dynamically import Wiredove and render `wiredove-message`. They are a partial integration, not a completed replacement.

#### Findings to revalidate

- On 2026-10-01 the live `/timeline/` displayed “No posts yet,” and `GET /timeline/api/posts` returned `{"posts":[]}`. The configured owner was already correct. Determine why content is absent; do not assume the identity has no posts or that a UI swap fixes synchronization.
- `https://wiredove.net/client/index.js` returned HTTP 404. Local embed source exists, but production availability was not established.
- The demo in `wiredove/client/embed-demo.js` uses fixture posts and a demo identity. Never ship those as Ev's content.
- Wiredove's custom elements render supplied posts and emit interaction intent. They do not independently fetch an author's history, manage identity, verify posts, or persist publications.
- The timeline already stores exact signed messages, verifies signatures, enforces owner-only root posts, supports public replies, and serves AndFS media. Keep that useful infrastructure. Existing relay synchronization is bounded, not a full historical import.
- The reusable renderer is not yet equivalent to the full Wiredove app: legacy media, profile events, and edits need explicit compatibility review. The timeline currently rejects edit events.

#### Product and visual decisions

- [ ] Preserve `/timeline/`, the shared site header/footer/navigation, and the current single reading column. Follow the actual Signal CSS: near-white background, dark system sans-serif text, blue links, quiet separators. Older font guidance in role docs is stale. No overall site redesign, heavy sidebar, nested scrolling iframe, or second app navigation bar.
- [ ] Use the real Wiredove message/feed/thread/composer primitives inside the site shell. Prefer these to the combined widget's Feed/Search/Write chrome. Do not create another independent social renderer and call it an embed.
- [ ] Add a compact introduction: heading **Timeline**; description **Notes, images, audio, and video from Ev Bogue.**; quiet linked attribution **Published with Wiredove. Part of our research into sustainable internet fame at ANProto.** Verify link destinations. Keep the full key in expandable identity details with a copy action, not the opening line.
- [ ] Main feed: verified owner-authored original posts, newest first; compact author/avatar treatment, comfortable body text, understated timestamps, thin separators rather than boxed cards. Separate reply conversations from the main stream. Do not silently include unrelated relay traffic or treat profile/edit events as ordinary posts.
- [ ] Provide reply counts, Reply, and permanent links. Show replies in a focused conversation view with useful parent context and a return action that restores feed position. Keep raw signatures and hashes accessible through Details.
- [ ] Display images, audio, and video inline with native controls, no autoplay, appropriate aspect ratios, and sensible portrait-video height. Handle unavailable or unsupported media with a useful message/link. Keep long URLs, keys, and reply nesting from causing mobile overflow.
- [ ] Use explicit “Load older posts” pagination and a “New posts” update affordance. Preserve drafts, expanded conversations, scroll position, and active playback during background refresh. Component setters currently rebuild their DOM; do not blindly reassign the whole feed during playback.
- [ ] Read and play without signing in. Reveal identity setup when someone chooses Reply; preserve their draft. Show top-level composing only to the owner. Explain that Wiredove.net and evbogue.com have separate browser identity storage when setup is needed. Never request or embed Ev's private key in source/server configuration.
- [ ] Retain owner publishing and visitor replies with media through the existing signed storage/relay path. A relay failure must distinguish “saved here” from “confirmed by Wiredove” and retain retry capability.
- [ ] Add a small **Latest on the timeline** homepage preview of three recent owner posts, linking to their local permanent URLs and the timeline. Use the same verified data source; preserve the current introduction, essays, projects, and subscription entry point. Treat this as the proposed companion change, not a homepage redesign.

#### Architecture and durability

- [ ] Add a small, reusable publication appearance interface in Wiredove as needed. The components use Shadow DOM, so site CSS alone cannot reliably restyle internals. Prefer supported CSS variables/parts or a documented appearance option over reaching into shadow roots. Preserve Wiredove's default appearance elsewhere and verify light/dark OS settings do not create mismatched surfaces.
- [ ] Serve a pinned local copy of the required Wiredove component assets and their relative dependencies, with source revision/provenance and an update procedure. Avoid relying on an unversioned remote module at runtime. Keep upstream reusable fixes in Wiredove; avoid a divergent component fork in the site.
- [ ] Reuse the timeline's verified message store, signing adapters, owner authorization, quotas, and media gateway. Preserve exact signed content bytes and original identifiers. Do not rewrite old signed posts to fit the new UI.
- [ ] Diagnose initial synchronization and implement bounded, resumable history retrieval appropriate to the real owner feed. A new visitor should see cached verified content promptly; visiting the page should not require manually discovering Settings → Sync. Be explicit about partial history and synchronization failures.
- [ ] Give posts durable evbogue.com URLs with correctly encoded message identifiers, reloadable thread views, and browser Back/Forward behavior. Prefer a server-resolvable post route with meaningful title/description and readable cached content for sharing and non-JavaScript access. Preserve existing timeline fragment links where feasible.
- [ ] Keep `/timeline/media/*` and `/timeline/blobs/*` available for existing signed references. Back up the entire timeline data directory before any authorized migration; a JSON message export is not a media backup. Determine which remote media is only referenced versus retained locally, and document the durability boundary.
- [ ] Review representative real text, image, audio, video, reply, legacy attachment, edit, and profile events where available. Implement required compatibility or an explicit fallback. Do not claim full Wiredove parity or complete history without evidence.
- [ ] Provide distinct loading, truly empty, unavailable-post, unavailable-media, and network-failure states. Cached content must remain readable during relay failure. Use a readable fallback if component loading fails.

#### Execution sequence and acceptance

1. Inventory current changes and deployed behavior; inspect representative public owner content without publishing test artifacts. Establish the actual data and media compatibility requirements.
2. Complete the reusable component appearance/navigation interfaces and the site's pinned asset integration. Build the timeline and homepage preview against realistic fixtures in a local environment with the public relay disabled.
3. Connect the real verified store and synchronization; implement durable post routes, conversation navigation, identity/composer wiring, and preservation of existing media endpoints.
4. Validate the complete reading and publishing experience. Only deploy or publish public test messages when authorized by the receiving session; otherwise deliver a verified local result and identify the remaining live check.

Acceptance checklist:

- [ ] A fresh visit shows the intended owner's real verified content when available, without manual identity setup. Owner key and fixture identities cannot be confused.
- [ ] Desktop and approximately 390px/320px mobile views are visually checked with text, long links, portrait media, replies, and empty/error states. Controls have accessible names, keyboard access, visible focus, and readable contrast.
- [ ] A permalink opens the same post/thread after reload; Back restores the previous view; old supported links still work. Shared pages have meaningful metadata.
- [ ] Text, image, audio, and video publishing and replies pass local integration checks with disposable identities. Invalid signatures and unauthorized top-level posts are rejected. Drafts survive failures; repeated delivery does not duplicate messages.
- [ ] Background updates do not reset playback or erase composing state. Older-post loading remains usable as the feed grows.
- [ ] Existing media plays/seeks through preserved gateway URLs. Relay/module/media failure states are tested independently, including cached reading.
- [ ] Actual cross-client publish/reply/playback is observed between Wiredove and the site in a controlled environment. Record whether this used a local relay or production; do not substitute a mock-only result for a claim of live interoperability.
- [ ] Run relevant Deno checks, timeline tests/browser checks, and Wiredove client tests, adapting assertions to the intended behavior. Record results and any unverified live checks. Do not run browser tests against a public relay with throwaway posts.
- [ ] Update `timeline/README.md`, relevant Wiredove component documentation, and this checklist to match the final implementation. Deliver screenshots, changed-file summary, pinned component revision, test results, compatibility limits, and deployment/rollback notes. Follow repository commit policy when committing; do not include unrelated existing edits.

**Out of scope:** generalized network search, follower/vanity metrics, algorithmic ranking, a new CMS, a wholesale site redesign, automatic cross-platform syndication, new analytics infrastructure, streaming/transcoding/resumable uploads, and media garbage collection. Basic reply abuse controls should be preserved; broader moderation tooling remains follow-up work. Extend edit/profile/history support only as required for a faithful owner publication and record remaining limitations.

**Research outcome:** the demonstration should make it easy to recognize Ev, consume and share his work at his domain, reply, and return. Use existing measurement where possible to assess repeat visits, conversations, movement between essays and timeline, and publishing effort. Do not equate signatures alone with permanent media availability or claim the project has already proved sustainable fame.

- [x] **Existing baseline:** basic personal timeline with shared site chrome, owner posts, public replies, persistent AndFS media, bounded relay exchange, and local verification. See `timeline/README.md`.
- [ ] **Deferred timeline work:** broader moderation, comprehensive historical synchronization beyond the scoped implementation, remaining edit/profile support, resumable uploads, media garbage collection, and storage scaling beyond the current prototype.

### Infrastructure

- [ ] **VPS auto-pull**: confirmed NOT set up as of 2026-08-03 — deploys are a manual `git -C /root/evbogue.com pull --ff-only`. If automating, note a plain pull only makes markdown live; `serve.js` changes still need the app reload (see `Agents/DEVOPS.md`). No systemd — Deno lives in tmux session `10`.
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

## Git synchronization — standing instruction

Ev explicitly requested on 30 October 2026 that local work and GitHub stay synchronized. Sync is part of completing authorized work; do not wait for a separate push request.

- At session start, inspect `git status`, the current branch, remotes, and upstream. Fetch `origin` and compare local and remote commits before editing. Read incoming changes and updated agent/work-order instructions.
- Preserve uncommitted work before integrating incoming commits. Fast-forward when possible; otherwise reconcile both histories and resolve conflicts deliberately. Never discard local work, overwrite another agent's commits, or force-push to make a branch appear current.
- Use this repository's established default branch and upstream. Keep related repositories coordinated, but inspect each independently; do not blindly stage unrelated changes, secrets, identity backups, generated state, or private research data.
- Run checks appropriate to the reconciled changes and update work orders/handoffs to match observed behavior. Commit completed work in focused commits and push the intended branch to GitHub before finishing a change session, unless Ev explicitly asks to keep it local.
- Fetch again before pushing. If GitHub advanced, integrate the new commits, rerun affected checks, and retry a normal push. After pushing, verify the local HEAD equals the intended GitHub branch tip and inspect the remaining worktree status. Report the commit, branch, checks, and any remaining changes or divergence automatically.
- If authentication, network access, conflicts, failing checks, or unfinished work prevent synchronization, preserve the work and report the exact blocker. Do not claim synchronization from an attempted push or a stale remote-tracking ref. Clearly label any intentionally preserved unfinished checkpoint.
- A GitHub push is source synchronization, not permission to deploy services, publish public test messages, send email, or change production data. Existing release and publication rules still apply. Do not install background auto-pull jobs; sync at session boundaries and coordinated handoffs.

## Interactive embed checkpoint — 2026-10-30

The local timeline now integrates shared Wiredove identity/composer/session UI,
persistent browser identity/file drafts and exact signed outbox retry, owner-only
Write, historical image caching and resumable bounded history. The current manifest
pins the runtime byte-for-byte. Earlier read-only checkpoints above are historical.
Separate-origin browser acceptance checks create/import, owner publish, image draft
reload, failed-save retry and thread reload with public requests blocked. Backend
and host tests pass. Complete interactive two-client relay acceptance, real owner
history/legacy-media inspection and production deployment remain open.

## Timeline proxy origin handling — 2026-10-30

The site configures exact HTTPS origins for evbogue.com and www.evbogue.com so
signed writes survive TLS proxy forwarding to the HTTP app. Foreign origins are
rejected; forwarded headers cannot expand the allowlist. Signature, owner/reply,
and quota checks remain active. Deno checks and all 13 timeline tests passed on
an isolated staged snapshot, including origin spoofing and invalid content.
This source change does not deploy the app; production verification is pending.

## Verified shared timeline release slice — 2026-10-30

The site uses pinned shared identity/composer/session widgets, persistent File
drafts/outbox, owner-only Write and visitor replies. Homepage preview shares the
message component; cached text links survive module failure. Local acceptance
includes real HTTP local-relay bidirectional replies/reload, verified WAV/WebM
playback/seek in both browser frames, exact outage retry and no duplicates.
Current owner configuration from `907a55c` is authoritative. Historical stored
records/media are preserved. See timeline/SHARED_WIDGET_HANDOFF.md for the final
source pin and deployment verification. Earlier read-only and injected-identity
checkpoints are historical; full edit/moderation and physical Safari acceptance
are still outstanding.

## Remaining embed work completed locally — 2026-10-30

Pinned Wiredove 4e56893506bf21e1b12e15129d4a8692a6a0ad34. Homepage previews,
cached/no-module timeline links, post descriptions, bounded partial sync and
retryable missing reply parents are implemented. Deno checks and 14 backend/host
tests pass. Separate-origin browser tests and a two-widget local HTTP relay
roundtrip verify image publication, replies/reload, audio/video playback/seek and
outage retry without duplicate records. Full-site mobile homepage/fallback checks
block writes. This does not prove full production Wiredove website parity or
legacy-media completeness; production deployment remains pending.

## Full application replacement — 2026-11-01

The timeline now mounts the shared full application from pinned Wiredove
`220d155f288821c228416bdb6e6964f0b58d0210`, replacing old widget routing,
reply-count and publication glue. `timeline/session.js` was removed. Homepage
previews remain consumers of the individual shared message widget. See
`timeline/README.md` for the current boundary; older widget notes are historical.

The existing backend exposes `/timeline/api/application` with a persistent
append-order cursor while retaining exact signed artifacts, owner/reply policy,
quotas, relay verification and media storage/endpoints. Metadata-only profiles
and same-author known-post edits are supported. The app explicitly upgrades the
old browser identity/text/File drafts and exact outbox without deleting them.
Compose is owner-only; keys remain browser-owned. Local two-origin acceptance
covers replies both ways, reload, profile creation and exact retry after outage,
plus mobile/light/dark screenshots. Full feature/device/history completeness
remains separate. Production release evidence follows after deployment.

## Final-review corrections — 2026-11-01

Ev accepts offline signing with available history, including possible forks; do
not add an online latest-head prerequisite. Shared artifact readers retain failed
historical image requests beyond archive-cursor advancement and retry on later
pulls, notifying mounted galleries only after hash verification. Visitor reply
edits use the existing Wiredove composer and `edit` target contract; backend and
relay ingestion validate the original author and preserve all original bytes.
Local tests verify edit publication, original retention, foreign-author rejection,
relay edit ingestion and display/reload in both full application mounts. No
production deployment or public fixture publication is included in this checkpoint.

## Full application production verification — 2026-11-01

The `d7dd9f6` full application checkpoint is live and verified. Local frozen
check, 16 backend/host tests and two-origin browser acceptance passed. Public
owner/pin and application hashes match; desktop/390/320px smoke checks preserve
cached reading with browser writes blocked. Production write acceptance was not
attempted. See `Agents/DEVOPS.md` for backup, screenshots, rollback and limits.
Earlier statements that deployment is pending are historical checkpoints.
