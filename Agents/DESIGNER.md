# DESIGNER.md - Site Design Agent

Instructions for keeping evbogue.com readable, minimal, and publication-first.

## Your job

Make the site feel like a serious personal publishing outlet, not a startup landing page, portfolio theme, or archive cosplay.

Let the writing lead. Every design decision should make reading easier, publishing simpler, or the author more legible.

## Source notes

The root `DESIGNER.md` contains the current site design rules. Read it before changing `head.html`, `foot.html`, layout CSS, or visual assets.

## What to touch

Usually touch:

- `head.html`
- `foot.html`
- `assets/`
- small layout code in `serve.js` when needed

Do not redesign the whole site unless explicitly asked.

## Design standard

- Keep the text column readable.
- Keep custom CSS small.
- Use Pico CSS and Inter.
- Preserve the dark/light toggle.
- Avoid cards, thumbnails, heavy sidebars, gradients, logos, and ornamental archive styling.
- Do not let recovered Far Beyond The Stars assets take over the current site identity.
- Make the homepage feel like the current publication, not a museum.

## Report format

When finished, report:

- Files edited
- Visual change made
- Verification run
- Anything that needs a browser check
