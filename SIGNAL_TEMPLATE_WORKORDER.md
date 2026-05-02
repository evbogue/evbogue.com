# SIGNAL_TEMPLATE_WORKORDER.md - evbogue.com

Work order for porting the `signal-blog` visual template into the existing Deno/Hono blog without adopting Astro or adding a build step.

## Goal

Bring the editorial Signal-style template into the current app as a beta theme while keeping:

- Existing markdown posts in `posts/`
- Existing `/posts/:slug` URLs
- Existing `/feed.xml`
- Existing `/about`
- Existing `/subscribe` behavior and `subscribers.json`
- Existing Deno/Hono deployment model
- Existing current design as a fallback

Use `signal-blog/` as the visual reference, not as the runtime.

## Reference Files

- `signal-blog/src/styles/global.css`
- `signal-blog/src/layouts/Base.astro`
- `signal-blog/src/layouts/Post.astro`
- `signal-blog/src/pages/index.astro`
- `signal-blog/src/pages/archive.astro`
- `signal-blog/src/pages/tag/[tag].astro`

## Non-Negotiables

- Do not migrate the site to Astro.
- Do not add a build step.
- Do not duplicate post content into `signal-blog/src/content/posts/`.
- Do not remove or overwrite the current `head.html` / `foot.html` design.
- Do not break `/feed.xml`, `/subscribe`, `/about`, or existing post URLs.
- Keep changes scoped to the beta template unless Ev explicitly asks to flip it live.

## Work Order

### 1. Snapshot Current Behavior - DONE

Confirm the current app still works before changing the template.

Tasks:

- Run a syntax/type check for `serve.js`.
- Run the Deno server locally.
- Check `/`, `/posts`, one `/posts/:slug`, `/about`, and `/feed.xml`.
- Note the current git status so later agents know the worktree was already dirty.

Deliverable:

- Baseline confirmed with no intentional behavior changes.

Baseline results from 2026-05-02:

- `deno check serve.js` passed.
- Local server started with `deno serve --allow-net --allow-read --allow-write --port 8787 serve.js`.
- `GET /` returned `200 text/html; charset=UTF-8`.
- `GET /posts` returned `200 text/html; charset=UTF-8`.
- `GET /posts/hello-world` returned `200 text/html; charset=UTF-8`.
- `GET /about` returned `200 text/html; charset=UTF-8`.
- `GET /feed.xml` returned `200 application/rss+xml; charset=utf-8`.
- The worktree was already dirty before this work order was added. Existing modified files included `serve.js`, `head.html`, `foot.html`, `about.md`, several agent/design docs, and multiple restored post files. New untracked directories/files also already included `signal-blog/`, `.claude/`, `.playwright-mcp/`, screenshots, archive docs, and restoration scripts.

### 2. Extract Signal CSS - DONE

Bring Signal's visual system into the main app without wiring it to production routes.

Tasks:

- Copy relevant CSS from `signal-blog/src/styles/global.css`.
- Put it somewhere like `assets/signal.css` or a new beta template file.
- Replace Signal-specific brand and route assumptions:
  - `SIGNAL` -> `evbogue.com`
  - `/rss.xml` -> `/feed.xml`
  - `/archive` -> `/beta/archive` or `/posts`, depending on route context
- Keep current `head.html` unchanged.

Deliverable:

- Signal CSS exists in the main app and is ready for beta routes.

Implementation notes:

- Added `assets/signal.css`.
- The stylesheet is adapted from `signal-blog/src/styles/global.css`.
- It is isolated for beta routes and does not change the current `head.html` / `foot.html` design.
- Signal-specific runtime route assumptions are handled in the beta HTML wrapper/routes rather than in the stylesheet.

### 3. Normalize Post Data - DONE

Add helpers in `serve.js` so existing frontmatter can power the Signal layout.

Tasks:

- Add `descriptionFor(post)` using `post.excerpt || excerptFromBody(post.body)`.
- Add `primaryTagFor(post)` using the first `post.tags` item or `Essay`.
- Add `authorFor(post)` using `post.author || "Everett Bogue"`.
- Add `readTimeFor(post)` using roughly 200 words per minute.
- Add `formatDisplayDate(date)` for Signal-style dates.

Deliverable:

