# DESIGNER.md - Site Design Agent

Instructions for keeping evbogue.com readable, minimal, publication-first, and sharp enough for the new blogging-empire era.

## Your job

Make the site feel like a serious personal publishing outlet, not a startup landing page, portfolio theme, or archive cosplay.

Let the writing lead. Every design decision should make reading easier, publishing simpler, the archive more powerful, or the author more legible.

The ambition is not "nice personal blog." The ambition is a compact independent media property with the confidence of Gawker-era blogs and the future-facing curiosity of Wired at its peak, translated into Ev's minimal grammar.

Use Clive Thompson's 2006 New York Magazine article `Blogs to Riches` as business-history context: blogs win through voice, speed, niche authority, link gravity, archive memory, and repeatable publishing labor — not through ornamental magazine cosplay.

Do not imitate those sites visually. Borrow the attitude:

- Fast.
- Opinionated.
- Legible.
- Current.
- Slightly dangerous.
- Unimpressed by corporate polish.

## Source notes

The live design lives in `assets/signal.css` and `signalPage()` inside `serve.js`. Read those before changing the layout, marketing copy, or visual assets.

## What to touch

Usually touch:

- `assets/signal.css` (bump the `?v=` cache-bust in `signalPage()` when you change it)
- `signalPage()` and adjacent layout helpers in `serve.js`
- `assets/` (images, etc.)
- `about.md` when the design task includes positioning
- `README.md` or role docs when updating design guidance

Do not redesign the whole site unless explicitly asked.

## Design standard

- Keep the text column readable.
- Keep custom CSS small.
- Use the existing Signal stylesheet and font stack: Playfair Display, DM Sans, and DM Mono.
- Do not reintroduce the old Pico shell or dark/light toggle unless Ev explicitly asks for that design direction.
- Avoid cards, thumbnails, heavy sidebars, gradients, logos, and ornamental archive styling.
- Do not let recovered Far Beyond The Stars assets take over the current site identity.
- Make the homepage feel like the current publication, not a museum.
- Make the archive feel deep through density and navigation, not decoration.
- Make subscribe copy feel like receiving dispatches, not entering a funnel.
- Use typographic hierarchy, spacing, and copy attitude before adding visual ornament.
- Keep mobile intentional and readable.
- Treat RSS, email, durable URLs, search, and post-to-post linking as part of the design system.

## Marketing standard

When asked for marketing materials, keep them native to the publication.

Good materials:

- Front-page positioning lines.
- About-page language.
- Subscribe pitches.
- Launch/update posts.
- Social copy for specific posts or archive milestones.
- Simple image/card direction if needed.

Avoid:

- Generic "thought leadership" language.
- Startup landing-page sections.
- Inflated claims.
- Fake community language.
- Overexplaining the archive until the site feels dead.

The promise to reinforce: `evbogue.com` is an independent blog about the web, publishing, autonomy, recovered internet history, and whatever comes next.

## Report format

When finished, report:

- Files edited
- Visual change made
- Verification run
- Anything that needs a browser check
