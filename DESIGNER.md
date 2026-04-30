# DESIGNER.md — evbogue.com

Design notes for future agents working on the blog template.

## Direction

This site should feel like `evbogue.com`, not a replica of Far Beyond The Stars.

The content archive includes recovered FBTS posts, but the layout should stay modern, quiet, and minimal:

- Single publishing outlet for Ev Bogue.
- Minimal blog, not magazine/archive cosplay.
- Let the writing lead.
- Avoid large branded FBTS graphics, heavy sidebars, ornamental archive styling, or Wayback-era mimicry.

## Current Layout

The shared shell lives in `head.html` and `foot.html`.

- Pico CSS classless v2 is loaded from CDN.
- Inter is the site font via Google Fonts.
- Custom CSS should stay small and structural.
- Header contains site title, Posts, About, RSS, and dark mode toggle.
- Footer is intentionally minimal.

The homepage route in `serve.js` should:

- Show only the latest few posts, currently 3.
- Link to `/posts` for the complete archive.
- Use a desktop sidebar for Ev's profile/bio/subscribe block.
- Collapse that sidebar into a top bio bar on mobile.

The `/posts` route should:

- Show every post title and date.
- Stay compact and scannable.
- Avoid excerpts, cards, thumbnails, or archive clutter.

## Responsive Behavior

Pico provides base typography, form, and switch styling. It is not a utility/layout framework.

For layout behavior, use small custom CSS:

- `.home-layout` is a CSS grid on desktop.
- Desktop grid areas: posts on the left, bio sidebar on the right.
- Mobile grid areas: bio first, posts second.
- `.intro` is a sidebar on desktop and a compact row on mobile.

This is preferred over adding a larger CSS framework.

## Sidebar

The sidebar/topbar currently contains:

- Profile photo from `/assets/ev.png`.
- Brief bio.
- Subscribe form posting to `/subscribe`.

Keep subscribe in the sidebar/topbar, not the footer, unless Ev explicitly changes this.

## Theme Toggle

Keep the Pico dark/light toggle in the top nav.

- Uses `data-theme` on `document.documentElement`.
- Defaults to system preference.
- Saves manual choice in `localStorage`.
- Uses Pico's `role="switch"` styling.

Avoid replacing this with a custom theme system unless there is a strong reason.

## Visual Rules

- Use Inter.
- Prefer narrow readable text columns.
- Do not use the FBTS logo as the site brand.
- Do not make the homepage list every recovered post.
- Do not turn the archive into cards.
- Avoid custom colors unless necessary; lean on Pico variables.
- Keep custom CSS in `head.html` concise and understandable.

## Implementation Notes

The server reads `head.html` and `foot.html` once at startup:

```sh
deno serve --allow-net --allow-read --allow-write --port 8787 serve.js
```

Restart the local server after template edits.

Useful verification:

```sh
deno check serve.js
curl -s http://127.0.0.1:8787/ | rg "home-layout|sidebar-subscribe|theme-toggle"
curl -s http://127.0.0.1:8787/posts | rg "archive-list"
```
