# Archive Recovery System

This is the operating system for recovering the evbogue.com archive without turning it into scraped paste.

The goal is not simply to republish everything. The goal is to recover the archive as a durable, searchable, historically honest body of work.

## Current Inventory

Known archive sources:

- `fbts_evbogue_mnml/` contains 173 PDFs from the Far Beyond The Stars / minimalist era, mostly dated from 2009-10-09 through 2011-02-10.
- `posts/` contains the current public site archive.
- `archive/evbogue-2011-2016-manifest.json` contains Wayback candidates for evbogue.com.
- `archive/evbogue-drafts/` contains imported Wayback drafts awaiting review.
- `assets/posts/` contains localized images for recovered posts.

Current Wayback manifest counts:

- 408 high-confidence candidates
- 7 medium-confidence candidates
- 1412 ambiguous candidates
- 139 already imported according to the manifest

The ambiguous bucket is mostly aliases, junk paths, and alternate prefixes. Do not bulk import it.

## Source Priority

Use the best available source for each post:

1. Original local markdown, if it exists.
2. Wayback HTML capture, if it contains the full post body.
3. Local PDF export, if Wayback is missing or damaged.
4. Reconstructed continuity post, only when Ev explicitly wants a historical gap filled.

Wayback HTML is preferred over PDF text because it preserves links, emphasis, images, and structure. PDF extraction is acceptable as a fallback, but it needs cleanup.

## Recovery Pipeline

Every recovered post moves through five states:

1. `inventory`
   The item exists in a manifest, PDF list, Wayback candidate list, or known missing-post list.

2. `draft`
   The item has been imported into `archive/drafts/` or `archive/evbogue-drafts/`.

3. `reviewed`
   A human or agent has checked title, date, body completeness, provenance, and garbage removal.

4. `promoted`
   The file has moved into `posts/` with `draft: false`.

5. `verified`
   The post renders locally, appears in `/posts`, and does not break `/feed.xml`.

Nothing should jump straight from scrape to public post.

## Classification

Each reviewed item gets one classification:

- `preserve` - historically strong; only mechanical cleanup needed.
- `restore` - real post, bad import; repair formatting, assets, and provenance.
- `rewrite` - strong idea, weak execution; needs a modern version or heavy edit.
- `contextualize` - historically important but needs a note or companion framing.
- `continuity` - later-written or reconstructed post filling a timeline gap.
- `bury` - keep in archive, do not publish unless specifically requested.

Do not delete buried material. Move slowly. The archive is allowed to have bad weather in it.

## People-Anonymization Policy

All public-facing archive content dated before `2025-01-01` should anonymize people Ev mentioned by changing displayed personal names to initials.

This applies to:

- post titles
- excerpts
- body text
- captions and alt text
- visible link text
- public slugs and filenames when a post is being promoted

Keep provenance fields intact, even when the original URL or source path contains the non-anonymized name. The internal source record should remain traceable, but the public archive should not unnecessarily direct attention at people named before 2025.

Do not anonymize Ev/Everett Bogue unless Ev explicitly asks. Do not anonymize organizations, publications, products, or projects unless they identify a private person. When unsure, use initials and flag the choice in the batch report.

When anonymization is performed, add:

```yaml
people_anonymized: true
anonymized_on: YYYY-MM-DD
anonymization_note: "Pre-2025 personal names changed to initials for the public archive."
```

## Broken Link Policy

Public archive posts should not contain broken links.

When a link is broken, obsolete, or unverified in the current batch, remove the anchor and keep the visible text. Do not replace dead links with Wayback links in the body; preserve Wayback/source URLs in frontmatter instead.

For internal links, keep the link only when the local target exists. If the target is missing, unlink the text and report the missing target. For old external links, especially social, signup, commercial, platform, and personal-site links, verify before preserving; otherwise unlink them.

For image links, remove anchors that only open the image file. Keep images themselves only if they render or are queued for later localization.

## Markdown Restoration Policy

Restored public archive posts should use Markdown bodies by default.

Wayback HTML is useful as a source because it preserves structure, but the promoted `posts/*.md` file should not keep ordinary imported HTML. Convert paragraphs, emphasis, simple lists, and references to Markdown. Remove layout wrappers, WordPress classes, itemprop attributes, share-widget containers, and other scrape debris.

Keep HTML only when there is a clear reason Markdown cannot represent the content, such as a necessary embed or table. If HTML remains, explain why in the batch report.

