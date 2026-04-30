# Archive Integration

This file explains how archived posts are being integrated into this repo.

The short version:

- `Farbeyondthestars.com` posts were recovered from PDF files first, then upgraded to Wayback HTML for fidelity.
- `evbogue.com` posts are being recovered directly from Wayback captures.
- Nothing should go straight from archive scraping into `posts/` without passing through a draft stage first.

## Current state

As of this handoff:

- `posts/` already contains the recovered Far Beyond The Stars era material.
- Those recovered posts now use archived Wayback HTML bodies rather than raw PDF extraction.
- Embedded images for those restored posts were localized into `assets/posts/`.
- `archive/evbogue-2011-2016-manifest.json` contains the current `evbogue.com` candidate list.
- `archive/evbogue-drafts/` contains the first successful `evbogue.com` imports.

Current `evbogue.com` manifest counts:

- `419` high-confidence candidates
- `7` medium-confidence candidates
- `1415` ambiguous candidates

Important: the ambiguous bucket is mostly alias garbage and alternate path prefixes. Do not bulk import it.

## Repo locations

- `posts/`
  Final published markdown posts used by the live site.
- `archive/drafts/`
  Drafts created from the PDF import workflow.
- `archive/evbogue-drafts/`
  Drafts created from the `evbogue.com` Wayback import workflow.
- `assets/posts/`
  Localized post images downloaded from archive/original hosts.
- `archive/pdf-manifest.json`
  Inventory of the local PDF archive.
- `archive/evbogue-2011-2016-manifest.json`
  Inventory of candidate `evbogue.com` Wayback URLs.

## Scripts

### PDF / FBTS workflow

- `scripts/build_pdf_manifest.js`
  Scans `fbts_evbogue_mnml/` and builds `archive/pdf-manifest.json`.
- `scripts/import_pdf_post.js`
  Imports one PDF into markdown.
- `scripts/bulk_import_pdf_posts.js`
  Bulk PDF importer.
- `scripts/restore_post_from_wayback.js`
  Replaces PDF-derived body content with Wayback HTML for a recovered post.
- `scripts/bulk_restore_from_wayback.js`
  Bulk restore for PDF-imported posts.
- `scripts/localize_post_images.js`
  Downloads embedded images and rewrites post HTML to local asset paths.
- `scripts/bulk_localize_post_images.js`
  Bulk image localization.

### `evbogue.com` workflow

- `scripts/build_evbogue_manifest.js`
  Reads Wayback CDX exports from `/tmp/evbogue-cdx.json` and `/tmp/www-evbogue-cdx.json`, normalizes URLs, filters obvious non-posts, and writes `archive/evbogue-2011-2016-manifest.json`.
- `scripts/import_evbogue_from_manifest.js`
  Reads the manifest and imports matching records into `archive/evbogue-drafts/` using era-specific HTML extractors.

## How the integration works

### 1. Build or refresh the archive inventory

For PDFs:

```sh
deno run --allow-read --allow-write scripts/build_pdf_manifest.js
```

For `evbogue.com`:

```sh
deno run --allow-read --allow-write scripts/build_evbogue_manifest.js
```

The `evbogue.com` script expects the Wayback CDX exports to already exist at:

- `/tmp/evbogue-cdx.json`
- `/tmp/www-evbogue-cdx.json`

If those files are missing, fetch them before running the manifest builder.

### 2. Import into drafts, not `posts/`

For `evbogue.com`, import only the confident set first:

```sh
deno run --allow-read --allow-write --allow-net scripts/import_evbogue_from_manifest.js high
```

This writes markdown files to `archive/evbogue-drafts/`.

Do not move drafts into `posts/` automatically. The importers are good, but the archive has multiple site themes and some URLs are section pages rather than articles.

### 3. Review the imported draft content

Each imported draft should be checked for:

- correct title
- correct date
- complete body content
- absence of nav/footer garbage
- broken internal links
- external image URLs that still need localization

Examples of clean draft imports already present:

- `archive/evbogue-drafts/1000-true-equals.md`
- `archive/evbogue-drafts/packing.md`
- `archive/evbogue-drafts/interview-ev.md`

### 4. Localize assets

If a restored post still points at external images, use the same asset-localization approach already used for the FBTS set.

