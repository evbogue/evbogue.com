# evbogue.com

Source for [evbogue.com](https://evbogue.com).

Deno + Hono. Published posts are markdown files in `posts/`; unpublished drafts live in `drafts/`. `serve.js` renders published posts at request time. No build step.

## Run locally

```
deno task start
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

## Archive

Staged evbogue.com Wayback drafts live in `archive/evbogue-drafts/`. Promote them to `posts/` in batches per `Agents/ARCHIVIST.md`. The FBTS PDF archive (2009–2011) is fully recovered — 171/171 posts are published.
