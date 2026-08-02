# Early archive workorder

Recover Ev Bogue's **earliest** web publishing — 1999 through 2009 — so the record of his early career is intact and the origin story on `/projects` rests on primary sources instead of memory.

This is the layer *before* the Far Beyond The Stars minimalism archive. It covers the LiveJournal/catharsis.org years, the NYU-through-corporate-media period (Gawker intern, New York Magazine photo editor), and the earliest `evbogue.com` captures that bridge into the 2009 indie pivot.

**Recovery, not publication.** The point of this work order is to establish the record and confirm the timeline — not to put teenage journal entries on the site. The 1999–2009 LiveJournal/catharsis material is Ev's early, personal writing ("mostly the ramblings of a teenager"). Default disposition is **archive-only / private reference.** Nothing from this era goes public without Ev's explicit, per-item sign-off.

The restoration mechanics are already defined. This work order only defines **what to find, from where, and in what order.** For cleanup, provenance, anonymization, and promotion rules, follow `Agents/RESTORATIONIST.md`. For how a Wayback CDX pull becomes a manifest, mirror `archive/evbogue-2011-2016-manifest.json`.

## Confirmed timeline (LOCKED 2026-08-02)

**This is the authoritative account, locked per Ev.** Treat it as ground truth. The research below can *strengthen* dates and add texture, but it does not overwrite this — if the writing contradicts a locked line, flag the conflict for Ev rather than silently changing it.

Private reference, kept here so the arc is not lost. Sources noted per line: **[Ev]** = confirmed directly by Ev; **[archive]** = reconstructed from dated posts in this repo. If any of this reaches the public `/projects` page, it is cities-only — no birth year, no addresses.

### Residence arc

- **Chicago — 1985–2003.** Born and raised; home. **[Ev]** The 1999 LiveJournal/catharsis writing dates from here (teenage-era).
- **New York — ~2003–2009.** NYU (from ~2003), then corporate media: Gawker intern summer 2005, New York Magazine photo editor 2006–2009. Brooklyn apartment. **[Ev, archive]**
- **Portland, OR — fall 2009.** First landing after leaving New York; the indie pivot. "I arrived in Portland" (2009-10-16); "I moved to Portland" (2009-10-28). **[archive]**
- **The SF/Oakland ⇄ Mexico City era — ~2010 to end of 2017.** Not a line, a loop. Ev kept moving to the Bay Area (Oakland, San Francisco) and **washing back out to Mexico City** when the Bay didn't hold — the same churn, repeated for years, with occasional returns to Brooklyn and travel to Japan and Singapore. This is why the dated markers read as contradictions rather than a sequence: Oakland by 2010-10, back to Brooklyn 2011-08, Oakland→SF 2011-09, SF→Puerto Vallarta fall 2011 ("How I got from San Francisco to Puerto Vallarta," 2011-10-30), based in CDMX by ~2013 (dated posts 2013-06 through 2014-04). They are cycles of one SF-and-out pattern. **[Ev, archive]**
- **Chicago — end of 2017 to present.** The loop ended when Ev left Mexico for Chicago at the end of 2017; home ever since. "here in Chicago" (2026-05), `about.md`, 773 number, "Augmented Chicago Against Silicon Valley." **[Ev, archive]**

The shape: **Chicago → New York → a years-long SF ⇄ Mexico City churn → back to Chicago.** A return, not a discovery — after most of a decade of trying to make the Bay Area work and retreating to CDMX when it didn't.

### Career facts [Ev]

- **NYU** — journalism and dance (from ~2003).
- **Gawker** — intern, summer 2005.
- **New York Magazine** — photo editor, 2006–2009.
- **2009** — left corporate media to go indie.

### Still to pin down

- **First LiveJournal / catharsis.org entry** — actual earliest date (is 1999 right?). Needs the Wayback recovery below.
- **NYU graduation year** — nice-to-have to bookend the NYC arrival.
- **Finer texture of the Mexico years (2011–2017)** — how much was CDMX vs. Puerto Vallarta vs. travel (Japan, Singapore, PNW). Optional; the endpoints are confirmed.

## Research through the writing (reachable now — do this first)

The Wayback sweep further down is blocked from this environment. The published and archived writing is **not** — it is in this repo right now, and it is the cheaper, faster path to stronger facts. Mine it before reaching for Wayback; use Wayback only for what the writing genuinely can't answer (mostly the pre-2009 era).

Leads, roughly in order of payoff:

