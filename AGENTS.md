# AGENTS.md — evbogue.com

Instructions for the next agent working on this project.

## What this is

A minimal blog for Ev Bogue (ev@evbogue.com). The goal is a professional publishing outlet — think Gawker-era editorial voice, informed by Ev's 2010 minimalism blog. No CMS, no build step, just markdown files and a tiny Deno server.

## Stack

- **Runtime:** Deno 2.x (`brew install deno`)
- **Server:** Hono via `jsr:@hono/hono`
- **Markdown:** `marked` via `https://esm.sh/gh/evbogue/bog5@...`
- **CSS:** `assets/signal.css` served directly by the Deno app
- **Fonts:** Playfair Display, DM Sans, and DM Mono via Google Fonts
- **Deployment:** VPS running this repo, pulled from GitHub

## Run locally

```
deno task start
```

## File structure

```
serve.js          — all routes; `signalPage()` is the page wrapper
assets/signal.css — site stylesheet (cache-busted via ?v= query)
about.md          — bio + contact info (rendered at /about)
drafts/           — unpublished markdown drafts
posts/            — published markdown posts
Agents/           — specialized role instructions for writing, editing, ops, archive work, etc.
send-post.js      — emails a post to subscribers via SMTP (run manually after publishing)
subscribers.json  — email list (gitignored, lives only on server)
test-email.js     — SMTP test script (gitignored)
```

## Routes

| Route | Description |
|---|---|
| `/` | Post index — title, date, excerpt, newest first |
| `/posts/:slug` | Full post rendered from markdown |
| `/about` | Bio + social links + ntfy send widget |
| `/subscribe` | POST endpoint — saves email to subscribers.json |

## Posts

Draft a markdown file in `drafts/` with this frontmatter:

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

Publish by moving the file from `drafts/` to `posts/`. Anything in `posts/` is public and appears in the index and feed. Anything in `drafts/` is private to the repo and ignored by the server. Do not use a `draft` frontmatter field.

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
| Writer | `Agents/WRITER.md` | Turning rough notes into publishable drafts |
| Editor | `Agents/EDITOR.md` | Sharpening posts into Ev's punchier 2010/Gawker-informed voice |
| Archivist | `Agents/ARCHIVIST.md` | Full-blog rewrite, archive restoration, continuity posts back in time |
| Restorationist | `Agents/RESTORATIONIST.md` | Cleaning recovered archive essays in small batches without rewriting history |
| Designer | `Agents/DESIGNER.md` | Site readability, layout, and visual restraint |
| Coder | `Agents/CODER.md` | Small blog features and tooling |
| DevOps | `Agents/DEVOPS.md` | VPS, pull process, deployment, route health |
| Social media manager | `Agents/SOCIAL-MEDIA-MANAGER.md` | Distribution copy for finished posts |
| Account manager | `Agents/ACCOUNT-MANAGER.md` | Subscribers, replies, sponsors, reader relationships |
| Product manager | `Agents/PRODUCT-MANAGER.md` | Roadmap and publishing-system priorities |

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

Subscribers are stored in `subscribers.json` (gitignored) as an array of objects:

```json
[{ "email": "you@example.com", "token": "...", "subscribed_at": "...", "confirmed_at": "...", "unsubscribed_at": null, "source": "form" }]
```

Old string-only entries are upgraded to this shape on first read (and grandfathered as confirmed). New signups use **double opt-in**: the form saves the row with `confirmed_at: null`, a confirmation email goes out via `lib/mailer.js`, and the recipient clicks `/confirm?token=…` to flip `confirmed_at` to a timestamp. Only confirmed, non-unsubscribed entries are emailed. `subscribers.json` is written atomically (write to `.tmp`, then rename). The server needs `SMTP_PASS` in env to actually send confirmations — without it the subscriber row still gets created but the email is skipped and a warning is logged.

Send a post to the active list with:

```sh
SMTP_PASS=... deno run --allow-net --allow-read --allow-write --allow-env send-post.js <slug>
```

Add `--dry-run` to print the recipient list without sending. The script refuses drafts, sends one-to-one (no BCC blast), and sets `List-Unsubscribe` headers with both a per-recipient unsubscribe URL and the `ev@evbogue.com` mailto fallback. Each subscriber gets a unique unsubscribe token; the public `/unsubscribe?token=...` route flips `unsubscribed_at` and `activeSubscribers()` excludes them from future sends. For a manual removal, set `unsubscribed_at` to an ISO timestamp on the relevant entry in `subscribers.json` on the VPS.

## Work order — remaining tasks

### 1. VPS auto-pull from GitHub
On the VPS, set up a systemd timer (or cron) running every 60s:
```
git -C /path/to/evbogue.com pull --ff-only
```
The server reads markdown at request time so no restart is needed after a pull. Needs a deploy key or HTTPS token with read access to the GitHub repo.

### 2. End-to-end dry run
Write a real post in Obsidian, save the `.md` file in `drafts/`, move it into `posts/` when ready, push to GitHub, confirm it appears on the live site and in `/feed.xml`, then run `send-post.js <slug>` and verify the subscriber email lands cleanly.

## Recently completed

- RSS feed exists at `/feed.xml`, and `signalPage()` includes the alternate RSS link.
- Subscribe form on every page posts to `/subscribe`; result banner (`?subscribe=ok|invalid|error`) renders on the home page.
- `send-post.js` sends a post to the subscriber list via SMTP, one-to-one with `List-Unsubscribe` headers; supports `--dry-run`.
- Published `posts/how-to-fire-up-a-blog-with-openclaw.md` on 2026-04-25.
- Created the `Agents/` role system, including the Archivist continuity role for backdated timeline work.

## Notes

- `subscribers.json` is gitignored — it lives only on the VPS. Back it up separately.
- `test-email.js` is gitignored — it's a scratch SMTP test file.
- The live design is the Signal layout in `assets/signal.css` and `signalPage()`; there is no active Pico/head.html shell.
- The ntfy send widget on `/about` posts to `https://ntfy.sh/evbogue` — Ev receives these as push notifications.
- git-ssb integration was discussed and deferred — the remote plumbing can be added later without changing the rest of the pipeline.
