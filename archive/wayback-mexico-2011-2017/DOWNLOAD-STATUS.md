# Mexico-years evbogue.com scrape — status (SUSPENDED)

**Suspended 2026-08-03 at Ev's request. Fully resumable.**

Pulling every distinct content version of `evbogue.com` across the Mexico years
(2011–2017) from the Wayback Machine, so pages Ev deleted or refactored over the
years are preserved. Deduped by content digest, homepage kept separate from posts.

## Progress

| | |
|---|---|
| Total unique versions planned | **2577** |
| Downloaded so far | **~248** |
| Remaining | **~2329** |
| Transient failures to retry | ~25 (all `Connection refused` — archive.org throttling; re-fetch later) |

Source of the plan: `archive/cdx/` CDX pulls → filtered to content pages
(`text/html` 200, minus pagination/tags/feeds/date-archives/assets) → deduped by digest.

## Layout

```
archive/wayback-mexico-2011-2017/
  homepage/<timestamp>.html        # 304 distinct front-page versions
  pages/<slug>/<timestamp>.html    # every distinct version of each post/page
  manifest.json                    # per-version index (path, file, timestamps, digest, wayback_url)
  _resume/                         # everything needed to continue
    download-plan.json             # the full 2577-version plan
    download.py                    # the resumable downloader (skips files already on disk)
    download.log                   # run log
```

## To resume

The downloader **skips any file already on disk**, so just re-run it. From the repo root:

```bash
python3 archive/wayback-mexico-2011-2017/_resume/download.py \
  archive/wayback-mexico-2011-2017/_resume/download-plan.json \
  archive/wayback-mexico-2011-2017 \
  archive/wayback-mexico-2011-2017/_resume/download.log
```

Notes for the resume:
- Run it **without** other concurrent archive.org traffic. Running two pulls at
  once got this IP throttled (instant `Connection refused`), which is where the
  ~25 failures came from. One stream at a time.
- Consider bumping `DELAY` in `download.py` from `0.7` to `~1.2` seconds to stay
  under archive.org's rate limit and cut the failure rate.
- When it prints `DONE ok=… skip=… fail=…`, do a **retry pass**: any record in
  `manifest.json` whose `status` starts with `fail:` still needs its snapshot;
  re-running the script picks them up because the file isn't on disk yet.

## Next steps after the download completes (per EARLY-ARCHIVE-WORKORDER.md flow)

1. Retry the failed versions until failures are zero (or genuinely 404 in Wayback).
2. Triage: these are Mexico-era public blog posts, not the private teenage era —
   restoration/promotion follows `Agents/RESTORATIONIST.md`, not the archive-only rule.
3. Cross-check against the existing `archive/evbogue-2011-2016-manifest.json` and
   `archive/evbogue-drafts/` so already-imported posts aren't re-imported.
