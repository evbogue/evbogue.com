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

## Batch 3 - evbogue.com Archive Drafts (2011-2014)

Reviewed/promoted: 2026-05-15

Scope: 15 archive drafts from `archive/evbogue-drafts/` -- 12 essays promoted, 3 buried.

### Files Restored (promoted to posts/)

1. `posts/backup-plans-are-bullshit.md` -- essay on not having backup plans (2011-08-16)
2. `posts/branding.md` -- essay on untethering from branding (2011-09-24)
3. `posts/1000-true-equals.md` -- essay on 1000 true equals/leaders (2011-03-14)
4. `posts/bullshitting.md` -- interview on experience telling (2011-09-23)
5. `posts/clean-slate.md` -- blank page / starting over essay (2011-02-14)
6. `posts/erase.md` -- how to erase the past (2011-02-28)
7. `posts/insecurity.md` -- insecurity on the Internet (2011-04-04)
8. `posts/shitless.md` -- scared shitless manifesto (2011-04-06)
9. `posts/quiet.md` -- how to find a quiet place to write (2011-05-08)
10. `posts/digital-sabbatical.md` -- insights from digital sabbatical (2011-05-23)
11. `posts/distributedeverything.md` -- essay about Medium and distributed web (2013-06-26)
12. `posts/backtoarch.md` -- Arch Linux essay (2014-04-09)

### Files Buried (not promoted)

13. `archive/evbogue-drafts/mbsale.md` -- expired sales promo for Minimalist Business anniversary sale; e-junkie cart links and dated pricing; not an essay.
14. `archive/evbogue-drafts/ev-in-75-words.md` -- bio blurb with dead platform/product links; not an essay.
15. `archive/evbogue-drafts/ev-in-250-words.md` -- bio blurb with dead platform/product links; not an essay.

### Mechanical Cleanup Performed

- Converted all posts from imported WordPress HTML to clean Markdown.
- Decoded all HTML entities: `&#8217;` → `'`, `&#8220;`/`&#8221;` → `"`, `&#8211;` → `-`, `&#8212;` → `--`, `&#8230;` → `...`
- Removed Google+ widget divs (`<div class="g-plusone">` blocks).
- Removed "Written by Ev Bogue | Follow me on Google+" headers.
- Removed WordPress upload image links (Flickr image wrapper anchors).
- Removed dead social share widgets (`really_simple_share` divs, Twitter share buttons).
- Removed WordPress smiley images (`wp-includes/images/smilies`).
- Removed MailChimp/Feedburner subscribe blocks and RSS signup links.
- Removed Letter.ly / Letterly.net subscription links (dead platform).
- Removed "tweet about it", "flag me @evbogue", "hit me up on Twitter" comment invitation paragraphs.
- Removed "Retweet this." closing lines.
- Removed last-paragraph product launch promos and e-junkie cart links (backup-plans-are-bullshit).
- Removed ebookling.com product links (dead commercial platform); kept book titles as plain text.
- Removed Instagram follow link (dead/unverified personal social).
- Removed Wayback image URLs (archive.org/web/TIMESTAMP/img_ sources -- images not localized).
- Removed preserve.io cache link (dead archive service) from distributedeverything excerpt note.
- Removed "Social crash" link (inoveryourhead.net -- unverified dead site) from insecurity; kept reference as plain text.
- Removed Letter.ly follow-up URL from 1000-true-equals (K.B. external link -- dead personal site); kept reference as plain text.
- Removed "So where are we now?." punctuation artifact from 1000-true-equals.
- Fixed title fields for `distributedeverything` and `backtoarch`: stripped full nav sidebar garbage (contained full nav text including email, Bitcoin address, Dogecoin address, product links) to just the actual post title.
- Fixed excerpt field for backup-plans-are-bullshit: replaced Google+ header garbage with the actual opening sentence.
- Fixed excerpt field for bullshitting: removed itemprop wrapper artifact.
- Fixed erase.md: removed Letter.ly origin note and "edited slightly for public consumption" preamble (platform furniture); kept the essay content.
- Removed digital-sabbatical share widget block and email share link.
- Removed insecurity.md Letterly.net resubscribe address paragraph.
- Added `archive_status: restored`, `restored_on: 2026-05-15`, `restoration_note` to all 12 promoted posts.
- Added internal link to `/posts/clean-slate` in erase.md (target exists).
- Added internal link to `/posts/augmented-humanity` in insecurity.md and digital-sabbatical.md (target exists).
- Internal link to `/posts/anywhere` in insecurity.md preserved (target exists).
- Internal link to `/posts/farbeyondthestars` in digital-sabbatical.md flagged: target does not exist in posts/. Link kept as-is for now.
- Kept AUR link (aur.archlinux.org) in backtoarch.md -- historically meaningful technical reference.

