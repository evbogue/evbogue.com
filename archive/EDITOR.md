# EDITOR.md — Archive Draft Review Agent

Instructions for reviewing posts in `archive/evbogue-drafts/` and deciding what to promote to `posts/`.

## Your job

Read each draft. Make a publish/skip/fix decision. Act on it.

- **Publish** → move file to `posts/`
- **Fix** → edit the file in place (fix frontmatter, trim garbage), then publish
- **Skip** → leave in `archive/evbogue-drafts/`, add a comment at the top of the file explaining why

Do not ask for permission on individual posts. Work through a batch and report a summary at the end.

## Technical checks (must pass before publishing)

1. **Title is clean** — no raw HTML, no garbled entities (`&#8217;` etc.), reads like a real headline
2. **Date is present and plausible** — `YYYY-MM-DD` format, between 2011 and 2016
3. **Body is complete** — has at least two paragraphs of real content, not just a header and a signup form
4. **No nav/footer garbage** — no "Home | About | Books" nav links, no Disqus comment threads, no MailChimp signup widgets in the body
5. **No truncation** — post doesn't end mid-sentence or mid-thought
6. **`archive_layout` field present** — indicates which extractor was used; useful for debugging

If any of these fail, attempt a quick fix (strip the garbage, fill in a missing date from the `wayback_snapshot_url` timestamp). If it can't be fixed in under a minute, skip it.

## Formatting fixes (apply to every post before publishing)

These are mechanical — always fix them, don't skip:

- **Weird spacing** — collapse multiple blank lines into one, remove trailing whitespace, ensure paragraphs are separated by a single blank line
- **Reader comments** — we do not publish reader comments. Strip everything from `<div id="comment">`, `<div id="disqus_thread">`, or `<div id="dsq-content">` to the end of the file. Run `scripts/strip_post_garbage.js` to do this automatically.
- **Dead social links** — remove or replace links to platforms Ev no longer uses: Twitter/X (`twitter.com`), Google+ (`plus.google.com`), App.net, Feedburner, Disqus. If a link is the only content in a paragraph, remove the whole paragraph. If it's inline, remove the link but keep the surrounding text if it still makes sense.
- **Wayback wrapper links** — any `href` or `src` still containing `web.archive.org` should be unwrapped to the original URL (or removed if it points to a dead social)
- **HTML entities in body** — decode `&#8217;` → `'`, `&#8211;` → `–`, `&#8220;`/`&#8221;` → `"`/`"`, `&#8212;` → `—`, `&#8230;` → `…`, `&amp;` → `&`
- **Social sharing widgets** — remove any leftover TweetMeme, Google+1, or "really_simple_share" HTML blocks

This list will grow. When you find a new recurring formatting issue, note it in your batch report so it can be added here.

## Editorial checks (judgment calls)

These posts are Ev's real published work. The bar for publishing is: *would Ev be comfortable with this appearing on his site today?*

**Publish if:**
- It's a genuine essay, observation, or how-to post — even short ones
- The voice is recognizably Ev's — direct, opinionated, first-person
- The topic holds up (minimalism, digital nomadism, writing, tech, living deliberately)
- It's a piece of his story — even if the ideas feel dated, the document is historically interesting

**Skip if:**
- It's a sales page for a course or product (title like "What is X?" followed by "Who is X for?" bullet lists)
- It's a nav/index page (`books`, `interviews`, `links`, `hireme`, `letters`)
- It's shorter than ~150 words and has no real content (stub or placeholder)
- The body is almost entirely external links with no original writing

**Gray area — use judgment:**
- Short posts (150–300 words) that are genuine observations → publish
- Posts that advertise a paid product but contain real writing around it → fix (strip the sales section, keep the essay)
- Posts with broken image references → publish anyway, note in a comment; image localization is a separate step

Keep all other frontmatter fields as-is (`original_url`, `wayback_snapshot_url`, `archive_layout` are useful provenance).

If the excerpt is missing or clearly wrong (e.g. extracted from a nav element), rewrite it as a single sentence summarizing the post.

## Working through a batch

A good batch size is 10–20 posts. To list unreviewed drafts:

```sh
ls archive/evbogue-drafts/
```

To move a post to `posts/`:

```sh
mv archive/evbogue-drafts/SLUG.md posts/SLUG.md
```

## Report format

After finishing a batch, report:

- How many published
- How many skipped (and why — one line each)
- How many fixed before publishing
- Any patterns worth noting for the next batch

## Notes

- Posts with `archive_layout: wordpress-2011` or `wordpress-2011b` are from Ev's 2011 writing period — tend to be good quality, digital nomad / minimalism era
- Posts with `archive_layout: reserva-2014` are from a more technically-focused period (Arch Linux, Node.js, privacy, crypto) — publish the substantive ones
- Posts with `archive_layout: metalwork-2016` are from the later period — same editorial standard
- Posts with `archive_layout: minimal-2013` may have no date — fall back to the year from `wayback_snapshot_url`
- External image `src` URLs are fine to leave; `bulk_localize_post_images.js` will handle them in a separate pass
