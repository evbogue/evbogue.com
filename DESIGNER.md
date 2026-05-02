# DESIGNER.md — evbogue.com

Design notes for future agents working on the blog template.

## Direction

This site should feel like `evbogue.com`, not a replica of Far Beyond The Stars.

The content archive includes recovered FBTS posts, but the current site is not a museum. It is the new front page for Ev's publishing operation: independent, fast, opinionated, and legible.

Think less "personal portfolio" and more "small media empire run from a laptop." The references are Gawker when blogs still had teeth and Wired when the future still looked weird:

- **Gawker energy:** sharp headlines, fast scans, confidence, minimal ceremony, no corporate sheen.
- **Wired energy:** curiosity about the technological present, clean systems, future-facing restraint.
- **Ev energy:** direct voice, small tools, refusal of bloat, independent publishing as a way of life.

The design should say: this is a serious publication, but it is not trying to look expensive. It should feel like a site that can publish three times before breakfast.

## Design Philosophy

The new era of `evbogue.com` is a blogging empire without empire furniture.

No masthead theater. No fake magazine chrome. No startup gradients. No dashboard aesthetic. The power move is speed, clarity, archive depth, and a recognizable point of view.

Design principles:

- **Text is the product.** Everything frames the sentence, headline, date, and next click.
- **The archive is leverage.** Old posts should add weight and continuity, not nostalgia clutter.
- **Homepage is an editorial front.** It should feel current, selective, alive, and curated.
- **Posts are dispatches.** They should load quickly, read cleanly, and end without dark-pattern furniture.
- **Subscription is the business model seed.** The email form should feel like joining the transmission, not signing up for a SaaS funnel.
- **Minimal does not mean timid.** Use scale, spacing, hierarchy, and copy attitude to create edge.
- **No cosplay.** Do not imitate Gawker/Wired visually; translate their confidence into this site's minimal grammar.

## Editorial Surface

The site should support a few publication surfaces over time:

- **Front page:** current posts, sharp positioning, small subscribe pitch, clear archive/search access.
- **Post pages:** headline/date/body with very little friction.
- **Archive index:** compact, chronological power; hundreds of posts should feel impressive, not overwhelming.
- **About page:** author credibility, contact routes, and why this publication exists now.
- **Feed/newsletter:** RSS and email are primary distribution, not afterthoughts.

When adding new surfaces, keep them native to the blog. A media empire here is a durable publishing rhythm, not an ornamental homepage.

## Voice in Interface

Interface copy should sound like Ev's writing:

- Short.
- Human.
- Slightly sharp.
- Not cute.
- Not brand-consultant language.
- Not AI-polished mush.

Good examples:

- "Read the archive"
- "Get the next post"
- "Send me a message"
- "Recovered from the old web"
- "Latest dispatches"

Avoid:

- "Unlock exclusive insights"
- "Join our community"
- "Elevate your digital journey"
- "Thought leadership"
- "Content hub"

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
- Feel like a front page, not a directory dump.
- Prefer fewer, stronger choices over showing everything.

The `/posts` route should:

- Show every post title and date.
- Stay compact and scannable.
- Avoid excerpts, cards, thumbnails, or archive clutter.
- Make the scale of the archive obvious through density.

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

The sidebar is not an ad rail. Treat it like the publisher's desk:

- Who is writing.
- Why this exists.
- How to get the next thing.
- How to contact Ev.

Keep it compact. If it starts looking like a media kit, cut it.

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
- Use typographic hierarchy before adding decoration.
- Prefer rules, spacing, and density over images.
- Make mobile feel intentional, not merely stacked.
- Do not add animations unless they make state clearer.
- Do not add a logo unless Ev explicitly asks for one.
- Do not let "professional" become bland.

## Marketing Materials

Design and marketing are linked here. Any launch copy, social card, subscribe pitch, or about-page positioning should reinforce the same promise:

`evbogue.com` is an independent blog about the web, publishing, autonomy, recovered internet history, and whatever comes next.

Useful positioning lines to test:

- "A blog from the old web, rebuilt for the next one."
- "Independent publishing, recovered archives, future-facing dispatches."
- "Ev Bogue on the web, small tools, autonomy, and what survived."
- "The blog is back. The archive came with it."

Do not over-explain the archive on every page. The site should feel alive first, historical second.

## `Blogs to Riches` Lessons

Clive Thompson's 2006 New York Magazine piece `Blogs to Riches` is required context for this site's pro-blogging ambition.

The useful lesson is not "put ads on a blog and get rich." The useful lesson is that successful blogs were not just diaries. They were repeatable editorial machines with niche authority, speed, voice, linking gravity, and a business surface.

Apply these lessons:

- **Power laws are real.** Most blogs vanish because attention compounds around sites that already have links, memory, and identity. This site should use Ev's existing archive as accumulated gravity.
- **First-mover advantage becomes archive advantage.** Ev's old work is not filler. It is proof that this voice has history.
- **Niche beats generality.** The publication should own a recognizable lane: old web, small tools, autonomy, publishing, minimalism after minimalism, and network culture.
- **Voice is a moat.** Gawker's advantage was not decoration; it was a fast, unmistakable editorial mode. Ev's equivalent should be direct, funny when deserved, skeptical, and not cruel.
- **Frequency matters, but only with taste.** The site should be built for regular dispatches without making every post feel disposable.
- **Links are distribution.** RSS, email, search, post-to-post linking, and social copy should all make it easy for readers to point at specific pieces.
- **Focused audiences monetize better than vague audiences.** If sponsorship or paid products appear later, they should match the readership's actual interests instead of chasing generic scale.
- **The boutique model fits.** `evbogue.com` should be one carefully aimed publication, not a network of thin sites.
- **Professional does not mean corporate.** The best blog businesses looked cheap to run and expensive to read.
- **The labor is the product.** A pro blog is work: publishing rhythm, headlines, edits, links, reader replies, and maintenance.

Design implications:

- Make the top post feel current and worth linking.
- Make archive pages dense, useful, and easy to cite.
- Make every post URL canonical and durable.
- Put subscription and RSS where serious readers can find them.
- Keep visual identity light so the voice can carry the brand.
- Add topic/tag pages when the archive is ready, because niches need clear entry points.

## Growth Without Bloat

A blogging empire can grow by adding durable primitives:

- Better archive browsing.
- Topic/tag pages.
- A clear newsletter/send-on-publish flow.
- Occasional editorial series.
- Stronger launch and social copy.
- Lightweight sponsorship or classified-style placements, if ever needed.

Avoid growth by:

- Adding CMS complexity.
- Adding analytics clutter.
- Adding popups.
- Adding generic landing-page sections.
- Adding stock art.
- Turning posts into product pages.

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