### People Anonymized

Applied pre-2025 rule to all posts dated before 2025-01-01.

- `posts/bullshitting.md`: "Tessa Zeng" → "T.Z." (interviewer); "Gwen Bell" (concept credit) → "G.B."; removed Wayback-wrapped photo images of both Tessa and Ev; removed link to Experiencing Revolution blog (dead/unverifiable).
- `posts/erase.md`: "@patrickrhone" → "P.R."; "David Powers" → "D.P."; "Gwen" → "G.B."; removed Twitter @patrickrhone link; removed Gwen Bell's personal site link; removed ebookling link to Digital Warriorship (kept title as plain text).
- `posts/insecurity.md`: no personal names appeared in public text; no anonymization needed.
- `posts/shitless.md`: "Alix" → "A." (per explicit batch instruction); "Merlin" / "Merlin Mann" → "M.M."; removed Patrick Rhone credit link (kept as plain text attribution); removed link to 43folders.com scared-shitless talk (dead/unverified); removed Twitter engagement closing paragraph.
- `posts/quiet.md`: "Chris Guillebeau" → "C.G."; "Leo Babauta" → "L.B."; "Corbett" (Corbett Barr) → "C.B."; removed personal site links for all three.
- `posts/digital-sabbatical.md`: "Gwen Bell" → "G.B." throughout; removed link to gwenbell.com (personal site).
- `posts/1000-true-equals.md`: anonymized in prior session (K.B. follow-up reference unlinked, name removed from public text).
- `posts/distributedeverything.md`: 2013 post; "Katherine" at Tiny Letter kept as first name only (company employee, not private person -- judgment call). No full personal names to anonymize.
- `posts/backtoarch.md`: 2014 post; no personal names in text.

### Links Removed or Unlinked

Dead platforms fully removed:
- `twitter.com` / `x.com` links (multiple posts)
- `feedburner.com` subscribe links
- `letter.ly` / `letterly.net` subscription links
- `ebookling.com` product links (dead storefront)
- `e-junkie.com` cart links
- `plus.google.com` widget and share links
- WordPress upload paths (`evbogue.com/wp-content/uploads/`)
- Flickr image wrapper anchors (images not localized; anchor wrappers removed)
- Wayback toolbar image URLs (`.../web/TIMESTAMP/im_/...`)
- `instagr.am` follow link
- `inoveryourhead.net` external blog link (unverified dead site)
- `kenbernock.com` follow-up blog link (unverified dead personal site)
- `experiencingrevolution.com` blog link (dead)
- `cache.preserve.io` archive link (dead service)
- `gwenbell.com` personal site link
- `patrickrhone.com` personal site link
- `corbettbarr.com` personal site link
- `chrisguillebeau.com` personal site link
- `mnmlist.com` personal site link (Leo Babauta)
- `43folders.com` Merlin Mann talk link (dead/unverified)

Internal links verified:
- `/posts/clean-slate` -- exists
- `/posts/augmented-humanity` -- exists
- `/posts/anywhere` -- exists
- `/posts/farbeyondthestars` -- does NOT exist; link preserved but flagged

### Status

Batch 3 complete. 12 essays promoted, 3 buried.

Remaining notes:
- `/posts/farbeyondthestars` is referenced in `digital-sabbatical.md` but does not exist in `posts/`. Flag for a future batch.
- Flickr image assets not localized. Several posts referenced external Flickr images used as decorative headers; these were removed as wrapper links. If image restoration is desired, a future localization batch is needed.
- The `distributedeverything.md` post references `build.evbogue.com` (external product site) -- link removed, reference kept as plain text.
- Digital Ocean referral code link in original `distributedeverything` archive was in the nav sidebar garbage and was already stripped with the title fix.
