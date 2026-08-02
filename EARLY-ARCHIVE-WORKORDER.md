# Early archive workorder

Recover Ev Bogue's **earliest** web publishing — 1999 through 2009 — so the record of his early career is intact and the origin story on `/projects` rests on primary sources instead of memory.

This is the layer *before* the Far Beyond The Stars minimalism archive. It covers the LiveJournal/catharsis.org years, the NYU-through-corporate-media period (Gawker intern, New York Magazine photo editor), and the earliest `evbogue.com` captures that bridge into the 2009 indie pivot.

The restoration mechanics are already defined. This work order only defines **what to find, from where, and in what order.** For cleanup, provenance, anonymization, and promotion rules, follow `Agents/RESTORATIONIST.md`. For how a Wayback CDX pull becomes a manifest, mirror `archive/evbogue-2011-2016-manifest.json`.

## Why this matters

- The `/projects` page now opens on LiveJournal (1999), NYU, Gawker, and New York Magazine. Those lines are currently written from Ev's recollection, not sources. Confirm or correct them.
- Understanding the early career development means seeing the actual arc: teenage journal → journalism school → inside legacy media → walked out in 2009. The primary sources make that arc legible instead of asserted.
- Anything recovered feeds two places: provenance-stamped entries under `archive/evbogue-drafts/`, and a possible "read the first entry" link or pull-quote in the `/projects` origin section.

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
4. [ ] **Stage.** Pull the best snapshot for each keeper into `archive/evbogue-drafts/` as Markdown, with provenance frontmatter (`original_url`, `wayback_snapshot_url`, `firstSeen`/`lastSeen`, `archive_status: staged`). Do not promote to `posts/` yet.
5. [ ] **Restore.** Hand to the Restorationist (`Agents/RESTORATIONIST.md`): mechanical cleanup only, unwrap Wayback links, strip dead widgets, decode entities, honest provenance. Classify each as `preserve` / `restore` / `contextualize` / `bury`.
6. [ ] **Anonymize.** Every source here predates 2025, so the pre-2025 people-anonymization rule applies (names → initials in public-facing text; Ev is exempt). See `Agents/RESTORATIONIST.md`.
7. [ ] **Log.** Record the batch in `archive/RESTORATION_BATCHES.md`.
8. [ ] **Feed the narrative.** Once real entries exist, revisit the `/projects` "Where it started" section: confirm the 1999 date, fix anything the sources contradict, and add at most one short pull-quote or a "read the first entry" link. Keep the section tight — the archive carries the depth, the projects page carries the throughline.

## Facts to verify against sources

These are currently asserted from memory on `/projects`. Confirm, date, or correct each:

- [ ] First LiveJournal / catharsis.org entry — actual earliest date (is 1999 right?).
- [ ] NYU — degree in journalism and dance; graduation year.
- [ ] Gawker — internship; which year(s).
- [ ] New York Magazine — photo editor; which year(s), and whether the title was exactly that.
- [ ] The 2009 pivot — first indie/minimalism post date, to anchor "left corporate media in 2009."

## Success criteria

- Raw CDX JSON for all three source groups committed under `archive/cdx/`.
- An `evbogue-early-1999-2009-manifest.json` that enumerates every recoverable early capture with confidence scoring.
- Keeper entries staged in `archive/evbogue-drafts/` with honest provenance frontmatter.
- The five facts above either confirmed against a source or corrected on `/projects`.
- A batch entry in `archive/RESTORATION_BATCHES.md`.

## Guardrails

- Do not fabricate early entries. If a capture cannot be recovered, say so; leave the `/projects` line as recollection or cut it. An honest gap beats invented history.
- Do not touch `serve.js`, `assets/`, subscribers, or deployment files as part of restoration (per `Agents/RESTORATIONIST.md`).
- Do not promote anything into `posts/` without Ev's sign-off — the early journal era is more personal than the FBTS archive, so `contextualize` and `bury` will be common and correct.

## Open questions for Ev

- Was there anything **between** catharsis.org and evbogue.com — a Blogspot, a Typepad, an early Tumblr, a domain other than evbogue.com — worth sweeping?
- Do you want the LiveJournal/catharsis era **public** on the site, or recovered-and-archived-only for your own reference and the timeline?
- Any names from that era that should be scrubbed beyond the default initials rule (old handles, people who would not want to be found)?