- **Read each era's posts in date order.** Sort `sites/evbogue.com/posts/` and `archive/evbogue-drafts/` by frontmatter `date` and read the transitions in sequence. The first and last dated post that mentions a city brackets that stint far better than any single quote. Priorities: first Portland post, first CDMX post, and the **last Mexico post before the end-of-2017 Chicago move** (that one is the best corroboration of the return date).
- **Mine the 2011–2016 manifest timestamps.** `archive/evbogue-2011-2016-manifest.json` carries `firstSeen`/`lastSeen` per URL — those are capture dates, i.e. free chronology already sitting in the repo. Scan the latest 2016–2017 slugs for anything that corroborates the end-of-2017 return, and the earliest 2010–2011 slugs for the SF/CDMX churn.
- **Grep for self-dating phrases.** Lines like "X years ago", "when I was NN", "my first year in", "N months in", plus birthday/anniversary and visa/border mentions, can pin the 1985 birth, the ~2003 NYC arrival, and Mexico stay lengths.

  ```sh
  rg -ni "years ago|when i was [0-9]|my first (year|month)|[0-9]+ months in|birthday|anniversary|my visa|the border" sites/evbogue.com/posts archive/evbogue-drafts
  ```

- **Corroborate the jobs.** Grep for direct references to the mastheads — any dates or details Ev stated in his own writing.

  ```sh
  rg -ni "gawker|new york magazine|nymag|\bnyu\b|apple" sites/evbogue.com/posts archive/evbogue-drafts
  ```

- **Read the drafts, not just the posts.** `archive/evbogue-drafts/` holds unpublished pieces that are often more candid about where he was and why — good for texture and for dates that never made it into a public post.
- **Cross-date the launches and interviews.** "The Art of Being Minimalist", "Minimalist Business", and the named interviews (initials per the anonymization rule) have publish/launch dates that anchor the 2010–2011 career milestones precisely.

When a fact lands, update the locked timeline's source tags and note the specific post. When the writing and Ev's memory disagree, **flag it — do not silently overwrite Ev's account.**

## Proposed public line for `/projects` (cities only — awaiting Ev's sign-off)

Locked wording, ready to drop into the "Where it started" / writing section on Ev's go. Cities only, no birth year, no addresses:

> Born in Chicago, spent my twenties in New York media, then most of a decade bouncing between the Bay Area and Mexico City before coming home to Chicago.

Do **not** publish this line until Ev greenlights it.

## Why this matters

- The `/projects` page now opens on LiveJournal (1999), NYU, Gawker, and New York Magazine. Those lines are currently written from Ev's recollection, not sources. Confirm or correct them.
- Understanding the early career development means seeing the actual arc: teenage journal → journalism school → inside legacy media → walked out in 2009. The primary sources make that arc legible instead of asserted.
- Anything recovered lives as provenance-stamped, private reference under `archive/evbogue-drafts/`. What it feeds into the *public* `/projects` page is facts, not entries: a confirmed date, a corrected title, at most one short quote — and only with Ev's sign-off.

## Known blocker: archive.org is unreachable from web sessions

`archive.org` and `web.archive.org` are **not on the egress allowlist** for Claude Code web sessions, and archive.org additionally blocks the Anthropic crawler by user-agent. Confirmed 2026-08-02: CDX pulls, the availability API, and WebFetch all fail from inside a standard web session.

So the discovery step must run from one of:

