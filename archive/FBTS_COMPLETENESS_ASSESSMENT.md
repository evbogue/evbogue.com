# Far Beyond The Stars Completeness Assessment

Assessment date: 2026-04-30

Scope: Far Beyond The Stars blog content from 2009 through the handoff/end period in February 2011.

## External Inventory

Michael Xander's `Far Beyond The Stars Archive (Everett Bogue)` page says he exported "every single article" as 171 PDFs and included the two free ebooks `How to Create a Movement` and `Minimalist Workday`.

The page's download link redirects to `fbts_evbogue_mnml.zip` on Dropbox, matching the local archive directory name.

## Short Answer

We appear to have recovered Michael Xander's PDF-backed Far Beyond The Stars archive completely.

The local PDF inventory contains 173 files:

- 171 dated blog-post PDFs from 2009-10-09 through 2011-02-10.
- 2 undated ebook PDFs in `_evs_free_eBooks/`.

All 171 dated blog-post PDFs have corresponding public markdown files in `posts/`.

The two PDFs that are not public posts are ebooks:

- `_evs_free_eBooks/How to Create a Movement.pdf`
- `_evs_free_eBooks/Minimalist_Workday.pdf`

Those should be treated as book/download artifacts, not missing blog posts.

## Local Recovery Counts

From `archive/pdf-manifest.json`:

- Total PDFs: 173
- Dated PDFs: 171
- First dated PDF: 2009-10-09
- Last dated PDF: 2011-02-10
- Duplicate PDF slugs: 0

Direct comparison against `posts/`:

- Dated PDF posts: 171
- Matched public posts by slug: 171
- Missing dated PDF posts: 0
- Public posts with `original_source_pdf` from `fbts_evbogue_mnml/`: 171
- Public posts with `original_url`: 171
- Public posts with `wayback_snapshot_url`: 171

## Monthly Coverage

Recovered dated post counts by month:

| Month | Posts |
|---|---:|
| 2009-10 | 13 |
| 2009-11 | 22 |
| 2009-12 | 13 |
| 2010-01 | 13 |
| 2010-02 | 15 |
| 2010-03 | 12 |
| 2010-04 | 10 |
| 2010-05 | 8 |
| 2010-06 | 11 |
| 2010-07 | 7 |
| 2010-08 | 8 |
| 2010-09 | 7 |
| 2010-10 | 5 |
| 2010-11 | 6 |
| 2010-12 | 6 |
| 2011-01 | 11 |
| 2011-02 | 4 |

Total: 171 dated posts.

## Wayback Cross-Check

A Wayback CDX check for `farbeyondthestars.com/*` from 2009 through 2011 returned:

- 842 raw 200-status captures after URL-key collapse.
- 182 probable post-like single-slug HTML URLs after excluding feeds, assets, comments, category pages, date archives, monthly pages, query URLs, and pagination.
- 171 matched local recovered posts.
- 11 initially unmatched post-like URLs.

The 11 unmatched URLs are not automatically missing essays. They break down into aliases, malformed duplicate URLs, sales/support pages, or pages needing manual review.

## Unmatched Wayback Candidates

Likely aliases of recovered posts:

- `50-things` -> recovered as `how-to-live-with-50-things-and-why-i-decided-to-stop`
- `7-simple-ways- you-can-disconnect` -> malformed duplicate of `7-simple-ways-you-can-disconnect`

Likely non-essay support, sales, landing, or utility pages:

- `how-to-get-1052-of-uncommon-business-education-for-97`
- `how-to-subscribe-to-far-beyond-the-stars`
- `how-to-work-with-everett`
- `how-to-work-with-everett-bogue`
- `how-you-can-help-support-the-writing`
- `minimalist-resources`
- `why-augmented-humanity-is-paid-to-receive-email`

Manual-review candidates inspected:

- `how-to-read-a-book-a-week-in-2010`
  - Wayback title: `Books I'm Reading`
  - Assessment: resource/page, not a dated essay. It is real archive content, but not part of the dated PDF-backed post run.
- `how-to-win-a-copy-of-leo-babautas-a-minimalist-life`
  - Wayback title: `How to Win Leo Babauta's 'A Simple Guide to a Minimalist Life'`
  - Assessment: short contest/affiliate/signup post or promo page. It is real archive content, but it is not in the local PDF set.

These two are not evidence that the main dated essay archive is incomplete. They are evidence that Wayback contains a small layer of utility/resource/promo content not represented in the PDF-backed post archive.

## External Current-Site Check

The current live `farbeyondthestars.com/archives/` page is not a complete source for Ev's 2009-2011 archive. It only lists a small subset from 2009, 2010, and early 2011, plus later maintainer content. Use it as a clue, not as the canonical inventory.

## Conclusion

For the known PDF-backed FBTS archive, we have all dated blog posts recovered and published.

For the broader public web record, we should not claim absolute completeness if "content" includes pages, resource lists, contests, sales pages, support pages, and subscription pages. Wayback reveals at least two real non-PDF archive items:

1. `Books I'm Reading` at `how-to-read-a-book-a-week-in-2010`
2. `How to Win Leo Babauta's 'A Simple Guide to a Minimalist Life'` at `how-to-win-a-copy-of-leo-babautas-a-minimalist-life`

Everything else in the unmatched Wayback set currently looks like an alias, malformed duplicate, landing page, support page, or sales page.

## Recommended Next Step

Decide whether this project wants to preserve non-essay FBTS artifacts.

If yes, create a separate `archive/fbts-pages/` or `archive/fbts-artifacts/` holding resource, contest, sales, and support pages with provenance, but do not publish them into the main `posts/` flow by default.

If no, classify the two inspected candidates as `bury` and keep the main statement simple: the dated essay/post archive is complete according to the local PDF inventory and Wayback cross-check.
