# evbogue.com

Source for [evbogue.com](https://evbogue.com).

Deno + Hono. Published evbogue.com posts are markdown files in `sites/evbogue.com/posts/`; unpublished drafts live in `sites/evbogue.com/drafts/`. `serve.js` renders published posts at request time. No build step.

## Run locally

```
deno task start
```

## Write a post

Draft markdown files in `sites/evbogue.com/drafts/`. When a post is ready, move it into `sites/evbogue.com/posts/`.

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

Commit and push. The VPS pulls periodically and serves anything in `sites/evbogue.com/posts/`. Files left in `sites/evbogue.com/drafts/` are not public and do not appear in the RSS feed.

## Archive

Staged evbogue.com Wayback drafts live in `archive/evbogue-drafts/`. Promote them to `sites/evbogue.com/posts/` in batches per `Agents/ARCHIVIST.md`. The FBTS PDF archive (2009–2011) is fully recovered — 171/171 posts are published.
