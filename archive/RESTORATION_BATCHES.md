# Restoration Batch Log

This log tracks Restorationist reviews of recovered archive posts.

The Restorationist works in batches of 5-15 posts, identifies mechanical cleanup, and flags decisions before making policy-sensitive changes.

## Batch 1 - FBTS Oldest Ten Posts

Reviewed: 2026-04-30

Scope: first ten Far Beyond The Stars posts by date.

Files reviewed:

- `posts/the-meditation-effect-how-yoga-daily-can-change-everything.md`
- `posts/escape-consumerism-and-stop-doing-the-unimportant.md`
- `posts/the-minimalist-diet-how-to-eat-real-food.md`
- `posts/the-minimalist-guide-to-sex.md`
- `posts/simplify-your-life-restrict-the-flow-of-media.md`
- `posts/observations-on-yoga-as-a-basis-for-existence.md`
- `posts/minimalize-your-life-ten-simple-things-you-can-do-today-to-become-a-minimalist.md`
- `posts/the-minimalist-guide-to-uncluttering.md`
- `posts/clearing-surfaces-the-easiest-way-to-a-minimalist-household.md`
- `posts/minimalism-is-freedom-from-location.md`

### Findings

Common mechanical rot:

- Raw HTML entities are present throughout (`&#8217;`, `&#8220;`, `&#8221;`, `&#8211;`, `&#8212;`, `&#8230;`, `&amp;`).
- Several posts end with orphan separator paragraphs like `<p>&#8211;</p>`.
- Some imports have malformed numbered-list text, such as `2They` instead of `2, They`.
- Some body lines are missing opening `<p>` tags but retain closing `</p>` tags.
- Excerpts are mostly usable but should be checked after entity decoding.

Dead web furniture found:

- `posts/the-minimalist-diet-how-to-eat-real-food.md` ends with a "hit me up on Twitter" comment invitation.
- `posts/the-minimalist-guide-to-sex.md` ends with a "tweet about it" callout.
- `posts/clearing-surfaces-the-easiest-way-to-a-minimalist-household.md` ends with a comments invitation.

Historically meaningful links found:

- Yoga To The People
- Michael Pollan / book links
- Zen Habits
- TED / Seth Godin
- Vulture / NYMag
- Get Rich Slowly / Leo Babauta

These should generally be preserved unless they are malformed or purely affiliate/tracking junk.

### Recommended Mechanical Cleanup

Safe to do without additional editorial approval:

- Decode HTML entities.
- Remove orphan separator paragraphs at the end of posts.
- Remove dead Twitter links while preserving surrounding sentence only if it still reads as part of the essay.
- Remove comments invitations when the current site has no comments.
- Fix obvious import damage in numbered lists.
- Preserve provenance frontmatter.
- Add `archive_status: restored`, `restored_on`, and `restoration_note` only when actual cleanup is performed.

### Decisions

1. Old "comment on Twitter" and "tweet about it" closing paragraphs should be removed entirely when platform interaction is the point.

   Policy: approved.

2. Old comment invitations should be removed from posts.

   Policy: approved.

3. Affiliate-style Amazon/book links should remain when they support the essay.

   Policy: keep historically meaningful book/reference links; strip obvious tracking parameters in a later link-normalization pass.

4. Raw HTML bodies should be converted to Markdown during restoration.

   Policy updated 2026-05-02: restored public posts should be clean Markdown unless there is a specific documented reason to keep HTML.

### Restoration Performed

Restored: 2026-05-01

Files edited: 10

Mechanical cleanup performed:

- Decoded common HTML entities in body text.
- Removed approved orphan separator paragraphs.
- Removed dead Twitter/comment closing paragraphs.
- Removed one dead Twitter profile link while preserving the named person and meaningful blog link.
- Fixed one obvious numbered-list import error: `2They` -> `2, They`.
- Preserved imported HTML structure at the time; later policy changed to require Markdown conversion for restored public posts.
- Preserved provenance frontmatter.
- Added restoration frontmatter:
  - `archive_status: "restored"`
  - `restored_on: "2026-05-01"`
  - `restoration_note: "Mechanical cleanup only; original essay preserved."`

Script added:

- `scripts/restore_mechanical_cleanup.js`

Post-restoration scan found no remaining approved-removal patterns in this batch:

- no `twitter.com` / `x.com`
- no `tweet about`
- no `hit me up`
- no `Let me know ... comments`
- no common numeric quote/dash entities
- no orphan separator paragraphs
- no `2They`

### Status

Batch 1 restored.

Remaining note: some Amazon/book links still contain tracking parameters. Per approved policy, those are preserved for now and should be handled in a later link-normalization pass.

## Batch 2 - First evbogue.com Pilot Posts

Reviewed/promoted: 2026-05-02

Scope: first five `evbogue.com` Wayback drafts selected for local test publication.

Files promoted:

- `posts/digital-evolutionist.md`
- `posts/singular-focus.md`
- `posts/flowing.md`
- `posts/email.md`
- `posts/hair.md`

Source drafts:

- `archive/evbogue-drafts/digital-evolutionist.md`
- `archive/evbogue-drafts/singular-focus.md`
- `archive/evbogue-drafts/flowing.md`
- `archive/evbogue-drafts/email.md`
- `archive/evbogue-drafts/hair.md`

### Restoration Performed

- Moved promoted public copies into `posts/`.
- Preserved original provenance frontmatter.
- Removed Google+ share widgets.
- Removed dead Twitter/Feedburner/share prompts where they were only platform furniture.
- Removed broken, obsolete, and unverified anchors from the promoted copies while preserving visible reference text.
- Converted promoted public copies from imported HTML to Markdown.
- Decoded common HTML entities in `flowing` and `email`.
- Added `archive_status: "restored"` metadata to promoted copies.
- Applied the pre-2025 people-anonymization rule where visible personal names appeared.

### People Anonymized

- `posts/flowing.md`: changed visible named references to `G.A.` and `J.S.`.
- `posts/hair.md`: changed visible named reference to `R.`.

### Status

Batch 2 promoted for local testing.

Remaining note: imported external image HTML was removed during Markdown conversion. If images matter for any of these posts, restore them later as localized Markdown image assets, not remote HTML.
