# DESIGN_WORKORDER.md — evbogue.com

Work order for the next design/marketing pass.

## Goal

Make `evbogue.com` feel like a professional independent blog publication: fast, minimal, readable, opinionated, and built around Ev's writing.

Reference patterns, not visual cloning:

- **Daring Fireball:** dense link culture, durable archive, voice-first restraint.
- **Stratechery:** solo publication as a serious business surface.
- **Seth's Blog:** extreme clarity and zero decorative nonsense.
- **Substack publication layouts:** featured post, recent list, subscribe module.
- **The Verge:** strong editorial hierarchy only; do not copy the visual chaos.

## Current Problem

The desktop redesign is moving in the right direction, but mobile currently leads with the publisher/sidebar material before the writing. That makes the site feel like a profile page instead of a publication.

The navbar also needs to be simpler. A squeezed inline search input does not work on mobile. Search should be available, but not dominate the first line.

## Non-Negotiables

- Keep the stack: Deno + Hono + markdown + `head.html`/`foot.html`.
- Keep Pico CSS for base styling unless Ev explicitly approves a stack change.
- Keep custom CSS small and readable.
- Do not touch archive recovery files:
  - `archive/RECOVERY_SYSTEM.md`
  - `archive/FBTS_COMPLETENESS_ASSESSMENT.md`
  - `Agents/RESTORATIONIST.md`
- Do not add a CMS, build step, Tailwind, React, or a component framework.
- Do not turn the archive into cards.
- Do not use the FBTS logo as the current site brand.

## Work Order

### 1. Fix Mobile Content Order

On mobile, the page should lead with the publication and the latest post, not the publisher/sidebar.

Desired mobile order:

1. Navbar
2. Hero/mission headline
3. Lead story
4. Recent dispatches
5. Publisher's Desk / subscribe module

Implementation notes:

- Change the mobile `.home-layout` grid order so `.home-posts` appears before `.intro`.
- On desktop, keep the sidebar on the right.
- Keep `.intro` compact when it moves below the post river.

### 2. Simplify Mobile Navbar

Target: one clean line.

Preferred mobile nav:

`evbogue.com` | `Archive` | `Search` | `RSS` | theme switch/icon

Implementation notes:

- Do not show a full search input in the navbar on mobile.
- Use a `details` dropdown for Search.
- Search dropdown should appear under the nav, full-width or right-aligned, without pushing the layout around.
- Do not hide RSS on mobile; serious readers need RSS.
- If space is tight, shorten brand only as a last resort.

### 3. Normalize Header Scale

The huge homepage headline is strong, but it can overpower mobile.

Implementation notes:

- Keep Utopia-style tokens in `head.html`.
- Use a smaller mobile-specific hero size, likely `--step-4` or `--step-5`.
- Keep line-height tight, but avoid clipping and excessive vertical takeover.
- The hero should look editorial, not like a broken billboard.

### 4. Strengthen Homepage Structure

Desktop:

- Hero/mission headline on left.
- Publisher's Desk/sidebar on right.
- One lead story below hero.
- Recent dispatches as a compact river.

Mobile:

- Hero first.
- Lead story second.
- Recent dispatches third.
- Publisher/subscribe after the writing.

Implementation notes:

- Keep current `lead-story` idea.
- Keep current `river-header`.
- Consider limiting recent dispatches to 4 after the lead story.
- Keep the full archive link obvious.

### 5. Improve Archive Page

The archive should feel dense and intentional.

Implementation options:

- Add year dividers: `2026`, `2011`, `2010`, etc.
- Keep list compact.
- Keep title/date only.
- Add top intro copy and post count.

Do not add thumbnails, excerpts, cards, or pagination yet.

### 6. Subscribe Placement

Desktop:

- Keep subscribe in Publisher's Desk/sidebar.

Mobile:

- Move subscribe below the lead/recent posts, not before.
- Keep copy: "Get the next post" and "No funnel. Just the next dispatch."

Implementation notes:

- This may require splitting `introHtml()` into publisher bio and subscribe module, or changing CSS order.
- Keep `/subscribe` behavior unchanged.

### 7. Search UX

Search should be useful, not visually dominant.

Implementation notes:

- Desktop: compact inline nav search is okay.
- Mobile: `Search` text opens a dropdown.
- Preserve the query in the input after search.
- Search results page should keep the same header but clearly show `Search results`.

## Suggested File Touches

- `head.html` — CSS and nav markup.
- `serve.js` — homepage ordering/markup, archive year grouping if implemented.
- `about.md` — only if positioning copy needs another pass.
- `DESIGNER.md` / `Agents/DESIGNER.md` — only if new design rules are discovered.

## Verification

Run:

```sh
deno check serve.js
deno task start
```

Browser checks:

- `http://localhost:8082/` desktop width
- `http://localhost:8082/` mobile width around 390px
- `http://localhost:8082/?q=minimalist`
- `http://localhost:8082/posts`
- `http://localhost:8082/about`

Mobile acceptance criteria:

- Navbar fits on one line.
- Search does not appear as a cramped input.
- Hero/lead story appear before Publisher's Desk.
- No horizontal scrolling.
- Subscribe is visible but not the first thing after nav.

## Commit Suggestion

Commit message:

```sh
git commit -m "Refine mobile-first publication layout"
```