- Posts expose every field needed by the Signal beta without rewriting existing markdown.

Implementation notes:

- Added `descriptionFor(post)`.
- Added `primaryTagFor(post)` and `tagsFor(post)`.
- Added `authorFor(post)`.
- Added `readTimeFor(post)`.
- Added `formatDisplayDate(date, style)`.
- Added `tagSlugFor(tag)`.
- `loadPosts()` now falls back to the markdown filename when frontmatter has no `slug`.

### 4. Add Signal Page Wrapper - DONE

Create a Signal equivalent of `head.html + foot.html`.

Tasks:

- Build a function like `signalPage({ title, description, body })`.
- Include Signal header, nav, date ribbon, newsletter block, and footer.
- Keep the newsletter form posting to existing `POST /subscribe`.
- Keep RSS links pointing to `/feed.xml`.

Deliverable:

- A second page wrapper exists alongside the current `page()` wrapper.

Implementation notes:

- Added `signalPage({ title, description, body })` in `serve.js`.
- The wrapper links only to `/assets/signal.css`.
- Header/nav, date ribbon, newsletter block, and footer are adapted from the Signal template.
- Newsletter form still posts to existing `POST /subscribe`.
- RSS links point to `/feed.xml`.

### 5. Build `/beta` Homepage - DONE

Port Signal's homepage structure into Deno-rendered HTML.

Tasks:

- Add `app.get('/beta', ...)`.
- Use existing `loadPosts()`.
- Render the latest post as the hero.
- Render the next three posts as side stories.
- Render more posts in an article grid.
- Optionally render a featured essay band from the first Essay-tagged post.
- Point links to `/beta/posts/:slug`.

Deliverable:

- `/beta` shows real evbogue.com posts in Signal style.

Implementation notes:

- Added `GET /beta`.
- Latest post renders as the hero.
- Next three posts render as side stories.
- The next three posts render in the Signal `Latest` article grid.
- Featured essay band renders when an Essay-tagged post is available.
- Three additional posts render in the Signal `More Stories` article grid.
- Beta homepage links point to `/beta/posts/:slug`.
- Corrected after first pass to match the Astro template's homepage flow more closely: hero, side stories, Latest grid, Featured Essay band, and More Stories grid.

### 6. Build Beta Post Pages - DONE

Add Signal-styled post pages without replacing current `/posts/:slug`.

Tasks:

- Add `app.get('/beta/posts/:slug', ...)`.
- Render tag, title, excerpt/dek, author, date, read time, and markdown body.
- Ensure all beta homepage links open beta post pages.

Deliverable:

- Beta posts render in the Signal article layout.

Implementation notes:

- Added `GET /beta/posts/:slug`.
- Renders normalized tag, title, dek, author, long display date, read time, and markdown body.
- Current canonical `/posts/:slug` route remains unchanged.

### 7. Build Beta Archive - DONE

Add a Signal-style archive page.

Tasks:

- Add `app.get('/beta/archive', ...)`.
- Render all posts newest first.
- Include tag, title, and date.
- Link posts to `/beta/posts/:slug`.

Deliverable:

- Full archive is browsable in the beta design.

Implementation notes:

- Added `GET /beta/archive`.
- Renders every published post newest first.
- Includes normalized tag, title, and display date.
- Archive rows link to `/beta/posts/:slug`.

### 8. Optional Beta Tag Pages - DONE

Only do this if tag browsing matters for the beta.

Tasks:

- Add `app.get('/beta/tag/:tag', ...)`.
- Filter by normalized primary tag or all tags.
- Render a Signal-style card grid.
- Link tag labels to beta tag pages.

Deliverable:

- Signal-style tag browsing works under `/beta/tag/:tag`.

Implementation notes:

- Added `GET /beta/tag/:tag`.
- Filters against existing `tags` frontmatter and normalized primary tags.
- Renders matching posts with the Signal card grid.

### 9. Mobile Polish - DONE

Test the beta against real archive titles and long posts.

Tasks:

- Check `/beta`, `/beta/archive`, and `/beta/posts/:slug` at mobile widths.
- Fix nav overflow.
- Fix long title wrapping.
- Confirm newsletter form fits.
- Confirm article grid collapses cleanly.
- Confirm post body images and code blocks do not create horizontal scrolling.