- [ ] Ev's own machine / the VPS (has open archive.org access), running the CDX commands below and committing the resulting JSON into the repo, **or**
- [ ] A Claude Code environment configured with a network egress policy that allows `web.archive.org` (set at environment creation — see https://code.claude.com/docs/en/claude-code-on-the-web).

Once the raw CDX JSON is in the repo (or reachable), the manifest → triage → restoration steps run anywhere.

## Sources to sweep

### 1. LiveJournal — `evbogue`

Both URL forms existed across LJ's history; check both.

- [ ] `evbogue.livejournal.com`
- [ ] `livejournal.com/users/evbogue`

CDX:

```sh
curl -sS "http://web.archive.org/cdx/search/cdx?url=evbogue.livejournal.com*&output=json&collapse=digest&from=1999&to=2009" > archive/cdx/evbogue-livejournal-cdx.json
curl -sS "http://web.archive.org/cdx/search/cdx?url=livejournal.com/users/evbogue*&output=json&collapse=digest&from=1999&to=2009" > archive/cdx/evbogue-lj-users-cdx.json
```

### 2. catharsis.org

Subdomain and path forms both possible; sweep wide.

- [ ] `evbogue.catharsis.org`
- [ ] `catharsis.org/evbogue`
- [ ] `catharsis.org/~evbogue`

CDX:

```sh
curl -sS "http://web.archive.org/cdx/search/cdx?url=evbogue.catharsis.org*&output=json&collapse=digest&from=1999&to=2009" > archive/cdx/evbogue-catharsis-cdx.json
curl -sS "http://web.archive.org/cdx/search/cdx?url=catharsis.org*&matchType=prefix&filter=original:.*evbogue.*&output=json&collapse=digest&from=1999&to=2009" > archive/cdx/catharsis-evbogue-cdx.json
```

### 3. Early evbogue.com (1999–2010)

The 2011–2016 sweep is already done (`archive/evbogue-2011-2016-manifest.json`). This closes the gap *before* it, to catch the earliest domain captures and whatever bridged the corporate-media years into the blog.

- [ ] `evbogue.com` and `www.evbogue.com`, `from=1999&to=2010`

CDX:

```sh
curl -sS "http://web.archive.org/cdx/search/cdx?url=evbogue.com*&output=json&collapse=digest&from=1999&to=2010" > archive/cdx/evbogue-com-early-cdx.json
curl -sS "http://web.archive.org/cdx/search/cdx?url=www.evbogue.com*&output=json&collapse=digest&from=1999&to=2010" > archive/cdx/www-evbogue-com-early-cdx.json
```

## Pipeline

1. [ ] **Discover.** Run the CDX pulls above from a network with archive.org access. Commit raw JSON under `archive/cdx/`.
2. [ ] **Manifest.** Generate an `archive/evbogue-early-1999-2009-manifest.json` in the same shape as the 2011–2016 manifest: per-URL `slug`, `path`, `confidence`, `reason`, `firstSeen`, `lastSeen`, `captureCount`. Reuse or adapt the existing manifest-builder script (check `scripts/` for the tool that produced the 2011–2016 manifest; if it is not committed, write one that reads the CDX JSON and emits the same schema).
3. [ ] **Triage.** For each high/medium-confidence capture, decide: is this a journal entry, an about/bio page, a resume/portfolio page, or platform chrome? Bios and resume pages are gold for the career timeline even if they are not "posts."
4. [ ] **Stage.** Pull the best snapshot for each keeper into `archive/evbogue-drafts/` as Markdown, with provenance frontmatter (`original_url`, `wayback_snapshot_url`, `firstSeen`/`lastSeen`, `archive_status: staged`). This is the archive of record. Do **not** promote to `posts/`.
5. [ ] **Restore lightly.** These are private reference, so full restoration is optional. Do enough that the entries are legible and dated (decode entities, unwrap Wayback links, strip crawler debris) per `Agents/RESTORATIONIST.md`. Default classification for the LiveJournal/catharsis era is `bury` (keep in `archive/`, out of the public flow); `contextualize` only if Ev later wants a specific piece surfaced.
6. [ ] **Anonymize.** Every source here predates 2025, so the pre-2025 people-anonymization rule applies (names → initials; Ev is exempt) — and doubly so given how personal this material is. See `Agents/RESTORATIONIST.md`.
7. [ ] **Log.** Record the batch in `archive/RESTORATION_BATCHES.md`.
8. [ ] **Feed the timeline, not the feed.** Use the recovered material to confirm or correct the `/projects` "Where it started" facts (dates, titles, order). Do not publish the entries. Any public quotation is one line at most, and only with Ev's explicit per-item sign-off. The archive carries the depth privately; the projects page carries the throughline.

## Facts to verify against sources

Confirmed items are recorded in the Confirmed timeline above. What remains open:

- [x] NYU — journalism and dance. **[Ev]** (graduation year still nice-to-have.)
- [x] Gawker — intern, summer 2005. **[Ev]**
- [x] New York Magazine — photo editor, 2006–2009. **[Ev]**
- [x] Left corporate media to go indie in 2009. **[Ev, archive]**
- [x] Chicago 1985–2003; NYU→NYC ~2003. **[Ev]**
- [x] Mexico 2011–2017; returned to Chicago end of 2017. **[Ev, archive]**
- [ ] First LiveJournal / catharsis.org entry — actual earliest date (is 1999 right?). Needs Wayback.
- [ ] NYU graduation year.

## Success criteria

- Raw CDX JSON for all three source groups committed under `archive/cdx/`.
- An `evbogue-early-1999-2009-manifest.json` that enumerates every recoverable early capture with confidence scoring.
- Keeper entries staged privately in `archive/evbogue-drafts/` with honest provenance frontmatter — nothing from this era promoted to `posts/`.
- The five facts above either confirmed against a source or corrected on `/projects`.
- A batch entry in `archive/RESTORATION_BATCHES.md`.

## Guardrails

- Do not fabricate early entries. If a capture cannot be recovered, say so; leave the `/projects` line as recollection or cut it. An honest gap beats invented history.
- Do not touch `serve.js`, `assets/`, subscribers, or deployment files as part of restoration (per `Agents/RESTORATIONIST.md`).
- Do not promote anything into `posts/` without Ev's sign-off — the early journal era is more personal than the FBTS archive, so `contextualize` and `bury` will be common and correct.

## Open questions for Ev

- Was there anything **between** catharsis.org and evbogue.com — a Blogspot, a Typepad, an early Tumblr, a domain other than evbogue.com — worth sweeping?
- Publication is settled: the LiveJournal/catharsis era stays **archive-only** by default. Open sub-question — is there any *single* early piece you would ever consider surfacing, or is the whole era off-limits and this is purely for the record and the timeline?
- Any names from that era that should be scrubbed beyond the default initials rule (old handles, people who would not want to be found)?