## Required Frontmatter

Public archive posts should have:

```yaml
---
title: "Post title"
slug: post-slug
date: YYYY-MM-DD
tags: [archive]
draft: false
excerpt: "One sentence summary."
---
```

When source provenance is known, preserve it:

```yaml
original_url: "https://example.com/post"
wayback_snapshot_url: "https://web.archive.org/..."
original_source_pdf: "fbts_evbogue_mnml/..."
archive_layout: "wordpress-2011"
archive_status: preserve
```

For continuity posts:

```yaml
continuity_post: true
written_or_reconstructed: YYYY-MM-DD
continuity_note: "Written later to fill a historical gap in the blog timeline."
archive_status: continuity
```

Never silently pass a rewrite or continuity post off as untouched historical material.

## Review Checklist

Before promotion, every draft must pass:

- Title is clean and readable.
- Date is present, plausible, and formatted as `YYYY-MM-DD`.
- Body contains a real post, not a nav page or signup shell.
- Body does not end mid-sentence.
- No Disqus, Feedburner, Google+, Twitter widgets, MailChimp blocks, or old nav/footer debris.
- Wayback wrapper links are unwrapped or removed.
- Broken, obsolete, or unverified links are removed while preserving visible text.
- Pre-2025 personal names are anonymized to initials in public-facing fields and body text.
- Restored public bodies are converted to Markdown unless a specific exception is documented.
- Images are either localized or marked for a later localization pass.
- Provenance fields are retained.
- `draft: false` is set only after review.

If a draft fails and can be fixed quickly, fix it. If it cannot, leave it in drafts with a short note.

## Batch Workflow

Work in batches of 10-20 posts.

For each batch:

1. Select a narrow source set:
   - a date range,
   - one archive layout,
   - one source directory,
   - or a known topic cluster.
2. Import missing items into drafts.
3. Run mechanical cleanup scripts.
4. Read every draft in the batch.
5. Classify each item.
6. Promote only clean posts into `posts/`.
7. Run the local server and check index, post page, and feed.
8. Report counts and unresolved problems.

Batch reports should include:

- source range reviewed
- published count
- fixed-before-publish count
- skipped or buried count
- recurring cleanup issues
- provenance issues
- next recommended batch

## Practical Commands

Refresh the PDF manifest:

```sh
deno run --allow-read --allow-write scripts/build_pdf_manifest.js
```

Refresh the evbogue.com Wayback manifest after fetching CDX files:

```sh
deno run --allow-read --allow-write scripts/build_evbogue_manifest.js
```

Import high-confidence evbogue.com records into drafts:

```sh
deno run --allow-read --allow-write --allow-net scripts/import_evbogue_from_manifest.js high
```

Strip recurring import garbage:

```sh
deno run --allow-read --allow-write scripts/strip_post_garbage.js archive/evbogue-drafts
```

Localize images once drafts are stable:

```sh
deno run --allow-read --allow-write --allow-net scripts/bulk_localize_post_images.js archive/evbogue-drafts
```

Run the site locally:

```sh
deno task start
```

## Promotion Policy

Promote aggressively when the post is real and readable. Do not over-edit old work just because it is old.

Publish:

- essays, arguments, personal observations, how-to posts
- short posts with a real idea
- dated but historically useful posts
- product-era posts if the essay survives after sales debris is removed

Bury:

- landing pages
- pure sales pages
- nav/index pages
- duplicate aliases
- near-empty stubs
- broken imports with no recoverable body

Contextualize:

- posts that are important but could mislead without a note
- posts with claims that aged badly but matter historically
- posts connected to major shifts in Ev's work or identity

## Immediate Next Pass

The next practical recovery pass should be:

1. Re-run the high-confidence Wayback importer to test the 2013 extractor.
2. Review the 154 current files in `archive/evbogue-drafts/` by layout:
   - `wordpress-2011`
   - `wordpress-2011b`
   - `reserva-2014`
3. Fix old HTML entities in the early drafts.
4. Localize images for stable drafts.
5. Promote reviewed drafts into `posts/` in batches of 10-20.
6. Revisit the 7 medium-confidence candidates manually.
7. Leave ambiguous candidates alone unless a specific missing post is being hunted.

## Principle

Recovery is editorial work with receipts.

Every post should become easier to read, easier to find, and harder to lose, while keeping enough provenance that future Ev can tell what was original, what was restored, and what was made later to hold the timeline together.
