# evbogue.com

Source for [evbogue.com](https://evbogue.com).

Deno + Hono. Published posts are markdown files in `posts/`; unpublished drafts live in `drafts/`. `serve.js` renders published posts at request time. No build step.

## Run locally

```
deno serve --allow-net --allow-read serve.js
```

## Write a post

Draft markdown files in `drafts/`. When a post is ready, move it into `posts/`.

Use this frontmatter:

```
---
title: "Post title"
slug: post-title
date: 2026-04-24
tags: [tag1, tag2]
excerpt: "Optional one-liner for the homepage index."
---

Post body...
```

Commit and push. The VPS pulls periodically and serves anything in `posts/`. Files left in `drafts/` are not public and do not appear in the RSS feed.

## Archive recovery

The repo includes a PDF archive under `fbts_evbogue_mnml/`.

For the full archive import workflow and current handoff state, see `archive/INTEGRATION.md`.

Build a manifest of the archive:

```sh
deno run --allow-read --allow-write scripts/build_pdf_manifest.js
```

Import one PDF into a draft markdown file under `drafts/`:

```sh
deno run --allow-read --allow-write --allow-run scripts/import_pdf_post.js "fbts_evbogue_mnml/20101108_How to Destroy Your Past Lives - starting over.pdf"
```