Deliverable:

- Beta is usable on phone and desktop.

Implementation notes:

- Checked `/beta`, `/beta/archive`, and `/beta/posts/how-to-fire-up-a-blog-with-openclaw` in the browser at 390px mobile width.
- Checked `/beta` at 1280px desktop width.
- Mobile nav now keeps `Archive` and `Subscribe` visible while hiding lower-priority links.
- Corrected after first pass: mobile nav now matches the Signal template more closely by showing the wordmark and Subscribe button only at narrow widths.
- Added a favicon declaration to avoid the browser's default `/favicon.ico` 404.
- Added a cache-busting query to the beta stylesheet link: `/assets/signal.css?v=20260502c`.
- Normalized raw local tags into Signal-style category labels: `AI`, `Analysis`, `Media`, and `Essay`.
- Tightened the mobile date ribbon so it stays on one line at 390px.
- Captured verification screenshots:
  - `signal-beta-mobile.png`
  - `signal-beta-desktop.png`
  - `signal-beta-desktop-reported.png`
  - `signal-beta-mobile-corrected.png`

### 10. Decide Launch Mode - DONE

Once the beta feels right, choose routing.

Options:

- Keep `/` current and `/beta` Signal.
- Add a nav link to `/beta` for a soft launch.
- Make `/` use the Signal renderer and keep the old design at `/classic`.

Deliverable:

- Production behavior is explicit and reversible.

Implementation notes:

- Full switch chosen.
- Canonical routes now use the Signal renderer:
  - `/`
  - `/posts`
  - `/posts/:slug`
  - `/about`
  - `/tag/:tag`
- Existing `/feed.xml` and `/subscribe` behavior remain unchanged.
- `/beta`, `/beta/archive`, `/beta/posts/:slug`, and `/beta/tag/:tag` remain available as preview aliases for now.
- The current `head.html` / `foot.html` files were not removed, but they are no longer used by the canonical routes.

## Suggested Handoff Prompt

```text
We want to port the visual template in signal-blog into the existing Deno/Hono app without moving to Astro. Keep the current markdown posts, /posts/:slug URLs, /feed.xml, /about, and /subscribe behavior. Add the Signal design first as beta routes under /beta, /beta/posts/:slug, and /beta/archive. Do not remove the current head.html/foot.html design. Normalize existing post frontmatter by deriving description from excerpt, tag from first tags item or Essay, author from author or Everett Bogue, and read time from body word count. Use signal-blog/src/styles/global.css and signal-blog/src/layouts/Base.astro/Post.astro/pages as design references. Continue from SIGNAL_TEMPLATE_WORKORDER.md.
```

## Verification

Run:

```sh
deno check serve.js
deno serve --allow-net --allow-read --allow-write --port 8787 serve.js
```

Check:

- `http://localhost:8787/`
- `http://localhost:8787/posts`
- One real post, for example `http://localhost:8787/posts/hello-world`
- `http://localhost:8787/about`
- `http://localhost:8787/feed.xml`
- `http://localhost:8787/beta`
- `http://localhost:8787/beta/archive`
- `http://localhost:8787/beta/posts/how-to-fire-up-a-blog-with-openclaw`
- `http://localhost:8787/beta/tag/minimalism`
- `http://localhost:8787/assets/signal.css?v=20260502c`

Latest verification from 2026-05-02:

- `deno check serve.js` passed.
- `GET /` returned `200 text/html; charset=UTF-8`.
- `GET /posts` returned `200 text/html; charset=UTF-8`.
- `GET /posts/hello-world` returned `200 text/html; charset=UTF-8`.
- `GET /about` returned `200 text/html; charset=UTF-8`.
- `GET /feed.xml` returned `200 application/rss+xml; charset=utf-8`.
- `GET /beta` returned `200 text/html; charset=UTF-8`.
- `GET /beta/archive` returned `200 text/html; charset=UTF-8`.
- `GET /beta/posts/how-to-fire-up-a-blog-with-openclaw` returned `200 text/html; charset=UTF-8`.
- `GET /beta/tag/minimalism` returned `200 text/html; charset=UTF-8`.
- `GET /assets/signal.css?v=20260502c` returned `200 text/css; charset=utf-8`.
