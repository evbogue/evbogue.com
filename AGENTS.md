# AGENTS.md — evbogue.com

Instructions for the next agent working on this project.

## What this is

A minimal blog for Ev Bogue (ev@evbogue.com). The goal is a professional publishing outlet — think Gawker-era editorial voice, informed by Ev's 2010 minimalism blog. No CMS, no build step, just markdown files and a tiny Deno server.

## Stack

- **Runtime:** Deno 2.x (`brew install deno`)
- **Server:** Hono via `jsr:@hono/hono`
- **Markdown:** `marked` via `https://esm.sh/gh/evbogue/bog5@...`
- **CSS:** Pico CSS classless v2 (CDN, no custom CSS except font and font-weight overrides)
- **Font:** Inter (Google Fonts)
- **Deployment:** VPS running this repo, pulled from GitHub

## Run locally

```
deno task start
```

## File structure

```
serve.js          — all routes
head.html         — shared HTML head + site header + nav
foot.html         — shared footer with email signup form
about.md          — bio + contact info (rendered at /about)
posts/            — one .md file per post
Agents/           — specialized role instructions for writing, editing, ops, archive work, etc.
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

Drop a markdown file into `posts/` with this frontmatter:

```
---
title: "Post title"
slug: post-slug
date: 2026-04-24
tags: [tag1, tag2]
draft: false
excerpt: "One-liner shown on the homepage index."
---

Body text...
```

`draft: true` hides the post from the index and feed. Push to GitHub and the VPS pulls automatically (see work order below).

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

## Email

Ev uses PrivateEmail (Namecheap) SMTP:
- Host: `mail.privateemail.com`
- Port: 587
- User: ev@evbogue.com
- Pass: stored in env var `SMTP_PASS` on the server — do not hardcode

Subscribers are stored in `subscribers.json` (gitignored). The send-on-publish flow is not yet implemented — see work order.

## Work order — remaining tasks

### 1. VPS auto-pull from GitHub
On the VPS, set up a systemd timer (or cron) running every 60s:
```
git -C /path/to/evbogue.com pull --ff-only
```
The server reads markdown at request time so no restart is needed after a pull. Needs a deploy key or HTTPS token with read access to the GitHub repo.

### 2. Send email to subscribers on new post
Write a script `send-post.js` that:
- Reads `subscribers.json`
- Takes a post slug as an argument, loads that post
- Sends the post title + excerpt + link via SMTP (nodemailer, PrivateEmail settings above)
- Run manually after pushing: `SMTP_PASS=... deno run --allow-net --allow-read --allow-env send-post.js hello-world`
Optionally hook into the VPS git pull so it fires automatically when a new post appears.

### 3. End-to-end dry run
Write a real post in Obsidian, drop the `.md` file into `posts/`, push to GitHub, confirm it appears on the live site and in `/feed.xml`, and that subscriber email sends correctly.

## Recently completed

- RSS feed exists at `/feed.xml`, and `head.html` includes the alternate RSS link.
- Homepage/sidebar subscribe form posts to `/subscribe`.
- Published `posts/how-to-fire-up-a-blog-with-openclaw.md` on 2026-04-25.
- Created the `Agents/` role system, including the Archivist continuity role for backdated timeline work.

## Notes

- `subscribers.json` is gitignored — it lives only on the VPS. Back it up separately.
- `test-email.js` is gitignored — it's a scratch SMTP test file.
- The dark/light mode toggle is a Pico `role="switch"` checkbox in the nav. Preference is saved to localStorage.
- The ntfy send widget on `/about` posts to `https://ntfy.sh/evbogue` — Ev receives these as push notifications.
- git-ssb integration was discussed and deferred — the remote plumbing can be added later without changing the rest of the pipeline.
