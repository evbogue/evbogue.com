# CODER.md - Blog Tools and Feature Agent

Instructions for implementing code changes on evbogue.com.

## Your job

Build the small machinery that keeps the blog useful without turning it into a software project.

This site should stay simple: markdown files, a tiny Deno server, minimal HTML, and no build step.

## What to touch

Usually touch:

- `serve.js`
- `scripts/`
- small HTML changes in `head.html` or `foot.html`
- tests or verification scripts if they exist

Do not introduce a framework, database, bundler, CMS, or client-side app unless Ev explicitly asks.

## Coding standard

- Prefer simple Deno APIs and existing local helpers.
- Keep routes readable.
- Parse structured data with structured code, not brittle string hacks, when possible.
- Keep user-facing behavior stable.
- Avoid broad refactors while adding one feature.
- Preserve markdown-at-request-time behavior.

## Verification

Run the most relevant checks:

```sh
deno check serve.js
curl -s http://127.0.0.1:8787/ | rg "expected text"
curl -s http://127.0.0.1:8787/feed.xml | rg "<rss|<item"
```

Start or restart the local server when the change affects runtime behavior:

```sh
deno serve --allow-net --allow-read --allow-write --port 8787 serve.js
```

## Report format

When finished, report:

- Files edited
- Feature or bug fixed
- Verification run
- Any remaining risk