The intended end state is:

- HTML body preserved from Wayback
- image `src` rewritten to `/assets/posts/...`
- no dependency on remote image hosts for archive posts

### 5. Promote reviewed drafts into `posts/`

Once a draft is confirmed:

- move it from `archive/evbogue-drafts/` into `posts/`
- keep frontmatter fields like `original_url` and `wayback_snapshot_url`
- set `draft: false` only when it should be public

The site reads `posts/` on request, so once a file is in `posts/`, it is live without a rebuild.

## What is already reliable

- The FBTS recovery path is reliable enough to use as the model.
- The `evbogue.com` manifest builder works and separates obvious candidates from obvious junk.
- `archive/evbogue-drafts/` now contains **154 drafted posts** (up from 37).

## Extractors implemented (as of 2026-04-25)

| Layout | Extractor | Era | Status |
|---|---|---|---|
| `wordpress-2011` | `extractWordPress` (main div) | Feb 2011 | Working |
| `wordpress-2011b` | `extractWordPress` (posts div) | Aug–Sep 2011 | Working |
| `reserva-2014` | `extractReserva` | 2014–2015 | Working |
| `metalwork-2016` | `extractMetalwork` | 2016 | Working |
| `minimal-2013` | `extractMinimal2013` | 2013 | **Added but not yet tested at scale — needs run 4** |

## What still needs work

### 1. Run 4 for the 2013 theme
The `minimal-2013` extractor was added during session but not yet exercised at scale.
Known 2013-era slugs that need it:
`arch`, `node`, `kickbacks`, `gittip`, `haters`, `systemd`, `cryptocurrencies`,
`gnuphd`, `wysiwyg`, `mechanics`, `modernblogging`, `howishakyll`, `googlebuses`,
`clearyourmind`, `elegance`, `googleharmful`, `gwenbell`, `liveandworkanywhere`,
`c`, `digitalocean`, `fiveyears`, `workcation`, `moneyadvice`, `communication`,
`prettygoodprivacy`, `exorcism`, `oneway`, `odyssey`.

Run 4:
```sh
deno run --allow-read --allow-write --allow-net scripts/import_evbogue_from_manifest.js high
```

### 2. Permanently unrecoverable (503 from Wayback)
`megalopolis`, `twosidesofnode`, `dontknowshit`, `irc`, `ahead` — Wayback has no good snapshot.

### 3. Non-post pages correctly failing (do not fix)
`presentyourself`, `transform`, `oldshit`, `hireme`, `letters`, `links` — sales/landing/nav pages.
`index.html`, `offerings.html`, `bedrocklinux.org` — junk CDX entries.

### 4. Image localization
Not yet run for `archive/evbogue-drafts/`. Run when drafts are stable:
```sh
deno run --allow-read --allow-write --allow-net scripts/bulk_localize_post_images.js archive/evbogue-drafts
```

### 5. HTML entities in older drafts
The 37 original Codex-era drafts still have raw entities (`&#8217;` etc.) in their bodies.
The importer now decodes these for new imports. The old drafts need a one-time fix pass.

## Integration rules

- Never bulk copy all manifest records into `posts/`.
- Never trust single-slug URLs blindly; some are landing pages or nav pages.
- Always draft first, then review, then publish.
- Preserve archived HTML when possible. PDF text is fallback material, not the preferred final source.
- Prefer local copies of images for durability.
- The importer pre-filters already-drafted slugs at startup — safe to re-run without overwriting.
- Do not sleep on extractor failures — only sleep (500ms) after successful network fetches.

## Recommended next steps for the next model

1. Run the importer once more (`high` confidence) — should pick up the 2013-era posts via `minimal-2013`.
2. Spot-check a few 2013 drafts (check title, date, body quality) before declaring it done.
3. Run `bulk_localize_post_images.js archive/evbogue-drafts` to download all external images.
4. Do a one-time entity-decode pass on the 37 original Codex-era drafts in `archive/evbogue-drafts/`.
5. Review imported drafts in batches and promote good ones into `posts/` (set `draft: false`).
6. Revisit the `7` medium-confidence URLs after the high-confidence set is mostly complete.
7. Leave the `1412` ambiguous URLs alone unless a specific one is proven to be a real article.
